"use server";

import { revalidatePath } from "next/cache";
import { requireSameOriginRequest } from "@/lib/action-security";
import { requireAdminSession } from "@/lib/auth";
import { getPaymentRecords } from "@/lib/payments-db";
import { prisma } from "@/lib/prisma";
import { assertAllowedValue, assertSafeId, cleanText, failValidation, roundMoney } from "@/lib/validation";
import type { PaymentMethod, PaymentRecord, PaymentStatus, PaymentTargetType } from "@/types/payment";

const paymentTargetTypes = ["ORDER", "INVOICE"] as const satisfies readonly PaymentTargetType[];
const paymentMethods = ["EFECTIVO", "TRANSFERENCIA", "DEPOSITO", "TARJETA", "OTRO"] as const satisfies readonly PaymentMethod[];
const paymentStatuses = ["PENDIENTE", "CONFIRMADO", "ANULADO"] as const satisfies readonly PaymentStatus[];

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
  await requireSameOriginRequest();
  await requireAdminSession();

  const amount = roundMoney(Number(payment.amount));
  const targetType = assertAllowedValue(payment.targetType, paymentTargetTypes, "El destino del pago");
  const targetId = assertSafeId(payment.targetId, "identificador del destino del pago");
  const paymentId = assertSafeId(payment.id, "identificador del pago");
  const method = assertAllowedValue(payment.method, paymentMethods, "El metodo de pago");
  const status = assertAllowedValue(payment.status, paymentStatuses, "El estado del pago");
  const reference = cleanText(payment.reference, "La referencia del pago", 120);
  const notes = cleanText(payment.notes, "Las notas del pago", 500);
  if (!Number.isFinite(amount) || amount <= 0) {
    failValidation("Ingresa un monto de pago mayor a cero.");
  }

  let invoiceId = targetType === "INVOICE" ? targetId : null;
  const orderId =
    targetType === "INVOICE"
      ? payment.orderId ||
        (
          await prisma.invoice.findUnique({
            where: { id: targetId },
            select: { orderId: true },
          })
        )?.orderId
      : targetId;

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
        id: { not: paymentId },
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
    where: { id: paymentId },
    update: {
      orderId,
      invoiceId,
      method,
      status,
      amount,
      reference: reference || null,
      notes: notes || null,
      paidAt: parsePaidAt(payment.paidAt),
    },
    create: {
      id: paymentId,
      orderId,
      invoiceId,
      method,
      status,
      amount,
      reference: reference || null,
      notes: notes || null,
      paidAt: parsePaidAt(payment.paidAt),
    },
  });

  return refreshPayments();
}

export async function deletePayment(id: string) {
  await requireSameOriginRequest();
  await requireAdminSession();
  const paymentId = assertSafeId(id, "identificador del pago");

  await prisma.payment.delete({ where: { id: paymentId } }).catch(() => null);
  return refreshPayments();
}

export async function updatePaymentStatus(id: string, status: PaymentStatus) {
  await requireSameOriginRequest();
  await requireAdminSession();
  const paymentId = assertSafeId(id, "identificador del pago");
  const nextStatus = assertAllowedValue(status, paymentStatuses, "El estado del pago");

  await prisma.payment.update({
    where: { id: paymentId },
    data: { status: nextStatus },
  });

  return refreshPayments();
}
