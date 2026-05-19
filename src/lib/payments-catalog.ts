import type { PaymentMethod, PaymentRecord, PaymentStatus } from "@/types/payment";

export const initialPayments: PaymentRecord[] = [];

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  EFECTIVO: "Efectivo",
  TRANSFERENCIA: "Transferencia",
  DEPOSITO: "Deposito",
  TARJETA: "Tarjeta",
  OTRO: "Otro",
};

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  PENDIENTE: "Pendiente",
  CONFIRMADO: "Confirmado",
  ANULADO: "Anulado",
};
