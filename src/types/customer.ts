export type CustomerDocumentType = "CEDULA" | "RUC" | "PASAPORTE" | "CONSUMIDOR_FINAL";

export type BillingCustomer = {
  id: string;
  name: string;
  documentType: CustomerDocumentType;
  document: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  notes: string;
  active: boolean;
};
