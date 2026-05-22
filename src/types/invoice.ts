import type { CustomerDocumentType } from "@/types/customer";
import type { OrderExtra } from "@/types/order";

export type InternalInvoiceStatus =
  | "PENDIENTE"
  | "GENERADA_XML"
  | "FIRMADA"
  | "ENVIADA_SRI"
  | "RECIBIDA"
  | "EMITIDA"
  | "ENVIADA"
  | "AUTORIZADA"
  | "DEVUELTA"
  | "NO_AUTORIZADA"
  | "ERROR_CONEXION"
  | "ANULADA";

export type InternalInvoiceLine = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

export type InternalInvoice = {
  id: string;
  number: string;
  orderId: string;
  orderCode: string;
  customerId: string;
  customerName: string;
  customerDocumentType: CustomerDocumentType;
  customerDocument: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  status: InternalInvoiceStatus;
  issuedAt: string;
  sentAt?: string;
  sriAccessKey: string;
  hasSriXml: boolean;
  sriAuthorizedAt?: string;
  sriJob?: {
    id: string;
    status: string;
    attempts: number;
    lastError: string;
    nextRunAt: string;
  };
  lines: InternalInvoiceLine[];
  extras: OrderExtra[];
  subtotal: number;
  tax: number;
  total: number;
  notes: string;
};
