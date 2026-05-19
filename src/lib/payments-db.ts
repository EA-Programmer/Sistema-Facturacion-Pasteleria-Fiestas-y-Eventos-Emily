import { prisma } from "@/lib/prisma";
import type { PaymentRecord, PaymentTargetType } from "@/types/payment";

function toDateInput(date: Date | null) {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

function paymentCode(id: string) {
  return `PAG-${id.slice(-6).toUpperCase()}`;
}

function targetType(invoiceId: string | null): PaymentTargetType {
  return invoiceId ? "INVOICE" : "ORDER";
}

export async function getPaymentRecords(): Promise<PaymentRecord[]> {
  const payments = await prisma.payment.findMany({
    include: {
      invoice: true,
      order: {
        include: {
          customer: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return payments.map((payment) => ({
    id: payment.id,
    code: paymentCode(payment.id),
    targetType: targetType(payment.invoiceId),
    targetId: payment.invoiceId ?? payment.orderId,
    targetCode: payment.invoice?.number ?? payment.order.code,
    orderId: payment.orderId,
    customerName: payment.order.customer.name,
    amount: Number(payment.amount),
    method: payment.method,
    status: payment.status,
    reference: payment.reference ?? "",
    paidAt: toDateInput(payment.paidAt ?? payment.createdAt),
    notes: payment.notes ?? "",
  }));
}
