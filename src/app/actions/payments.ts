"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/auth";
import { getPaymentRecords } from "@/lib/payments-db";
import { prisma } from "@/lib/prisma";
import { failValidation, roundMoney } from "@/lib/validation";
import type { PaymentRecord, PaymentStatus } from "@/types/payment";

function parsePaidAt(value: string) {
  if (!value) return new Date();
  if (value.includes("T")) return new Date(value);
  return new Date(`${value}T00:00:00`);
}

async function refreshPayments() {
  revalidatePath("/pagos");
  revalidatePath("/reportes");
  revalidatePath("/");
  return getPaymentRecords();
}

export async function savePayment(payment: PaymentRecord) {
  await requireAdminSession();

  const amount = roundMoney(Number(payment.amount));
  if (!Number.isFinite(amount) || amount <= 0) {
    failValidation("Ingresa un monto de pago mayor a cero.");
  }

  let invoiceId = payment.targetType === "INVOICE" ? payment.targetId : null;
  const orderId =
    payment.targetType === "INVOICE"
      ? payment.orderId ||
        (
          await prisma.invoice.findUnique({
            where: { id: payment.targetId },
            select: { orderId: true },
          })
        )?.orderId
      : payment.targetId;

  if (!orderId) {
    failValidation("No se encontro el pedido asociado al pago.");
  }

  const targetOrder = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, total: true, status: true, invoice: { select: { id: true } } },
  });

  if (!targetOrder || targetOrder.status === "CANCELADO") {
    failValidation("No puedes registrar pagos para un pedido inexistente o cancelado.");
  }

  if (!invoiceId && targetOrder.invoice) {
    invoiceId = targetOrder.invoice.id;
  }

  const [targetInvoice, confirmedPayments] = await Promise.all([
    invoiceId
      ? prisma.invoice.findUnique({
          where: { id: invoiceId },
          select: { id: true, total: true, status: true, orderId: true },
        })
      : null,
    prisma.payment.findMany({
      where: {
        orderId,
        invoiceId,
        status: "CONFIRMADO",
        id: { not: payment.id },
      },
      select: { amount: true },
    }),
  ]);

  if (invoiceId && (!targetInvoice || targetInvoice.status === "ANULADA")) {
    failValidation("No puedes registrar pagos para una factura inexistente o anulada.");
  }

  const targetTotal = Number(targetInvoice?.total ?? targetOrder.total);
  const alreadyPaid = confirmedPayments.reduce((total, item) => total + Number(item.amount), 0);
  const balance = roundMoney(targetTotal - alreadyPaid);

  if (amount > balance) {
    failValidation(`El monto supera el saldo disponible (${balance.toFixed(2)}).`);
  }

  await prisma.payment.upsert({
    where: { id: payment.id },
    update: {
      orderId,
      invoiceId,
      method: payment.method,
      status: payment.status,
      amount,
      reference: payment.reference.trim() || null,
      notes: payment.notes.trim() || null,
      paidAt: parsePaidAt(payment.paidAt),
    },
    create: {
      id: payment.id,
      orderId,
      invoiceId,
      method: payment.method,
      status: payment.status,
      amount,
      reference: payment.reference.trim() || null,
      notes: payment.notes.trim() || null,
      paidAt: parsePaidAt(payment.paidAt),
    },
  });

  return refreshPayments();
}

export async function deletePayment(id: string) {
  await requireAdminSession();

  await prisma.payment.delete({ where: { id } }).catch(() => null);
  return refreshPayments();
}

export async function updatePaymentStatus(id: string, status: PaymentStatus) {
  await requireAdminSession();

  await prisma.payment.update({
    where: { id },
    data: { status },
  });

  return refreshPayments();
}
