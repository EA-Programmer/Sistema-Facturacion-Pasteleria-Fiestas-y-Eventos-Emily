import { ShoppingBag } from "lucide-react";
import { OrderManager } from "@/components/orders/order-manager";
import { getCakeCatalog } from "@/lib/cake-catalog-db";
import { getBillingCustomers } from "@/lib/customers-db";
import { getCakeOrders } from "@/lib/orders-db";
import { getGeneralProducts } from "@/lib/products-db";
import { getBusinessSettings } from "@/lib/settings-db";
import { PageHeader } from "@/components/ui/page-header";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const [orders, customers, catalog, products, settings] = await Promise.all([
    getCakeOrders(),
    getBillingCustomers(),
    getCakeCatalog(),
    getGeneralProducts(),
    getBusinessSettings(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operacion"
        title="Pedidos"
        description="Creacion de pedidos con cliente, torta personalizada, extras, fecha de entrega y calculo automatico para preparar la factura."
        actionLabel="Crear pedido"
        actionIcon={ShoppingBag}
        actionHref="#nuevo-pedido"
      />

      <OrderManager
        initialCatalog={catalog}
        initialCustomers={customers}
        initialOrders={orders}
        initialProducts={products}
        taxRate={settings.taxRate / 100}
      />
    </div>
  );
}
