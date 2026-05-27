"use client";

import { useDeferredValue, useMemo, useState, useTransition } from "react";
import Image from "next/image";
import {
  CheckCircle2,
  Eye,
  FilePlus2,
  FileText,
  Mail,
  RefreshCw,
  Send,
  Search,
  ShieldCheck,
  Trash2,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  deleteInvoice,
  emitInvoiceToSri,
  generateInvoice as generateInvoiceAction,
  recordInvoiceEmail,
  retrySriQueue,
  updateInvoiceStatus as updateInvoiceStatusAction,
} from "@/app/actions/invoices";
import { invoiceStatusLabels } from "@/lib/invoices-catalog";
import { currency, shortDate } from "@/lib/utils";
import type { BillingCustomer } from "@/types/customer";
import type { InvoiceEmailLog } from "@/types/email";
import type {
  InternalInvoice,
  InternalInvoiceStatus,
} from "@/types/invoice";
import type { CakeOrder } from "@/types/order";
import type { BusinessSettingsForm } from "@/types/settings";

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function statusVariant(status: InternalInvoiceStatus) {
  if (status === "AUTORIZADA" || status === "ENVIADA") return "green";
  if (status === "EMITIDA" || status === "FIRMADA" || status === "ENVIADA_SRI" || status === "RECIBIDA") return "blue";
  if (status === "ANULADA" || status === "DEVUELTA" || status === "NO_AUTORIZADA" || status === "ERROR_CONEXION") return "default";
  return "amber";
}

function sriStatusText(invoice: InternalInvoice, settings: BusinessSettingsForm) {
  if (invoice.status === "AUTORIZADA") return "Autorizada SRI";
  if (invoice.status === "ENVIADA_SRI" || invoice.status === "RECIBIDA") return "Enviada SRI";
  if (invoice.status === "FIRMADA") return "Firmada";
  if (invoice.hasSriXml) {
    return settings.sriEnvironment === "PRUEBAS" ? "XML de prueba local" : "XML generado";
  }
  if (invoice.sriJob?.status === "ERROR") return "Revisar configuracion";
  return "Pendiente";
}

function sriHelpText(settings: BusinessSettingsForm) {
  if (!settings.sriEnabled) {
    return "La integracion SRI esta desactivada. Las facturas quedan como control interno.";
  }

  if (settings.sriEnvironment === "PRUEBAS") {
    return "Ambiente de pruebas: genera XML local de simulacion. No transmite al SRI real ni usa la firma electronica.";
  }

  return "Ambiente de produccion: requiere firma valida en este servidor antes de firmar comprobantes reales.";
}

function errorText(error: unknown) {
  if (error instanceof Error) {
    if (error.message.includes("Server Components render") || error.message.includes("digest")) {
      return "No se pudo completar la accion en el servidor. Revisa la configuracion y vuelve a intentar.";
    }
    return error.message;
  }

  return "No se pudo completar la accion. Revisa los datos.";
}

