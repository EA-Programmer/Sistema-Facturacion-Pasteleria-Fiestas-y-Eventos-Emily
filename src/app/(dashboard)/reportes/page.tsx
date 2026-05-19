import { BarChart3, CakeSlice, DollarSign, ReceiptText, ShoppingBag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { paymentMethodLabels } from "@/lib/payments-catalog";
import { getReportsData } from "@/lib/reports-db";
import { currency, shortDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const invoiceStatusLabels: Record<string, string> = {
  PENDIENTE: "Pendiente",
  EMITIDA: "Emitida",
  ENVIADA: "Enviada",
  ANULADA: "Anulada",
};

export default async function ReportsPage() {
  const reports = await getReportsData();
  const maxMethodAmount = Math.max(...reports.salesByMethod.map((item) => item.amount), 1);
  const maxFlavorCount = Math.max(...reports.topFlavors.map((item) => item.count), 1);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Analitica"
        title="Reportes"
        description="Indicadores reales de ventas, caja, pedidos, facturacion y saldos por cobrar."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          helper="Pagos confirmados"
          icon={DollarSign}
          label="Cobrado"
          tone="green"
          value={currency(reports.summary.totalCollected)}
        />
        <StatCard
          helper="Pagos confirmados del mes"
          icon={BarChart3}
          label="Mes actual"
          tone="blue"
          value={currency(reports.summary.monthCollected)}
        />
        <StatCard
          helper={`${reports.summary.monthlyOrders} creados este mes`}
          icon={ShoppingBag}
          label="Pedidos activos"
          tone="berry"
          value={String(reports.summary.activeOrders)}
        />
        <StatCard
          helper={`${reports.summary.emittedInvoices} emitidas o enviadas`}
          icon={ReceiptText}
          label="Facturas"
          tone="amber"
          value={String(reports.summary.invoiceCount)}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <ReportCard
          description="Distribucion de cobros confirmados por metodo de pago."
          title="Caja por metodo"
        >
          {reports.salesByMethod.length ? (
            <div className="space-y-4">
              {reports.salesByMethod.map((item) => (
                <ProgressRow
                  key={item.method}
                  label={paymentMethodLabels[item.method as keyof typeof paymentMethodLabels] ?? item.method}
                  value={currency(item.amount)}
                  width={(item.amount / maxMethodAmount) * 100}
                />
              ))}
            </div>
          ) : (
            <EmptyText text="Aun no hay pagos confirmados." />
          )}
        </ReportCard>

        <ReportCard description="Pendientes de confirmar y cuentas abiertas." title="Saldos">
          <div className="space-y-3">
            <BalanceLine label="Por confirmar" value={currency(reports.summary.totalPendingConfirmation)} />
            <BalanceLine label="Saldo abierto" value={currency(reports.summary.openBalance)} strong />
          </div>
        </ReportCard>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <ReportCard description="Sabores mas pedidos en los pedidos activos." title="Sabores top">
          {reports.topFlavors.length ? (
            <div className="space-y-4">
              {reports.topFlavors.map((item) => (
                <ProgressRow
                  key={item.name}
                  label={item.name}
                  value={`${item.count} pedido${item.count === 1 ? "" : "s"}`}
                  width={(item.count / maxFlavorCount) * 100}
                />
              ))}
            </div>
          ) : (
            <EmptyText text="Aun no hay pedidos para calcular favoritos." />
          )}
        </ReportCard>

        <ReportCard description="Estado actual de los comprobantes internos." title="Facturacion">
          {reports.invoiceStatus.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {reports.invoiceStatus.map((item) => (
                <div className="rounded-lg border border-[var(--line)] p-4" key={item.status}>
                  <p className="text-sm font-semibold text-slate-500">
                    {invoiceStatusLabels[item.status] ?? item.status}
                  </p>
                  <p className="mt-2 text-2xl font-bold text-[var(--chocolate)]">{item.count}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyText text="Todavia no hay facturas registradas." />
          )}
        </ReportCard>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <ReportCard description="Pedidos activos con fecha de entrega cercana." title="Proximas entregas">
          {reports.upcomingOrders.length ? (
            <div className="divide-y divide-[var(--line)]">
              {reports.upcomingOrders.map((order) => (
                <div className="flex items-start justify-between gap-4 py-3" key={order.id}>
                  <div>
                    <p className="font-bold text-slate-950">{order.code}</p>
                    <p className="mt-1 text-sm text-slate-600">{order.customerName}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {order.portionsLabel} - {order.flavorName}
                    </p>
                  </div>
                  <Badge variant="berry">{shortDate(order.deliveryDate)}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <EmptyText text="No hay entregas futuras registradas." />
          )}
        </ReportCard>

        <ReportCard description="Pedidos o facturas con saldo pendiente." title="Cuentas por cobrar">
          {reports.receivables.length ? (
            <div className="divide-y divide-[var(--line)]">
              {reports.receivables.map((item) => (
                <div className="flex items-start justify-between gap-4 py-3" key={`${item.kind}-${item.targetId}`}>
                  <div>
                    <p className="font-bold text-slate-950">{item.code}</p>
                    <p className="mt-1 text-sm text-slate-600">{item.customerName}</p>
                    <p className="mt-1 text-xs font-semibold uppercase text-slate-400">{item.kind}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-[var(--chocolate)]">{currency(item.balance)}</p>
                    <p className="mt-1 text-xs text-slate-500">de {currency(item.total)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyText text="No hay saldos pendientes." />
          )}
        </ReportCard>
      </section>
    </div>
  );
}

function ReportCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm shadow-pink-950/5">
      <div className="mb-5 flex items-start gap-3">
        <span className="rounded-lg bg-pink-50 p-2 text-[var(--berry)]">
          <CakeSlice aria-hidden className="size-5" />
        </span>
        <div>
          <h2 className="text-lg font-bold text-[var(--chocolate)]">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function ProgressRow({
  label,
  value,
  width,
}: {
  label: string;
  value: string;
  width: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold text-slate-700">{label}</span>
        <strong className="text-[var(--chocolate)]">{value}</strong>
      </div>
      <div className="mt-2 h-2 rounded-full bg-pink-50">
        <div
          className="h-2 rounded-full bg-[var(--berry)]"
          style={{ width: `${Math.max(width, 5)}%` }}
        />
      </div>
    </div>
  );
}

function BalanceLine({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-[var(--cream)] px-4 py-3">
      <span className="font-semibold text-slate-700">{label}</span>
      <strong className={strong ? "text-xl text-[var(--chocolate)]" : "text-slate-950"}>
        {value}
      </strong>
    </div>
  );
}

function EmptyText({ text }: { text: string }) {
  return <p className="rounded-lg bg-[var(--cream)] p-4 text-sm text-slate-600">{text}</p>;
}
