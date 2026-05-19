import { CakeSlice } from "lucide-react";
import { CakeCatalogManager } from "@/components/products/cake-catalog-manager";
import { PageHeader } from "@/components/ui/page-header";
import { getCakeCatalog } from "@/lib/cake-catalog-db";
import { getGeneralProducts } from "@/lib/products-db";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const [catalog, products] = await Promise.all([
    getCakeCatalog(),
    getGeneralProducts(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Catalogo interno"
        title="Productos: tortas"
        description="Administracion de porciones, precios, sabores, rellenos, coberturas y modelos personalizables. Estos catalogos se usaran luego para crear pedidos y facturas."
        actionLabel="Configurar tortas"
        actionIcon={CakeSlice}
        actionHref="#catalogo-tortas"
      />

      <CakeCatalogManager initialCatalog={catalog} initialProducts={products} />
    </div>
  );
}
