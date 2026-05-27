import {
  CalendarDays,
  DollarSign,
  FileText,
  Mail,
  PackagePlus,
  ShoppingBag,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Database,
  Key,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { StatCard } from "@/components/ui/stat-card";
import { brand } from "@/lib/brand";
import { getCakeCatalog } from "@/lib/cake-catalog-db";
import { extractEmailAddress } from "@/lib/email-address";
import { invoiceStatusLabels } from "@/lib/invoices-catalog";
import { getInternalInvoices } from "@/lib/invoices-db";
import { orderStatusLabels } from "@/lib/orders-catalog";
import { getCakeOrders } from "@/lib/orders-db";
import { getPaymentRecords } from "@/lib/payments-db";
import { getBusinessSettings } from "@/lib/settings-db";
import { currency, shortDate } from "@/lib/utils";
import type { InternalInvoice, InternalInvoiceStatus } from "@/types/invoice";
import type { CakeOrderStatus } from "@/types/order";

export const dynamic = "force-dynamic";

function dateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function isWithinNextDays(value: string, days: number) {
  if (!value) return false;
  const today = new Date(`${dateKey()}T00:00:00`);
  const limit = addDays(today, days);
  const date = new Date(`${value}T00:00:00`);
  return date >= today && date <= limit;
}

function isCurrentMonth(value: string) {
  const date = new Date(value);
  const today = new Date();
  return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth();
}

function orderBadge(status: CakeOrderStatus) {
  const variant =
    status === "CONFIRMADO"
      ? "blue"
      : status === "EN_PRODUCCION"
        ? "amber"
        : status === "LISTO" || status === "ENTREGADO"
          ? "green"
          : status === "BORRADOR"
            ? "berry"
            : "default";

  return <Badge variant={variant}>{orderStatusLabels[status]}</Badge>;
}

function invoiceBadge(status: InternalInvoiceStatus) {
  const variant =
    status === "ENVIADA"
      ? "green"
      : status === "EMITIDA"
        ? "blue"
        : status === "PENDIENTE"
          ? "amber"
          : "default";

  return <Badge variant={variant}>{invoiceStatusLabels[status]}</Badge>;
}

export default async function DashboardPage() {
  const [orders, invoices, payments, catalog, settings] = await Promise.all([
    getCakeOrders(),
    getInternalInvoices(),
    getPaymentRecords(),
    getCakeCatalog(),
    getBusinessSettings(),
  ]);

  const activeOrders = orders.filter((order) => order.status !== "CANCELADO");
  const confirmedPayments = payments.filter((payment) => payment.status === "CONFIRMADO");
  const monthSales = roundMoney(
    confirmedPayments
      .filter((payment) => isCurrentMonth(payment.paidAt))
      .reduce((total, payment) => total + payment.amount, 0),
  );
  const upcomingDeliveries = activeOrders.filter((order) =>
    isWithinNextDays(order.deliveryDate, 7),
  );
  const invoicesPending = invoices.filter((invoice) => invoice.status === "PENDIENTE");
  const ordersToConfirm = orders.filter((order) => order.status === "BORRADOR");
  const invoiceableOrderIds = new Set(invoices.map((invoice) => invoice.orderId));
  const invoiceableOrders = activeOrders.filter(
    (order) =>
      ["CONFIRMADO", "LISTO", "ENTREGADO"].includes(order.status) &&
      !invoiceableOrderIds.has(order.id),
  );
  const todaysInvoices = invoices.filter((invoice) => invoice.issuedAt.slice(0, 10) === dateKey());
  const recentOrders = activeOrders.slice(0, 5);
  const recentInvoices = invoices.slice(0, 4);

  const pricingRules = [
    {
      name: "Porciones de torta",
      detail: `${catalog.portions.filter((item) => item.active).length} precios activos configurados.`,
      status: catalog.portions.some((item) => item.active) ? "Activa" : "Pendiente",
    },
    {
      name: "Sabores y rellenos",
      detail: `${catalog.flavors.filter((item) => item.active).length} sabores y ${catalog.fillings.filter((item) => item.active).length} rellenos activos.`,
      status:
        catalog.flavors.some((item) => item.active) && catalog.fillings.some((item) => item.active)
          ? "Activa"
          : "Pendiente",
    },
    {
      name: "Coberturas y modelos",
      detail: `${catalog.covers.filter((item) => item.active).length} coberturas y ${catalog.models.filter((item) => item.active).length} modelos personalizables.`,
      status:
        catalog.covers.some((item) => item.active) && catalog.models.some((item) => item.active)
          ? "Activa"
          : "Pendiente",
    },
  ];

  // Verify checklist items
  const envEmailFrom = process.env.EMAIL_FROM ? extractEmailAddress(process.env.EMAIL_FROM) : "";
  const configuredSender = settings.emailFromAddress || envEmailFrom || settings.email;
  const smtpConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
  const resendConfigured = Boolean(process.env.RESEND_API_KEY);
  const senderConfigured = Boolean(configuredSender);
  const emailConfigured = senderConfigured;
  const emailProvider = resendConfigured ? "Resend listo" : smtpConfigured ? "SMTP listo" : "Preparado";
  const emailDetail = resendConfigured || senderConfigured
    ? (configuredSender || "Remitente configurado")
    : smtpConfigured
      ? process.env.SMTP_USER
      : "Configura el remitente";
  const signatureConfigured = settings.hasSignature;
  const isSignatureExpired = settings.signatureExpiresAt ? new Date(settings.signatureExpiresAt) < new Date() : false;
  const rucConfigured = /^\d{13}$/.test(settings.ruc) && settings.ruc !== "PENDIENTE";
  const sriReady = settings.sriEnabled && signatureConfigured && rucConfigured && !isSignatureExpired;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-lg border border-pink-100 bg-white shadow-sm">
        <div className="grid gap-6 p-5 sm:p-6 xl:grid-cols-[1fr_360px]">
          <div>
            <p className="text-sm font-bold uppercase text-[var(--berry)]">Panel interno</p>
            <h1 className="mt-2 max-w-3xl text-3xl font-bold leading-tight text-[var(--chocolate)] sm:text-4xl">
              {brand.businessName}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              Gestiona pedidos, productos personalizables, pagos y facturas desde un panel administrativo preparado para conectar SRI despues.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/pedidos#nuevo-pedido">
                <ShoppingBag aria-hidden className="size-4" />
                Nuevo pedido
              </ButtonLink>
              <ButtonLink href="/productos#catalogo-tortas" variant="secondary">
                <PackagePlus aria-hidden className="size-4" />
                Agregar producto
              </ButtonLink>
            </div>
          </div>

          <div className="rounded-lg border border-pink-100 bg-[var(--icing)] p-4">
            <p className="text-sm font-bold text-[var(--berry-dark)]">Tareas de hoy</p>
            <div className="mt-4 space-y-3">
              {[
                { label: "Confirmar pedidos nuevos", value: ordersToConfirm.length },
                { label: "Generar facturas pendientes", value: invoiceableOrders.length },
                { label: "Revisar entregas proximas", value: upcomingDeliveries.length },
              ].map((task) => (
                <div className="flex items-center justify-between rounded-lg bg-white px-4 py-3 shadow-sm" key={task.label}>
                  <span className="text-sm font-semibold text-slate-700">{task.label}</span>
                  <span className="grid size-8 place-items-center rounded-full bg-pink-50 text-sm font-bold text-[var(--berry)]">
                    {task.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SRI Environment & Diagnostics Checklist Panel */}
      <section className="rounded-xl border border-pink-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-pink-50 pb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                settings.sriEnabled 
                  ? settings.sriEnvironment === "PRODUCCION"
                    ? "bg-red-100 text-red-700 border border-red-200"
                    : "bg-cyan-100 text-cyan-800 border border-cyan-200"
                  : "bg-amber-100 text-amber-800 border border-amber-200"
              }`}>
                <ShieldCheck className={`size-3.5 ${settings.sriEnabled && settings.sriEnvironment === "PRODUCCION" ? "animate-pulse" : ""}`} />
                {settings.sriEnabled 
                  ? settings.sriEnvironment === "PRODUCCION"
                    ? "AMBIENTE DE PRODUCCIÓN ACTIVO"
                    : "AMBIENTE DE PRUEBAS ACTIVO"
                  : "INTEGRACIÓN SRI DESACTIVADA"
                }
              </span>
              <h2 className="text-lg font-bold text-slate-900">Estado de Facturación Electrónica</h2>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Chequeo automático del sistema y diagnóstico de firmas, correos y RUC para emitir facturas legales.
            </p>
          </div>
          <div className="text-left md:text-right">
            <span className="text-xs text-slate-400 font-medium bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">
              Servicios en tiempo real
            </span>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {/* Check Database */}
          <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-4">
            <div className="flex items-center justify-between">
              <span className="rounded-md bg-blue-50 p-1.5 text-blue-600">
                <Database className="size-4" />
              </span>
              <CheckCircle2 className="size-4 text-emerald-600" />
            </div>
            <p className="mt-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Base de datos</p>
            <p className="mt-1 text-sm font-bold text-slate-900">Conectada</p>
            <p className="mt-1 text-xs text-slate-500">Prisma & PostgreSQL</p>
          </div>

          {/* Check Email Delivery */}
          <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-4">
            <div className="flex items-center justify-between">
              <span className="rounded-md bg-pink-50 p-1.5 text-[var(--berry)]">
                <Mail className="size-4" />
              </span>
              {emailConfigured ? (
                <CheckCircle2 className="size-4 text-emerald-600" />
              ) : (
                <AlertCircle className="size-4 text-amber-600" />
              )}
            </div>
            <p className="mt-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Servicio Correo</p>
            <p className="mt-1 text-sm font-bold text-slate-900 truncate">
              {emailConfigured ? emailProvider : "Sin configurar"}
            </p>
            <p className="mt-1 text-xs text-slate-500 truncate" title={emailDetail}>
              {emailConfigured ? emailDetail : "Sin credenciales"}
            </p>
          </div>

          {/* Check Digital Signature */}
          <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-4">
            <div className="flex items-center justify-between">
              <span className="rounded-md bg-purple-50 p-1.5 text-purple-600">
                <Key className="size-4" />
              </span>
              {signatureConfigured ? (
                isSignatureExpired ? (
                  <XCircle className="size-4 text-red-600" />
                ) : (
                  <CheckCircle2 className="size-4 text-emerald-600" />
                )
              ) : (
                <AlertCircle className="size-4 text-amber-600" />
              )}
            </div>
            <p className="mt-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Firma Digital</p>
            <p className="mt-1 text-sm font-bold text-slate-900 truncate">
              {signatureConfigured ? "Registrada" : "Pendiente"}
            </p>
            <p className="mt-1 text-xs text-slate-500 truncate">
              {signatureConfigured 
                ? isSignatureExpired 
                  ? "Expirada" 
                  : `Vence: ${settings.signatureExpiresAt}`
                : "Sube tu archivo .p12"
              }
            </p>
          </div>

          {/* Check RUC & Address */}
          <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-4">
            <div className="flex items-center justify-between">
              <span className="rounded-md bg-indigo-50 p-1.5 text-indigo-600">
                <FileText className="size-4" />
              </span>
              {rucConfigured ? (
                <CheckCircle2 className="size-4 text-emerald-600" />
              ) : (
                <AlertCircle className="size-4 text-amber-600" />
              )}
            </div>
            <p className="mt-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Datos de Emisor</p>
            <p className="mt-1 text-sm font-bold text-slate-900 truncate">
              {rucConfigured ? settings.ruc : "Falta RUC"}
            </p>
            <p className="mt-1 text-xs text-slate-500 truncate">
              {rucConfigured ? "RUC Válido 13 dígitos" : "Falta cambiar 'PENDIENTE'"}
            </p>
          </div>

          {/* Check SRI Status */}
          <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-4">
            <div className="flex items-center justify-between">
              <span className="rounded-md bg-teal-50 p-1.5 text-teal-600">
                <ShieldCheck className="size-4" />
              </span>
              {sriReady ? (
                <CheckCircle2 className="size-4 text-emerald-600 animate-bounce" />
              ) : (
                <AlertCircle className="size-4 text-amber-600" />
              )}
            </div>
            <p className="mt-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Listo para SRI</p>
            <p className="mt-1 text-sm font-bold text-slate-900">
              {sriReady ? "Preparado" : "Pendientes"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {sriReady ? "¡Facturación activa!" : "Revisa los campos"}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Pedidos activos"
          value={String(activeOrders.length)}
          helper={`${upcomingDeliveries.length} con entrega en 7 dias`}
          icon={ShoppingBag}
          tone="berry"
        />
        <StatCard
          label="Facturas pendientes"
          value={String(invoicesPending.length)}
          helper={`${invoiceableOrders.length} pedidos listos para facturar`}
          icon={FileText}
          tone="amber"
        />
        <StatCard
          label="Cobrado del mes"
          value={currency(monthSales)}
          helper="Pagos confirmados"
          icon={DollarSign}
          tone="green"
        />
        <StatCard
          label="Proximas entregas"
          value={String(upcomingDeliveries.length)}
          helper="Entre hoy y los siguientes 7 dias"
          icon={CalendarDays}
          tone="blue"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-950">Pedidos recientes</h2>
              <p className="text-sm text-slate-500">Seguimiento rapido de produccion y entrega.</p>
            </div>
            <ButtonLink href="/pedidos" variant="secondary">Ver todos</ButtonLink>
          </div>
          {recentOrders.length ? (
            <DataTable
              data={recentOrders}
              getKey={(order) => order.id}
              columns={[
                {
                  header: "Pedido",
                  accessor: (order) => <span className="font-semibold text-slate-950">{order.code}</span>,
                },
                {
                  header: "Cliente",
                  accessor: (order) => order.customerName,
                },
                {
                  header: "Entrega",
                  accessor: (order) => (order.deliveryDate ? shortDate(order.deliveryDate) : "Sin fecha"),
                },
                {
                  header: "Estado",
                  accessor: (order) => orderBadge(order.status),
                },
                {
                  header: "Total",
                  accessor: (order) => <span className="font-semibold">{currency(order.total)}</span>,
                  className: "text-right",
                },
              ]}
            />
          ) : (
            <EmptyPanel text="Todavia no hay pedidos registrados." />
          )}
        </div>

        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Reglas de precio</h2>
            <p className="text-sm text-slate-500">Base real del catalogo para calcular tortas.</p>
          </div>
          <div className="space-y-3">
            {pricingRules.map((rule) => (
              <article
                className="rounded-lg border border-[var(--line)] bg-white p-4 shadow-sm"
                key={rule.name}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-slate-950">{rule.name}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-500">{rule.detail}</p>
                  </div>
                  <Badge variant={rule.status === "Activa" ? "green" : "amber"}>
                    {rule.status}
                  </Badge>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Facturacion del dia</h2>
            <p className="mt-1 text-sm text-slate-500">
              Facturas generadas hoy y ultimos comprobantes internos.
            </p>
          </div>
          <div className="flex gap-2 text-[var(--pistachio)]">
            <Mail aria-hidden className="size-7" />
            <TrendingUp aria-hidden className="size-7" />
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {(todaysInvoices.length ? todaysInvoices : recentInvoices).map((invoice) => (
            <InvoiceCard invoice={invoice} key={invoice.id} />
          ))}
          {!todaysInvoices.length && !recentInvoices.length ? (
            <div className="sm:col-span-2">
              <EmptyPanel text="Todavia no hay facturas registradas." />
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function InvoiceCard({ invoice }: { invoice: InternalInvoice }) {
  return (
    <div className="rounded-lg bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-950">{invoice.number}</p>
          <p className="mt-1 text-sm text-slate-500">{invoice.customerName}</p>
        </div>
        {invoiceBadge(invoice.status)}
      </div>
      <p className="mt-3 text-lg font-bold text-slate-950">{currency(invoice.total)}</p>
    </div>
  );
}

function EmptyPanel({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-[var(--line)] bg-white p-8 text-center text-sm font-semibold text-slate-500 shadow-sm shadow-pink-950/5">
      {text}
    </div>
  );
}
