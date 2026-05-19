import { Settings2 } from "lucide-react";
import { SettingsManager } from "@/components/settings/settings-manager";
import { PageHeader } from "@/components/ui/page-header";
import { getBusinessSettings } from "@/lib/settings-db";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getBusinessSettings();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Sistema"
        title="Configuracion"
        description="Datos de empresa, facturacion, correo y preparacion SRI para alimentar pedidos, facturas y PDF."
        actionLabel="Parametros"
        actionIcon={Settings2}
        actionHref="#empresa"
      />

      <SettingsManager initialSettings={settings} />
    </div>
  );
}
