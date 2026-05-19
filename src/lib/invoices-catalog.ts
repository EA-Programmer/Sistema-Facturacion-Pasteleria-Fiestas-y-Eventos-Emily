import type { InternalInvoice, InternalInvoiceStatus } from "@/types/invoice";

export const initialInvoices: InternalInvoice[] = [];

export const invoiceStatusLabels: Record<InternalInvoiceStatus, string> = {
  PENDIENTE: "Pendiente",
  EMITIDA: "Emitida",
  ENVIADA: "Enviada",
  ANULADA: "Anulada",
};
