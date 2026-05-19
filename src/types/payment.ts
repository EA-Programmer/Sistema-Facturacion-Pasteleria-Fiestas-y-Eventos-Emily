export type PaymentTargetType = "ORDER" | "INVOICE";

export type PaymentMethod =
  | "EFECTIVO"
  | "TRANSFERENCIA"
  | "DEPOSITO"
  | "TARJETA"
  | "OTRO";

export type PaymentStatus = "PENDIENTE" | "CONFIRMADO" | "ANULADO";

export type PaymentRecord = {
  id: string;
  code: string;
  targetType: PaymentTargetType;
  targetId: string;
  targetCode: string;
  orderId: string;
  customerName: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  reference: string;
  paidAt: string;
  notes: string;
};

export type PaymentForm = {
  targetKey: string;
  amount: string;
  method: PaymentMethod;
  status: PaymentStatus;
  reference: string;
  paidAt: string;
  notes: string;
};
