export type ProductCategory =
  | "TORTAS"
  | "BOCADITOS_SAL"
  | "BOCADITOS_DULCE"
  | "CUPCAKES"
  | "GALLETAS"
  | "POSTRES"
  | "VELAS"
  | "EXTRAS";

export type OrderStatus =
  | "BORRADOR"
  | "CONFIRMADO"
  | "EN_PRODUCCION"
  | "LISTO"
  | "ENTREGADO"
  | "CANCELADO";

export type InvoiceStatus = "PENDIENTE" | "EMITIDA" | "ENVIADA" | "ANULADA";

export type Product = {
  id: string;
  name: string;
  category: ProductCategory;
  basePrice: number;
  active: boolean;
  pricingMode: "FIJO" | "POR_REGLAS";
  variants: string[];
};

export type Customer = {
  id: string;
  name: string;
  document: string;
  email: string;
  phone: string;
};

export type Order = {
  id: string;
  customerName: string;
  deliveryDate: string;
  status: OrderStatus;
  total: number;
  items: number;
};

export type Invoice = {
  id: string;
  orderId: string;
  customerName: string;
  status: InvoiceStatus;
  total: number;
  issuedAt: string;
};
