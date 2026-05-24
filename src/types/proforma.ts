export type ProformaStatus =
  | "BORRADOR"
  | "ENVIADA"
  | "ACEPTADA"
  | "RECHAZADA"
  | "VENCIDA"
  | "CONVERTIDA";

export type ProformaItemType = "TORTA" | "PRODUCTO" | "MANUAL";

export type ProformaItem = {
  id: string;
  productId: string;
  type: ProformaItemType;
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  customization?: Record<string, unknown>;
};

export type Proforma = {
  id: string;
  number: string;
  customerId: string;
  customerName: string;
  customerDocument: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  status: ProformaStatus;
  issueDate: string;
  validUntil: string;
  deliveryDate: string;
  deliveryTime: string;
  deliveryAddress: string;
  notes: string;
  terms: string;
  items: ProformaItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  createdAt: string;
};

export type ProformaForm = {
  customerId: string;
  status: ProformaStatus;
  validUntil: string;
  deliveryDate: string;
  deliveryTime: string;
  deliveryAddress: string;
  notes: string;
  terms: string;
  discount: number;
  items: ProformaItem[];
};
