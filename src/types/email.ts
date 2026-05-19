export type EmailDeliveryStatus = "SIMULADO" | "ENVIADO" | "ERROR";

export type InvoiceEmailLog = {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  to: string;
  from: string;
  subject: string;
  body: string;
  status: EmailDeliveryStatus;
  sentAt: string;
};
