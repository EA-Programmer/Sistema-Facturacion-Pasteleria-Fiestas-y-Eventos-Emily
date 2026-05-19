import { prisma } from "@/lib/prisma";
import type { BillingCustomer } from "@/types/customer";

export function normalizeCustomer(customer: {
  id: string;
  name: string;
  documentType: BillingCustomer["documentType"];
  document: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  notes: string | null;
  active: boolean;
}): BillingCustomer {
  return {
    id: customer.id,
    name: customer.name,
    documentType: customer.documentType,
    document: customer.document,
    email: customer.email ?? "",
    phone: customer.phone ?? "",
    address: customer.address ?? "",
    city: customer.city ?? "",
    province: customer.province ?? "",
    notes: customer.notes ?? "",
    active: customer.active,
  };
}

export async function getBillingCustomers(): Promise<BillingCustomer[]> {
  const customers = await prisma.customer.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });

  return customers.map(normalizeCustomer);
}
