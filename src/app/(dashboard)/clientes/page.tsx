import { UserRoundPlus } from "lucide-react";
import { CustomerManager } from "@/components/customers/customer-manager";
import { getBillingCustomers } from "@/lib/customers-db";
import { PageHeader } from "@/components/ui/page-header";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const customers = await getBillingCustomers();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Base comercial"
        title="Clientes"
        description="Registro de clientes con datos tributarios y de contacto para crear pedidos y emitir facturas sin volver a pedir informacion."
        actionLabel="Registrar cliente"
        actionIcon={UserRoundPlus}
        actionHref="#nuevo-cliente"
      />

      <CustomerManager initialCustomers={customers} />
    </div>
  );
}
