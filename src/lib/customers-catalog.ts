import type { BillingCustomer } from "@/types/customer";

export const initialCustomers: BillingCustomer[] = [
  {
    id: "customer-final",
    name: "Consumidor final",
    documentType: "CONSUMIDOR_FINAL",
    document: "9999999999999",
    email: "",
    phone: "",
    address: "Sin direccion",
    city: "",
    province: "",
    notes: "Cliente generico para ventas sin datos de facturacion.",
    active: true,
  },
];
