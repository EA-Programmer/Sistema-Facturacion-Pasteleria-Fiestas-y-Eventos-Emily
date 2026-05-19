import type { CakeOrder } from "@/types/order";

export const initialOrders: CakeOrder[] = [];

export const orderStatusLabels: Record<CakeOrder["status"], string> = {
  BORRADOR: "Borrador",
  CONFIRMADO: "Confirmado",
  EN_PRODUCCION: "En produccion",
  LISTO: "Listo",
  ENTREGADO: "Entregado",
  CANCELADO: "Cancelado",
};
