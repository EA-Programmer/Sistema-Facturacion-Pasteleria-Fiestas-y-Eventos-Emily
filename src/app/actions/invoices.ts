"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { existsSync } from "fs";
import { readFile } from "fs/promises";
import { requireAdminSession } from "@/lib/auth";
import { getInternalInvoices, statusToPrisma } from "@/lib/invoices-db";
import { prisma } from "@/lib/prisma";
import { getBusinessSettings, settingsId } from "@/lib/settings-db";
import { enqueueSriJob, processSriJob, retryDueSriJobs } from "@/lib/sri-electronic";
import { buildSriInvoiceXml } from "@/lib/sri-xml";
import { generateInvoicePdfBuffer } from "@/lib/pdf-generator";
import { generateInvoiceHtmlEmail } from "@/lib/email-templates";
import { sendEmail } from "@/lib/email-sender";
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

  // Automatizar la emisión y firma electrónica SRI si está activa en la configuración
  try {
    const settings = await prisma.businessSettings.findUnique({
      where: { id: settingsId },
      select: { sriEnabled: true, signatureFilePath: true },
    });
    if (settings?.sriEnabled && settings?.signatureFilePath) {
      const job = await enqueueSriJob(selectedInvoiceId);
      await processSriJob(job.id);
    }
  } catch (error) {
    console.error("Error en la emisión automática al SRI al generar factura:", error);
  }

  return {
    invoices: await refreshInvoices(),
    selectedInvoiceId,
  };
}