export function InvoiceManager({
  initialCustomers,
  initialEmailLogs,
  initialInvoices,
  initialOrders,
  initialSettings,
}: {
  initialCustomers: BillingCustomer[];
  initialEmailLogs: InvoiceEmailLog[];
  initialInvoices: InternalInvoice[];
  initialOrders: CakeOrder[];
  initialSettings: BusinessSettingsForm;
}) {
  const [orders] = useState<CakeOrder[]>(initialOrders);
  const [customers] = useState<BillingCustomer[]>(initialCustomers);
  const [invoices, setInvoices] = useState<InternalInvoice[]>(initialInvoices);
  const [settings] = useState<BusinessSettingsForm>(initialSettings);
  const [emailLogs, setEmailLogs] = useState<InvoiceEmailLog[]>(initialEmailLogs);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [query, setQuery] = useState("");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const deferredQuery = useDeferredValue(query);

  const invoicedOrderIds = new Set(invoices.map((invoice) => invoice.orderId));
  const invoiceableOrders = orders.filter(
    (order) =>
      ["CONFIRMADO", "LISTO", "ENTREGADO"].includes(order.status) &&
      !invoicedOrderIds.has(order.id),
  );

  const selectedOrder = invoiceableOrders.find((order) => order.id === selectedOrderId);
  const selectedCustomer = selectedOrder
    ? customers.find((customer) => customer.id === selectedOrder.customerId)
    : undefined;

  const filteredInvoices = useMemo(() => {
    const cleanQuery = normalize(deferredQuery);
    if (!cleanQuery) return invoices;

    return invoices.filter((invoice) =>
      [
        invoice.number,
        invoice.orderCode,
        invoice.customerName,
        invoice.customerDocument,
        invoice.status,
      ]
        .map(normalize)
        .some((value) => value.includes(cleanQuery)),
    );
  }, [invoices, deferredQuery]);

  const selectedInvoice = selectedInvoiceId
    ? invoices.find((invoice) => invoice.id === selectedInvoiceId)
    : filteredInvoices[0];

  const emittedCount = invoices.filter((invoice) =>
    ["EMITIDA", "ENVIADA"].includes(invoice.status),
  ).length;
  const sentCount = invoices.filter((invoice) => invoice.status === "ENVIADA").length;

  function generateInvoice() {
    if (!selectedOrder) {
      setMessage({ type: "error", text: "Selecciona un pedido confirmado, listo o entregado." });
      return;
    }

    startTransition(async () => {
      try {
        const result = await generateInvoiceAction(selectedOrder.id);
        setInvoices(result.invoices);
        setSelectedInvoiceId(result.selectedInvoiceId);
        setSelectedOrderId("");
        setMessage({ type: "success", text: "Factura interna generada correctamente." });
      } catch (error) {
        setMessage({ type: "error", text: errorText(error) });
      }
    });
  }

  function updateInvoiceStatus(id: string, status: InternalInvoiceStatus) {
    startTransition(async () => {
      try {
        const savedInvoices = await updateInvoiceStatusAction(id, status);
        setInvoices(savedInvoices);
        setMessage({ type: "success", text: "Estado de factura actualizado." });
      } catch (error) {
        setMessage({ type: "error", text: errorText(error) });
      }
    });
  }

  function removeInvoice(id: string) {
    startTransition(async () => {
      try {
        const savedInvoices = await deleteInvoice(id);
        setInvoices(savedInvoices);
        if (selectedInvoiceId === id) setSelectedInvoiceId(null);
        setMessage({ type: "success", text: "Factura eliminada o anulada segun sus relaciones." });
      } catch (error) {
        setMessage({ type: "error", text: errorText(error) });
      }
    });
  }

  function emitSri(id: string) {
    startTransition(async () => {
      try {
        const savedInvoices = await emitInvoiceToSri(id);
        setInvoices(savedInvoices.invoices);
        setMessage({ type: savedInvoices.ok ? "success" : "error", text: savedInvoices.message });
      } catch (error) {
        setMessage({ type: "error", text: errorText(error) });
      }
    });
  }

  function retryQueue() {
    startTransition(async () => {
      try {
        const savedInvoices = await retrySriQueue();
        setInvoices(savedInvoices.invoices);
        setMessage({ type: savedInvoices.ok ? "success" : "error", text: savedInvoices.message });
      } catch (error) {
        setMessage({ type: "error", text: errorText(error) });
      }
    });
  }

  function sendInvoiceEmail(invoice: InternalInvoice) {
    const fromAddress = settings.emailFromAddress || settings.email || "pendiente@emily.local";
    const toAddress = invoice.customerEmail;

    if (!toAddress) return;

    const subject = `Factura ${invoice.number} - ${settings.tradeName || settings.businessName}`;
    const body = buildInvoiceEmailBody(invoice, settings);
    const emailLog: InvoiceEmailLog = {
      id: createId("email"),
      invoiceId: invoice.id,
      invoiceNumber: invoice.number,
      to: toAddress,
      from: `${settings.emailFromName || settings.businessName} <${fromAddress}>`,
      subject,
      body,
      status: "ENVIADO",
      sentAt: new Date().toISOString(),
    };

    startTransition(async () => {
      try {
        const result = await recordInvoiceEmail(emailLog);
        setEmailLogs((current) => [result.log, ...current]);
        setInvoices(result.invoices);
        setMessage({ type: "success", text: "Comprobante electrónico (PDF y XML) enviado con éxito al correo del cliente." });
      } catch (error) {
        setMessage({ type: "error", text: errorText(error) });
      }
    });
  }

  return (
    <div className="space-y-6">
      {message ? <FormMessage message={message} /> : null}

      <section className="grid gap-4 md:grid-cols-4">
        <SummaryCard label="Facturas" value={invoices.length} />
        <SummaryCard label="Emitidas" value={emittedCount} />
        <SummaryCard label="Enviadas" value={sentCount} />
        <SummaryCard label="Pedidos por facturar" value={invoiceableOrders.length} />
      </section>

      <section className="rounded-lg border border-pink-100 bg-pink-50 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-bold text-[var(--chocolate)]">Cola SRI inmediata</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {sriHelpText(settings)}
            </p>
          </div>
          <Button disabled={isPending} onClick={retryQueue} variant="secondary">
            <RefreshCw aria-hidden className="size-4" />
            Reintentar cola
          </Button>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <div className="space-y-5">
        <article
          className="rounded-lg border border-[var(--line)] bg-white shadow-sm shadow-pink-950/5"
          id="generar-factura"
        >
          <div className="border-b border-[var(--line)] p-5">
            <h2 className="text-lg font-bold text-[var(--chocolate)]">Generar factura</h2>
            <p className="mt-1 text-sm text-slate-500">
              Selecciona un pedido confirmado, listo o entregado.
            </p>
          </div>

          <div className="space-y-4 p-5">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Pedido</span>
              <select
                className="mt-2 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--berry)]"
                onChange={(event) => setSelectedOrderId(event.target.value)}
                value={selectedOrderId}
              >
                <option value="">Seleccionar pedido</option>
                {invoiceableOrders.map((order) => (
                  <option key={order.id} value={order.id}>
                    {order.code} - {order.customerName} - {currency(order.total)}
                  </option>
                ))}
              </select>
            </label>

            {selectedOrder ? (
              <div className="rounded-lg border border-pink-100 bg-pink-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-[var(--chocolate)]">{selectedOrder.code}</p>
                    <p className="mt-1 text-sm text-slate-600">{selectedOrder.customerName}</p>
                  </div>
                  <Badge variant="berry">{currency(selectedOrder.total)}</Badge>
                </div>
                <div className="mt-4 space-y-2 text-sm text-slate-600">
                  <p><strong>Documento:</strong> {selectedOrder.customerDocument}</p>
                  <p><strong>Correo:</strong> {selectedCustomer?.email || "Sin correo"}</p>
                  <p><strong>Direccion:</strong> {selectedCustomer?.address || selectedOrder.deliveryAddress || "Sin direccion"}</p>
                  <p><strong>Detalle:</strong> {selectedOrder.portionsLabel}, {selectedOrder.flavorName}, {selectedOrder.modelName}</p>
                </div>
              </div>
            ) : (
              <div className="rounded-lg bg-[var(--cream)] p-4 text-sm leading-6 text-slate-600">
                Si no aparece ningun pedido, cambia su estado en Pedidos a Confirmado, Listo o Entregado.
              </div>
            )}

            <Button className="w-full" disabled={!selectedOrder || isPending} onClick={generateInvoice}>
              <FilePlus2 aria-hidden className="size-4" />
              {isPending ? "Generando..." : "Generar factura interna"}
            </Button>
          </div>
        </article>

        {selectedInvoice ? (
          <article className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm shadow-pink-950/5">
            <p className="text-sm font-bold uppercase text-[var(--berry)]">Factura seleccionada</p>
            <h2 className="mt-1 text-lg font-bold text-[var(--chocolate)]">{selectedInvoice.number}</h2>
            <div className="mt-3 space-y-2 text-sm text-slate-600">
              <p><strong>Cliente:</strong> {selectedInvoice.customerName}</p>
              <p><strong>Total:</strong> {currency(selectedInvoice.total)}</p>
              <p><strong>Correo:</strong> {selectedInvoice.customerEmail || "Sin correo"}</p>
              <p><strong>SRI:</strong> {sriStatusText(selectedInvoice, settings)}</p>
            </div>
            {selectedInvoice.sriJob?.lastError ? (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {selectedInvoice.sriJob.lastError}
              </p>
            ) : null}
            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              <Button disabled={isPending} onClick={() => emitSri(selectedInvoice.id)} variant="secondary">
                <ShieldCheck aria-hidden className="size-4" />
                {settings.sriEnvironment === "PRODUCCION" ? "Procesar SRI" : "Generar XML prueba"}
              </Button>
              <Button
                disabled={!selectedInvoice.customerEmail || isPending}
                onClick={() => sendInvoiceEmail(selectedInvoice)}
                title={selectedInvoice.customerEmail ? "Enviar correo al cliente" : "El cliente no tiene correo registrado"}
              >
                <Send aria-hidden className="size-4" />
                Enviar correo
              </Button>
            </div>
          </article>
        ) : null}
        </div>

        <article className="rounded-lg border border-[var(--line)] bg-white shadow-sm shadow-pink-950/5">
          <div className="flex flex-col gap-4 border-b border-[var(--line)] p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-[var(--chocolate)]">Pila de facturas</h2>
              <p className="mt-1 text-sm text-slate-500">
                Selecciona una factura y trabaja sus acciones sin perderte en una tabla larga.
              </p>
            </div>
            <label className="flex min-h-10 items-center gap-2 rounded-lg border border-[var(--line)] bg-white px-3 text-sm text-slate-500 shadow-sm lg:w-80">
              <Search aria-hidden className="size-4" />
              <input
                aria-label="Buscar factura"
                className="min-w-0 flex-1 outline-none"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar factura"
                value={query}
              />
            </label>
          </div>

          {filteredInvoices.length ? (
            <div className="max-h-[640px] divide-y divide-[var(--line)] overflow-y-auto">
              {filteredInvoices.map((invoice) => (
                <InvoiceRow
                  invoice={invoice}
                  key={invoice.id}
                  onRemove={() => removeInvoice(invoice.id)}
                  onSelect={() => setSelectedInvoiceId(invoice.id)}
                  onSriEmit={() => emitSri(invoice.id)}
                  onStatusChange={(status) => updateInvoiceStatus(invoice.id, status)}
                  pending={isPending}
                  selected={selectedInvoice?.id === invoice.id}
                  settings={settings}
                />
              ))}
            </div>
          ) : (
            <div className="p-10 text-center">
              <FileText aria-hidden className="mx-auto size-10 text-slate-300" />
              <p className="mt-3 font-semibold text-slate-700">Todavia no hay facturas.</p>
              <p className="mt-1 text-sm text-slate-500">
                Genera una factura desde un pedido confirmado.
              </p>
            </div>
          )}
        </article>
      </section>

      {selectedInvoice ? (
        <InvoicePreview
          emailLogs={emailLogs.filter((log) => log.invoiceId === selectedInvoice.id)}
          invoice={selectedInvoice}
          isPending={isPending}
          onSendEmail={() => sendInvoiceEmail(selectedInvoice)}
          settings={settings}
        />
      ) : null}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-lg border border-[var(--line)] bg-white p-4 shadow-sm shadow-pink-950/5">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-[var(--chocolate)]">{value}</p>
    </article>
  );
}

