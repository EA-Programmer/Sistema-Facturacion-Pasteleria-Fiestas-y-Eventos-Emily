import { ClipboardList } from "lucide-react";
import { ProformaManager } from "@/components/proformas/proforma-manager";
import { PageHeader } from "@/components/ui/page-header";
import { getCakeCatalog } from "@/lib/cake-catalog-db";
import { getBillingCustomers } from "@/lib/customers-db";
import { getGeneralProducts } from "@/lib/products-db";
import { getProformas } from "@/lib/proformas-db";
import { getBusinessSettings } from "@/lib/settings-db";

export const dynamic = "force-dynamic";

export default async function ProformasPage() {
  const [proformas, customers, catalog, products, settings] = await Promise.all([
    getProformas(),
    getBillingCustomers(),
    getCakeCatalog(),
    getGeneralProducts(),
    getBusinessSettings(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Cotizaciones"
        title="Proformas"
        description="Crea proformas descriptivas con tortas personalizadas, productos, bocaditos, cantidades, precios y PDF profesional con logo."
        actionLabel="Nueva proforma"
        actionIcon={ClipboardList}
        actionHref="#nueva-proforma"
      />

      <div id="nueva-proforma">
        <ProformaManager
          initialCatalog={catalog}
          initialCustomers={customers}
          initialProducts={products}
          initialProformas={proformas}
          taxRate={settings.taxRate / 100}
        />
      </div>
    </div>
  );
}
