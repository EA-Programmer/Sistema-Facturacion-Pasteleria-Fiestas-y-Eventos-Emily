import type { InternalInvoice, InternalInvoiceStatus } from "@/types/invoice";

export const initialInvoices: InternalInvoice[] = [];

export const invoiceStatusLabels: Record<InternalInvoiceStatus, string> = {
  PENDIENTE: "Pendiente",
  GENERADA_XML: "XML generado",
  FIRMADA: "Firmada",
  ENVIADA_SRI: "Enviada SRI",
  RECIBIDA: "Recibida SRI",
  EMITIDA: "Emitida",
  ENVIADA: "Enviada",
  AUTORIZADA: "Autorizada",
  DEVUELTA: "Devuelta",
  NO_AUTORIZADA: "No autorizada",
  ERROR_CONEXION: "Error conexion",
  ANULADA: "Anulada",
};
