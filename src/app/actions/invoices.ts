"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/auth";
import { getInternalInvoices, statusToPrisma } from "@/lib/invoices-db";
import { prisma } from "@/lib/prisma";
import { settingsId } from "@/lib/settings-db";
import { failValidation, validateCustomerDocument } from "@/lib/validation";
import type { InvoiceEmailLog } from "@/types/email";
import type { InternalInvoiceStatus } from "@/types/invoice";

function formatSequence(value: number) {
  return String(value || 1).padStart(9, "0");
}

async function refreshInvoices() {
  revalidatePath("/facturas");
  revalidatePath("/pagos");
  revalidatePath("/reportes");
  revalidatePath("/");
  return getInternalInvoices();
}

async function createInvoiceNumber() {
  const settings = await prisma.businessSettings.findUnique({
    where: { id: settingsId },
    select: {
      establishmentCode: true,
      emissionPointCode: true,
      invoiceSequence: true,
    },
  });

  const establishmentCode = settings?.establishmentCode || "001";
  const emissionPointCode = settings?.emissionPointCode || "001";
  const invoiceSequence = settings?.invoiceSequence || 1;

  return {
    number: `${establishmentCode}-${emissionPointCode}-${formatSequence(invoiceSequence)}`,
    nextSequence: invoiceSequence + 1,
  };
}

export async function generateInvoice(orderId: string) {
  await requireAdminSession();

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      customerId: true,
      status: true,
      subtotal: true,
      tax: true,
      total: true,
      customer: true,
      invoice: { select: { id: true } },
    },
  });

  if (!order) {
    failValidation("No se encontro el pedido seleccionado.");
  }

  if (order.invoice) {
    return {
      invoices: await refreshInvoices(),
      selectedInvoiceId: order.invoice.id,
    };
  }

  if (!["CONFIRMADO", "LISTO", "ENTREGADO"].includes(order.status)) {
    failValidation("Solo puedes facturar pedidos confirmados, listos o entregados.");
  }

  if (!validateCustomerDocument(order.customer.documentType, order.customer.document)) {
    failValidation("El cliente del pedido no tiene una identificacion valida para facturar.");
  }

  if (order.customer.documentType !== "CONSUMIDOR_FINAL" && !order.customer.address?.trim()) {
    failValidation("El cliente del pedido necesita direccion de facturacion.");
  }

  const { number, nextSequence } = await createInvoiceNumber();
  let selectedInvoiceId = "";

  await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.create({
      data: {
        number,
        orderId: order.id,
        customerId: order.customerId,
        status: "BORRADOR",
        subtotal: order.subtotal,
        tax: order.tax,
        total: order.total,
        issuedAt: new Date(),
      },
      select: { id: true },
    });

    selectedInvoiceId = invoice.id;

    await tx.businessSettings.update({
      where: { id: settingsId },
      data: { invoiceSequence: nextSequence },
    });

    await tx.payment.updateMany({
      where: {
        orderId: order.id,
        invoiceId: null,
      },
      data: { invoiceId: invoice.id },
    });
  });

  return {
    invoices: await refreshInvoices(),
    selectedInvoiceId,
  };
}

export async function recordInvoiceEmail(log: InvoiceEmailLog) {
  await requireAdminSession();

  if (!log.invoiceId) failValidation("Selecciona una factura valida.");
  if (!log.to.trim()) failValidation("La factura no tiene correo de cliente.");

  const invoice = await prisma.invoice.findUnique({
    where: { id: log.invoiceId },
    select: { id: true, number: true },
  });

  if (!invoice) failValidation("No se encontro la factura seleccionada.");

  const savedLog = await prisma.invoiceEmailLog.create({
    data: {
      invoiceId: invoice.id,
      invoiceNumber: invoice.number,
      to: log.to.trim(),
      from: log.from.trim(),
      subject: log.subject.trim(),
      body: log.body,
      status: log.status,
      sentAt: new Date(log.sentAt),
    },
  });

  await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      status: "ENVIADA",
      sentAt: savedLog.sentAt,
      issuedAt: new Date(),
    },
  });

  revalidatePath("/facturas");
  revalidatePath("/");

  return {
    log: {
      id: savedLog.id,
      invoiceId: savedLog.invoiceId,
      invoiceNumber: savedLog.invoiceNumber,
      to: savedLog.to,
      from: savedLog.from,
      subject: savedLog.subject,
      body: savedLog.body,
      status: "SIMULADO" as const,
      sentAt: savedLog.sentAt.toISOString(),
    },
    invoices: await refreshInvoices(),
  };
}

export async function updateInvoiceStatus(id: string, status: InternalInvoiceStatus) {
  await requireAdminSession();

  await prisma.invoice.update({
    where: { id },
    data: {
      status: statusToPrisma[status],
      sentAt: status === "ENVIADA" ? new Date() : undefined,
      issuedAt: status === "EMITIDA" || status === "ENVIADA" ? new Date() : undefined,
    },
  });

  return refreshInvoices();
}

export async function deleteInvoice(id: string) {
  await requireAdminSession();

  try {
    await prisma.invoice.delete({ where: { id } });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2003" || error.code === "P2014")
    ) {
      await prisma.invoice.update({
        where: { id },
        data: { status: "ANULADA" },
      });
    } else if (
      !(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025")
    ) {
      throw error;
    }
  }

  return refreshInvoices();
}