function FormMessage({
  message,
}: {
  message: { type: "error" | "success"; text: string };
}) {
  return (
    <div
      aria-live={message.type === "error" ? "assertive" : "polite"}
      className={
        message.type === "error"
          ? "rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700"
          : "rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700"
      }
      role={message.type === "error" ? "alert" : "status"}
    >
      {message.text}
    </div>
  );
}

function InvoiceRow({
  invoice,
  selected,
  onSelect,
  onRemove,
  onSriEmit,
  onStatusChange,
  pending,
  settings,
}: {
  invoice: InternalInvoice;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onSriEmit: () => void;
  onStatusChange: (status: InternalInvoiceStatus) => void;
  pending: boolean;
  settings: BusinessSettingsForm;
}) {
  return (
    <div className={selected ? "perf-row bg-pink-50/50 p-5" : "perf-row p-5"}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold text-slate-950">{invoice.number}</h3>
            <Badge variant={statusVariant(invoice.status)}>{invoiceStatusLabels[invoice.status]}</Badge>
          </div>
          <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
            <p><strong>Pedido:</strong> {invoice.orderCode}</p>
            <p><strong>Fecha:</strong> {shortDate(invoice.issuedAt)}</p>
            <p><strong>Cliente:</strong> {invoice.customerName}</p>
            <p><strong>Total:</strong> {currency(invoice.total)}</p>
            <p><strong>SRI:</strong> {sriStatusText(invoice, settings)}</p>
            <p><strong>Intentos:</strong> {invoice.sriJob?.attempts ?? 0}</p>
            <p><strong>XML:</strong> {invoice.hasSriXml ? "Generado" : "Pendiente"}</p>
            <p><strong>Clave acceso:</strong> {invoice.sriAccessKey ? `${invoice.sriAccessKey.slice(0, 12)}...` : "Pendiente"}</p>
          </div>
          {invoice.sriJob?.lastError ? (
            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {invoice.sriJob.lastError}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <select
            className="min-h-10 rounded-lg border border-[var(--line)] bg-white px-3 text-sm font-semibold outline-none focus:border-[var(--berry)]"
            disabled={pending}
            onChange={(event) => onStatusChange(event.target.value as InternalInvoiceStatus)}
            value={invoice.status}
          >
            {Object.entries(invoiceStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <IconButton disabled={pending} label="Ver factura" onClick={onSelect}>
            <Eye aria-hidden className="size-4" />
          </IconButton>
          <IconButton disabled={pending || invoice.status === "AUTORIZADA" || invoice.status === "ANULADA"} label="Emitir al SRI" onClick={onSriEmit}>
            <ShieldCheck aria-hidden className="size-4" />
          </IconButton>
          <IconButton disabled={pending} label="Eliminar factura" onClick={onRemove}>
            <Trash2 aria-hidden className="size-4" />
          </IconButton>
        </div>
      </div>
    </div>
  );
}

function InvoicePreview({
  emailLogs,
  invoice,
  isPending,
  onSendEmail,
  settings,
}: {
  emailLogs: InvoiceEmailLog[];
  invoice: InternalInvoice;
  isPending: boolean;
  onSendEmail: () => void;
  settings: BusinessSettingsForm;
}) {
  function printInvoice() {
    window.print();
  }

  const canSendEmail = Boolean(invoice.customerEmail);
  const emailSubject = `Factura ${invoice.number} - ${settings.tradeName || settings.businessName}`;
  const emailBody = buildInvoiceEmailBody(invoice, settings);

  return (
    <section className="invoice-print-area rounded-lg border border-[var(--line)] bg-white shadow-sm shadow-pink-950/5">
      <div className="no-print flex flex-col gap-4 border-b border-[var(--line)] p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-bold uppercase text-[var(--berry)]">Vista de factura</p>
          <h2 className="mt-1 text-xl font-bold text-[var(--chocolate)]">{invoice.number}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={printInvoice} title="Abrir impresion para guardar como PDF">
            <FileText aria-hidden className="size-4" />
            Preparar PDF
          </Button>
          <Button
            disabled={!canSendEmail || isPending}
            onClick={onSendEmail}
            title={canSendEmail ? "Enviar correo real al cliente con PDF y XML" : "El cliente no tiene correo registrado"}
          >
            <Send aria-hidden className="size-4" />
            {isPending ? "Enviando..." : "Enviar correo"}
          </Button>
        </div>
      </div>

      <div className="p-5 print:p-0">
        <div className="hidden print:block">
          <div className="mb-6 flex items-start justify-between gap-6 border-b border-slate-200 pb-5">
            <div className="flex items-start gap-4">
              {settings.logoPath ? (
                <Image
                  alt="Logo empresa"
                  className="h-20 w-20 object-contain"
                  src={settings.logoPath}
                  width={80}
                  height={80}
                />
              ) : null}
              <div>
                <h1 className="text-2xl font-bold text-[var(--chocolate)]">
                  {settings.tradeName || settings.businessName}
                </h1>
                <p className="mt-1 text-sm font-semibold text-slate-700">
                  {settings.businessName}
                </p>
                <p className="text-sm text-slate-600">RUC: {settings.ruc || "Pendiente"}</p>
                <p className="text-sm text-slate-600">
                  {settings.address || "Direccion pendiente"}
                </p>
                <p className="text-sm text-slate-600">
                  {[settings.city, settings.province].filter(Boolean).join(", ")}
                </p>
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 p-4 text-right">
              <p className="text-xs font-bold uppercase text-slate-500">Factura interna</p>
              <p className="mt-1 text-lg font-bold text-slate-950">{invoice.number}</p>
              <p className="mt-1 text-sm text-slate-600">{shortDate(invoice.issuedAt)}</p>
              <p className={`mt-2 text-xs font-semibold ${
                ["FIRMADA", "ENVIADA_SRI", "RECIBIDA", "AUTORIZADA"].includes(invoice.status)
                  ? "text-emerald-700"
                  : "text-amber-700"
              }`}>
                {["FIRMADA", "ENVIADA_SRI", "RECIBIDA", "AUTORIZADA"].includes(invoice.status)
                  ? "Documento firmado para SRI"
                  : settings.sriEnvironment === "PRUEBAS"
                    ? "Ambiente de pruebas - XML local"
                    : "Pendiente de firma SRI"}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1fr_340px] print:block">
        <div>
          <div className="grid gap-4 rounded-lg bg-[var(--cream)] p-4 md:grid-cols-2 print:border print:border-slate-200 print:bg-white">
            <div>
              <p className="text-xs font-bold uppercase text-slate-500">Cliente</p>
              <p className="mt-1 font-bold text-slate-950">{invoice.customerName}</p>
              <p className="text-sm text-slate-600">{invoice.customerDocument}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-slate-500">Contacto</p>
              <p className="mt-1 text-sm text-slate-600">{invoice.customerEmail || "Sin correo"}</p>
              <p className="text-sm text-slate-600">{invoice.customerPhone || "Sin telefono"}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-xs font-bold uppercase text-slate-500">Direccion</p>
              <p className="mt-1 text-sm text-slate-600">{invoice.customerAddress || "Sin direccion"}</p>
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-lg border border-[var(--line)] print:rounded-none">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-[var(--cream)] text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Detalle</th>
                  <th className="px-4 py-3 text-center">Cant.</th>
                  <th className="px-4 py-3 text-right">P. Unit.</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {invoice.lines.map((line) => (
                  <tr key={line.id}>
                    <td className="px-4 py-3">{line.description}</td>
                    <td className="px-4 py-3 text-center">{line.quantity}</td>
                    <td className="px-4 py-3 text-right">{currency(line.unitPrice)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{currency(line.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="rounded-lg border border-pink-100 bg-pink-50 p-5 print:ml-auto print:mt-5 print:w-80 print:bg-white">
          <h3 className="font-bold text-[var(--chocolate)]">Resumen</h3>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <strong>{currency(invoice.subtotal)}</strong>
            </div>
            <div className="flex justify-between">
              <span>IVA 15%</span>
              <strong>{currency(invoice.tax)}</strong>
            </div>
            <div className="flex justify-between border-t border-pink-200 pt-3 text-lg text-[var(--chocolate)]">
              <span className="font-bold">Total</span>
              <strong>{currency(invoice.total)}</strong>
            </div>
          </div>

          <div className="no-print mt-5 rounded-lg bg-white p-4 text-sm text-slate-600">
            <div className="flex items-center gap-2 font-bold text-slate-800">
              {invoice.status === "ENVIADA" ? (
                <CheckCircle2 aria-hidden className="size-4 text-emerald-600" />
              ) : (
                <XCircle aria-hidden className="size-4 text-amber-600" />
              )}
              Estado: {invoiceStatusLabels[invoice.status]}
            </div>
            <p className="mt-2">
              {sriStatusText(invoice, settings)}
            </p>
          </div>
        </aside>
        </div>

        <div className="no-print mt-5 grid gap-5 xl:grid-cols-[1fr_340px]">
          <section className="rounded-lg border border-[var(--line)] bg-white p-5">
            <div className="flex items-start gap-3">
              <span className="rounded-lg bg-pink-50 p-2 text-[var(--berry)]">
                <Mail aria-hidden className="size-5" />
              </span>
              <div>
                <h3 className="font-bold text-[var(--chocolate)]">Vista previa del correo</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Se enviará una plantilla HTML premium con los documentos adjuntos (PDF y XML).
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-lg bg-[var(--cream)] p-4 text-sm">
              <p><strong>Para:</strong> {invoice.customerEmail || "Cliente sin correo"}</p>
              <p><strong>Asunto:</strong> {emailSubject}</p>
              <div className="mt-3 whitespace-pre-line rounded-lg bg-white p-3 text-slate-600">
                {emailBody}
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-[var(--line)] bg-white p-5">
            <h3 className="font-bold text-[var(--chocolate)]">Historial de envios</h3>
            {emailLogs.length ? (
              <div className="mt-4 space-y-3">
                 {emailLogs.map((log) => (
                  <div className="rounded-lg bg-slate-50 p-3 text-sm" key={log.id}>
                    <div className="flex items-center justify-between gap-2">
                      <span className={
                        log.status === "ENVIADO"
                          ? "inline-flex items-center rounded bg-emerald-50 px-1.5 py-0.5 text-xs font-semibold text-emerald-700"
                          : log.status === "ERROR"
                          ? "inline-flex items-center rounded bg-rose-50 px-1.5 py-0.5 text-xs font-semibold text-rose-700"
                          : "inline-flex items-center rounded bg-amber-50 px-1.5 py-0.5 text-xs font-semibold text-amber-700"
                      }>
                        {log.status === "ENVIADO" ? "ENVIADO" : log.status === "ERROR" ? "FALLIDO" : "SIMULADO"}
                      </span>
                      <span className="text-xs text-slate-500">{shortDate(log.sentAt)}</span>
                    </div>
                    <p className="mt-2 text-slate-700"><strong>Para:</strong> {log.to}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500">
                Esta factura aun no tiene envios simulados.
              </p>
            )}
          </section>
        </div>

        <div className="mt-8 hidden border-t border-slate-200 pt-4 text-xs text-slate-500 print:block">
          <p>
            Documento interno generado por {settings.tradeName || settings.businessName}. Este
            comprobante queda preparado para PDF; la autorizacion electronica SRI se conectara en
            la siguiente fase.
          </p>
        </div>
      </div>
    </section>
  );
}

function buildInvoiceEmailBody(invoice: InternalInvoice, settings: BusinessSettingsForm) {
  const businessName = settings.tradeName || settings.businessName;

  return [
    `Hola ${invoice.customerName},`,
    "",
    `Adjuntamos la factura ${invoice.number} correspondiente a tu pedido ${invoice.orderCode}.`,
    "",
    `Total: ${currency(invoice.total)}`,
    `Estado: ${invoiceStatusLabels[invoice.status]}`,
    "",
    "Gracias por tu compra.",
    businessName,
    settings.phone ? `Telefono: ${settings.phone}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      aria-label={label}
      className="focus-ring grid size-10 place-items-center rounded-lg border border-[var(--line)] bg-white text-slate-600 hover:bg-pink-50 hover:text-[var(--berry)]"
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}
