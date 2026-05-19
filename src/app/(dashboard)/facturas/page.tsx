import { FilePlus2 } from "lucide-react";
import { InvoiceManager } from "@/components/invoices/invoice-manager";
import { getBillingCustomers } from "@/lib/customers-db";
import { getInvoiceEmailLogs } from "@/lib/email-logs-db";
import { getInternalInvoices } from "@/lib/invoices-db";
import { getCakeOrders } from "@/lib/orders-db";
import { getBusinessSettings } from "@/lib/settings-db";
import { PageHeader } from "@/components/ui/page-header";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const [orders, customers, invoices, settings, emailLogs] = await Promise.all([
    getCakeOrders(),
    getBillingCustomers(),
    getInternalInvoices(),
    getBusinessSettings(),
    getInvoiceEmailLogs(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Facturacion"
        title="Facturas"
        description="Genera facturas internas desde pedidos confirmados, revisa datos tributarios y prepara el flujo para PDF, correo y futura autorizacion SRI."
        actionLabel="Generar factura"
        actionIcon={FilePlus2}
        actionHref="#generar-factura"
      />

      <InvoiceManager
        initialCustomers={customers}
        initialInvoices={invoices}
        initialOrders={orders}
        initialSettings={settings}
        initialEmailLogs={emailLogs}
      />
    </div>
  );
}
