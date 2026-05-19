import type { InvoiceStatus } from "@prisma/client";
import { buildInvoiceLines } from "@/lib/invoice-lines";
import { getCakeOrders } from "@/lib/orders-db";
import { prisma } from "@/lib/prisma";
import type { InternalInvoice, InternalInvoiceStatus } from "@/types/invoice";

const statusToInternal: Record<InvoiceStatus, InternalInvoiceStatus> = {
  BORRADOR: "PENDIENTE",
  EMITIDA: "EMITIDA",
  ENVIADA: "ENVIADA",
  AUTORIZADA: "EMITIDA",
  ANULADA: "ANULADA",
};

export const statusToPrisma: Record<InternalInvoiceStatus, InvoiceStatus> = {
  PENDIENTE: "BORRADOR",
  EMITIDA: "EMITIDA",
  ENVIADA: "ENVIADA",
  ANULADA: "ANULADA",
};

export async function getInternalInvoices(): Promise<InternalInvoice[]> {
  const [invoices, orders] = await Promise.all([
    prisma.invoice.findMany({
      include: {
        customer: true,
        order: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    getCakeOrders(),
  ]);

  const ordersById = new Map(orders.map((order) => [order.id, order]));

  return invoices.map((invoice) => {
    const order = ordersById.get(invoice.orderId);

    return {
      id: invoice.id,
      number: invoice.number,
      orderId: invoice.orderId,
      orderCode: invoice.order.code,
      customerId: invoice.customerId,
      customerName: invoice.customer.name,
      customerDocumentType: invoice.customer.documentType,
      customerDocument: invoice.customer.document,
      customerEmail: invoice.customer.email ?? "",
      customerPhone: invoice.customer.phone ?? "",
      customerAddress: invoice.customer.address ?? invoice.order.deliveryAddress ?? "",
      status: statusToInternal[invoice.status],
      issuedAt: (invoice.issuedAt ?? invoice.createdAt).toISOString(),
      sentAt: invoice.sentAt?.toISOString(),
      lines: order ? buildInvoiceLines(order) : [],
      extras: order?.extras ?? [],
      subtotal: Number(invoice.subtotal),
      tax: Number(invoice.tax),
      total: Number(invoice.total),
      notes: invoice.order.notes ?? "",
    };
  });
}
