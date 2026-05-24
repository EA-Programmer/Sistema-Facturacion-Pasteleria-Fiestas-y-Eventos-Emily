import type { ProformaStatus as PrismaProformaStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { Proforma, ProformaItem, ProformaStatus } from "@/types/proforma";

const statusToInternal: Record<PrismaProformaStatus, ProformaStatus> = {
  BORRADOR: "BORRADOR",
  ENVIADA: "ENVIADA",
  ACEPTADA: "ACEPTADA",
  RECHAZADA: "RECHAZADA",
  VENCIDA: "VENCIDA",
  CONVERTIDA: "CONVERTIDA",
};

export const statusToPrisma: Record<ProformaStatus, PrismaProformaStatus> = {
  BORRADOR: "BORRADOR",
  ENVIADA: "ENVIADA",
  ACEPTADA: "ACEPTADA",
  RECHAZADA: "RECHAZADA",
  VENCIDA: "VENCIDA",
  CONVERTIDA: "CONVERTIDA",
};

function toDateInput(date: Date | null) {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

function asCustomization(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

export async function getProformas(): Promise<Proforma[]> {
  const proformas = await prisma.proforma.findMany({
    include: {
      customer: true,
      items: {
        orderBy: { id: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return proformas.map((proforma) => ({
    id: proforma.id,
    number: proforma.number,
    customerId: proforma.customerId,
    customerName: proforma.customer.name,
    customerDocument: proforma.customer.document,
    customerEmail: proforma.customer.email ?? "",
    customerPhone: proforma.customer.phone ?? "",
    customerAddress: proforma.customer.address ?? "",
    status: statusToInternal[proforma.status],
    issueDate: toDateInput(proforma.issueDate),
    validUntil: toDateInput(proforma.validUntil),
    deliveryDate: toDateInput(proforma.deliveryDate),
    deliveryTime: proforma.deliveryTime ?? "",
    deliveryAddress: proforma.deliveryAddress ?? "",
    notes: proforma.notes ?? "",
    terms: proforma.terms ?? "",
    subtotal: Number(proforma.subtotal),
    tax: Number(proforma.tax),
    discount: Number(proforma.discount),
    total: Number(proforma.total),
    createdAt: proforma.createdAt.toISOString(),
    items: proforma.items.map<ProformaItem>((item) => ({
      id: item.id,
      productId: item.productId ?? "",
      type: item.type === "TORTA" || item.type === "MANUAL" ? item.type : "PRODUCTO",
      name: item.name,
      description: item.description ?? "",
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      total: Number(item.total),
      customization: asCustomization(item.customization),
    })),
  }));
}
