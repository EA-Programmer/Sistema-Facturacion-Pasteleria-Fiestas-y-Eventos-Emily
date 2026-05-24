import type { ProformaStatus } from "@/types/proforma";

export const proformaStatusLabels: Record<ProformaStatus, string> = {
  BORRADOR: "Borrador",
  ENVIADA: "Enviada",
  ACEPTADA: "Aceptada",
  RECHAZADA: "Rechazada",
  VENCIDA: "Vencida",
  CONVERTIDA: "Convertida en pedido",
};
