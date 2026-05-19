import type { Customer, Invoice, Order, Product } from "@/types/domain";

export const products: Product[] = [];

export const customers: Customer[] = [];

export const orders: Order[] = [
  {
    id: "PED-0007",
    customerName: "Maria Fernanda Arias",
    deliveryDate: "2026-05-20",
    status: "CONFIRMADO",
    total: 47.5,
    items: 3,
  },
  {
    id: "PED-0008",
    customerName: "Carlos Zambrano",
    deliveryDate: "2026-05-21",
    status: "EN_PRODUCCION",
    total: 68,
    items: 2,
  },
  {
    id: "PED-0009",
    customerName: "Diana Paredes",
    deliveryDate: "2026-05-23",
    status: "BORRADOR",
    total: 24,
    items: 1,
  },
];

export const invoices: Invoice[] = [
  {
    id: "FAC-001-001-000000012",
    orderId: "PED-0006",
    customerName: "Andrea Loor",
    status: "ENVIADA",
    total: 39.25,
    issuedAt: "2026-05-16",
  },
  {
    id: "FAC-001-001-000000013",
    orderId: "PED-0007",
    customerName: "Maria Fernanda Arias",
    status: "PENDIENTE",
    total: 47.5,
    issuedAt: "2026-05-17",
  },
];

export const pricingRules = [
  {
    name: "Porciones de torta",
    detail: "5, 10, 15, 20 y 25 porciones tienen precio configurable.",
    status: "Activa",
  },
  {
    name: "Sabores y rellenos",
    detail: "Vainilla, chocolate, mixta, zanahoria, Oreo y frutos secos.",
    status: "Activa",
  },
  {
    name: "Modelos personalizables",
    detail: "Todos los modelos de torta admiten personalizacion.",
    status: "Activa",
  },
];