export async function recordInvoiceEmail(log: InvoiceEmailLog) {
  await requireAdminSession();

  if (!log.invoiceId) failValidation("Selecciona una factura valida.");
  if (!log.to.trim()) failValidation("La factura no tiene correo de cliente.");

  // 1. Obtener la factura de la base de datos
  const invoice = await prisma.invoice.findUnique({
    where: { id: log.invoiceId },
    select: { id: true, number: true, status: true, sriAccessKey: true },
  });

  if (!invoice) failValidation("No se encontro la factura seleccionada.");

  const settings = await prisma.businessSettings.findUnique({
    where: { id: settingsId },
  });
  if (!settings) failValidation("Configura los datos de la empresa antes de enviar correos.");

  // Automatizar la emisión y firma electrónica SRI antes de enviar por correo si aún no se ha emitido
  if (settings.sriEnabled && settings.signatureFilePath && (!invoice.sriAccessKey || invoice.status === "BORRADOR")) {
    try {
      const job = await enqueueSriJob(log.invoiceId);
      await processSriJob(job.id);
    } catch (error) {
      console.error("Error al procesar SRI automáticamente antes de enviar correo:", error);
    }
  }

  // 2. Cargar los detalles completos como InternalInvoice y la configuración
  const fullInvoices = await getInternalInvoices();
  const fullInvoice = fullInvoices.find((inv) => inv.id === log.invoiceId);
  if (!fullInvoice) failValidation("No se pudieron cargar los detalles completos de la factura.");
  
  const normalizedSettings = await getBusinessSettings();

  // 3. Generar el PDF y el XML de forma dinámica
  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await generateInvoicePdfBuffer(fullInvoice, normalizedSettings);
  } catch (error) {
    console.error("Error al generar PDF de factura:", error);
    failValidation("Error al generar el PDF del comprobante.");
  }

  // Obtener o generar XML
  let xmlContent = "";
  const invoiceForXml = await prisma.invoice.findUnique({
    where: { id: log.invoiceId },
    include: {
      customer: true,
      order: {
        include: {
          items: {
            orderBy: { id: "asc" },
          },
        },
      },
    },
  });

  if (invoiceForXml) {
    if (invoiceForXml.sriXmlUrl && existsSync(invoiceForXml.sriXmlUrl)) {
      try {
        xmlContent = await readFile(invoiceForXml.sriXmlUrl, "utf8");
      } catch (err) {
        console.error("Error al leer XML existente:", err);
      }
    }
    
    if (!xmlContent) {
      try {
        const { xml } = buildSriInvoiceXml(
          invoiceForXml as unknown as Parameters<typeof buildSriInvoiceXml>[0],
          settings as unknown as Parameters<typeof buildSriInvoiceXml>[1]
        );
        xmlContent = xml;
      } catch (err) {
        console.warn("Generando XML básico de borrador debido a:", err);
        const dateStr = new Date().toLocaleDateString("es-EC");
        xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<factura id="comprobante" version="1.1.0">
  <infoTributaria>
    <ambiente>${settings.sriEnvironment === "PRODUCCION" ? "2" : "1"}</ambiente>
    <tipoEmision>1</tipoEmision>
    <razonSocial>${settings.businessName}</razonSocial>
    <ruc>${settings.ruc}</ruc>
    <claveAcceso>${fullInvoice.sriAccessKey || "BORRADOR"}</claveAcceso>
    <codDoc>01</codDoc>
    <estab>${settings.establishmentCode}</estab>
    <ptoEmi>${settings.emissionPointCode}</ptoEmi>
    <secuencial>${invoice.number.split("-")[2] || "000000001"}</secuencial>
  </infoTributaria>
  <infoFactura>
    <fechaEmision>${dateStr}</fechaEmision>
    <dirEstablecimiento>${settings.address}</dirEstablecimiento>
    <obligadoContabilidad>NO</obligadoContabilidad>
    <identificacionComprador>${invoiceForXml.customer.document}</identificacionComprador>
    <razonSocialComprador>${invoiceForXml.customer.name}</razonSocialComprador>
    <totalSinImpuestos>${Number(invoiceForXml.subtotal).toFixed(2)}</totalSinImpuestos>
    <importeTotal>${Number(invoiceForXml.total).toFixed(2)}</importeTotal>
  </infoFactura>
</factura>`;
      }
    }
  }

  // 4. Preparar adjuntos y enviar el correo real
  const attachments = [
    {
      filename: `Factura_${fullInvoice.number}.pdf`,
      content: pdfBuffer,
    },
  ];

  if (xmlContent) {
    attachments.push({
      filename: `Factura_${fullInvoice.number}.xml`,
      content: Buffer.from(xmlContent, "utf8"),
    });
  }

  const html = generateInvoiceHtmlEmail(fullInvoice, normalizedSettings);
  let emailStatus: "ENVIADO" | "ERROR" = "ENVIADO";

  try {
    const fromAddress = normalizedSettings.emailFromAddress || normalizedSettings.email || "noreply@smartmenucloud.com";
    const fromName = normalizedSettings.emailFromName || normalizedSettings.businessName;

    await sendEmail({
      from: `${fromName} <${fromAddress}>`,
      to: log.to.trim(),
      subject: log.subject.trim(),
      html: html,
      attachments,
    });
  } catch (error) {
    emailStatus = "ERROR";
    console.error("Error crítico al enviar correo:", error);
    // Lanzamos el error hacia la UI para que el usuario reciba la retroalimentación
    failValidation(error instanceof Error ? error.message : "Error al transmitir el correo electrónico.");
  }

  // 5. Guardar registro histórico y actualizar factura
  const savedLog = await prisma.invoiceEmailLog.create({
    data: {
      invoiceId: invoice.id,
      invoiceNumber: invoice.number,
      to: log.to.trim(),
      from: `${normalizedSettings.emailFromName || normalizedSettings.businessName} <${normalizedSettings.emailFromAddress || normalizedSettings.email || "noreply@smartmenucloud.com"}>`,
      subject: log.subject.trim(),
      body: log.body,
      status: emailStatus,
      sentAt: new Date(),
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
      status: emailStatus,
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

export async function emitInvoiceToSri(id: string) {
  await requireAdminSession();

  const job = await enqueueSriJob(id);
  await processSriJob(job.id);

  revalidatePath("/facturas");
  revalidatePath("/reportes");
  revalidatePath("/");

  return refreshInvoices();
}

export async function retrySriQueue() {
  await requireAdminSession();

  await retryDueSriJobs();

  revalidatePath("/facturas");
  revalidatePath("/reportes");
  revalidatePath("/");

  return refreshInvoices();
}
