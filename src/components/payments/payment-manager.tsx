"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Banknote,
  CreditCard,
  Pencil,
  Plus,
  Search,
  Trash2,
  WalletCards,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  deletePayment,
  savePayment as savePaymentAction,
  updatePaymentStatus as updatePaymentStatusAction,
} from "@/app/actions/payments";
import {
  paymentMethodLabels,
  paymentStatusLabels,
} from "@/lib/payments-catalog";
import { currency, shortDate } from "@/lib/utils";
import type { InternalInvoice } from "@/types/invoice";
import type { CakeOrder } from "@/types/order";
import type {
  PaymentForm,
  PaymentMethod,
  PaymentRecord,
  PaymentStatus,
  PaymentTargetType,
} from "@/types/payment";

const ordersStorageKey = "emily-orders-v1";
const invoicesStorageKey = "emily-invoices-v1";
const paymentsStorageKey = "emily-payments-v1";

const emptyForm: PaymentForm = {
  targetKey: "",
  amount: "",
  method: "EFECTIVO",
  status: "CONFIRMADO",
  reference: "",
  paidAt: "",
  notes: "",
};

type PaymentTarget = {
  key: string;
  targetType: PaymentTargetType;
  targetId: string;
  targetCode: string;
  orderId: string;
  customerName: string;
  total: number;
};

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function createPaymentCode(existingPayments: PaymentRecord[]) {
  return `PAG-${String(existingPayments.length + 1).padStart(4, "0")}`;
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function statusVariant(status: PaymentStatus) {
  if (status === "CONFIRMADO") return "green";
  if (status === "ANULADO") return "default";
  return "amber";
}

function methodIcon(method: PaymentMethod) {
  if (method === "EFECTIVO") return Banknote;
  if (method === "TARJETA") return CreditCard;
  return WalletCards;
}

export function PaymentManager({
  initialInvoices,
  initialOrders,
  initialPayments,
}: {
  initialInvoices: InternalInvoice[];
  initialOrders: CakeOrder[];
  initialPayments: PaymentRecord[];
}) {
  const [orders] = useState<CakeOrder[]>(initialOrders);
  const [invoices] = useState<InternalInvoice[]>(initialInvoices);
  const [payments, setPayments] = useState<PaymentRecord[]>(initialPayments);
  const [form, setForm] = useState<PaymentForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    window.localStorage.setItem(ordersStorageKey, JSON.stringify(orders));
    window.localStorage.setItem(invoicesStorageKey, JSON.stringify(invoices));
    window.localStorage.setItem(paymentsStorageKey, JSON.stringify(payments));
  }, [invoices, orders, payments]);

  const editingPayment = editingId ? payments.find((payment) => payment.id === editingId) : undefined;

  const targets = useMemo<PaymentTarget[]>(() => {
    const invoicedOrderIds = new Set(invoices.map((invoice) => invoice.orderId));
    const invoiceTargets = invoices
      .filter((invoice) => invoice.status !== "ANULADA")
      .map((invoice) => ({
        key: `INVOICE:${invoice.id}`,
        targetType: "INVOICE" as const,
        targetId: invoice.id,
        targetCode: invoice.number,
        orderId: invoice.orderId,
        customerName: invoice.customerName,
        total: invoice.total,
      }));

    const orderTargets = orders
      .filter((order) => order.status !== "CANCELADO" && !invoicedOrderIds.has(order.id))
      .map((order) => ({
        key: `ORDER:${order.id}`,
        targetType: "ORDER" as const,
        targetId: order.id,
        targetCode: order.code,
        orderId: order.id,
        customerName: order.customerName,
        total: order.total,
      }));

    const baseTargets = [...invoiceTargets, ...orderTargets];

    if (editingPayment && !baseTargets.some((target) => target.key === `${editingPayment.targetType}:${editingPayment.targetId}`)) {
      const order = orders.find((item) => item.id === editingPayment.orderId);
      return [
        ...baseTargets,
        {
          key: `${editingPayment.targetType}:${editingPayment.targetId}`,
          targetType: editingPayment.targetType,
          targetId: editingPayment.targetId,
          targetCode: editingPayment.targetCode,
          orderId: editingPayment.orderId,
          customerName: editingPayment.customerName,
          total: order?.total ?? editingPayment.amount,
        },
      ];
    }

    return baseTargets;
  }, [editingPayment, invoices, orders]);

  const selectedTarget = targets.find((target) => target.key === form.targetKey);

  const confirmedPayments = payments.filter((payment) => payment.status === "CONFIRMADO");
  const totalConfirmed = roundMoney(
    confirmedPayments.reduce((total, payment) => total + payment.amount, 0),
  );
  const totalPending = roundMoney(
    payments
      .filter((payment) => payment.status === "PENDIENTE")
      .reduce((total, payment) => total + payment.amount, 0),
  );

  const targetPaid = selectedTarget
    ? roundMoney(
        confirmedPayments
          .filter((payment) => payment.targetId === selectedTarget.targetId && payment.id !== editingId)
          .reduce((total, payment) => total + payment.amount, 0),
      )
    : 0;
  const targetBalance = selectedTarget
    ? roundMoney(selectedTarget.total - targetPaid)
    : 0;

  const filteredPayments = useMemo(() => {
    const cleanQuery = normalize(query);
    if (!cleanQuery) return payments;

    return payments.filter((payment) =>
      [
        payment.code,
        payment.targetCode,
        payment.customerName,
        payment.method,
        payment.status,
        payment.reference,
      ]
        .map(normalize)
        .some((value) => value.includes(cleanQuery)),
    );
  }, [payments, query]);

  function setField<K extends keyof PaymentForm>(key: K, value: PaymentForm[K]) {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === "targetKey") {
        const target = targets.find((item) => item.key === value);
        if (target) {
          const paid = confirmedPayments
            .filter((payment) => payment.targetId === target.targetId)
            .reduce((total, payment) => total + payment.amount, 0);
          next.amount = String(Math.max(roundMoney(target.total - paid), 0));
        }
      }
      return next;
    });
  }

  function clearForm() {
    setForm(emptyForm);
    setEditingId(null);
    setMessage(null);
  }

  function errorText(error: unknown) {
    return error instanceof Error ? error.message : "No se pudo guardar el pago. Revisa los datos.";
  }

  function getValidationMessage() {
    const amount = Number(form.amount || "0");
    if (!selectedTarget) return "Selecciona el pedido o factura que recibira el pago.";
    if (!Number.isFinite(amount) || amount <= 0) return "Ingresa un monto mayor a cero.";
    if (amount > targetBalance) return `El monto supera el saldo disponible (${currency(targetBalance)}).`;
    if (["TRANSFERENCIA", "DEPOSITO", "TARJETA"].includes(form.method) && !form.reference.trim()) {
      return "Ingresa una referencia para transferencia, deposito o tarjeta.";
    }
    return "";
  }

  function savePayment() {
    const target = selectedTarget;
    const amount = Number(form.amount || "0");
    const validationMessage = getValidationMessage();
    if (!target || validationMessage) {
      setMessage({ type: "error", text: validationMessage || "Selecciona el documento del pago." });
      return;
    }

    const existingPayment = editingId
      ? payments.find((payment) => payment.id === editingId)
      : undefined;

    const payload: PaymentRecord = {
      id: editingId ?? createId("payment"),
      code: existingPayment?.code ?? createPaymentCode(payments),
      targetType: target.targetType,
      targetId: target.targetId,
      targetCode: target.targetCode,
      orderId: target.orderId,
      customerName: target.customerName,
      amount: roundMoney(amount),
      method: form.method,
      status: form.status,
      reference: form.reference.trim(),
      paidAt: form.paidAt || new Date().toISOString(),
      notes: form.notes.trim(),
    };

    startTransition(async () => {
      try {
        const savedPayments = await savePaymentAction(payload);
        setPayments(savedPayments);
        clearForm();
        setMessage({ type: "success", text: "Pago guardado correctamente." });
      } catch (error) {
        setMessage({ type: "error", text: errorText(error) });
      }
    });
  }

  function editPayment(payment: PaymentRecord) {
    setEditingId(payment.id);
    setForm({
      targetKey: `${payment.targetType}:${payment.targetId}`,
      amount: String(payment.amount),
      method: payment.method,
      status: payment.status,
      reference: payment.reference,
      paidAt: payment.paidAt.slice(0, 10),
      notes: payment.notes,
    });
  }

  function removePayment(id: string) {
    startTransition(async () => {
      try {
        const savedPayments = await deletePayment(id);
        setPayments(savedPayments);
        if (editingId === id) clearForm();
        setMessage({ type: "success", text: "Pago eliminado." });
      } catch (error) {
        setMessage({ type: "error", text: errorText(error) });
      }
    });
  }

  function updatePaymentStatus(id: string, status: PaymentStatus) {
    startTransition(async () => {
      try {
        const savedPayments = await updatePaymentStatusAction(id, status);
        setPayments(savedPayments);
        setMessage({ type: "success", text: "Estado del pago actualizado." });
      } catch (error) {
        setMessage({ type: "error", text: errorText(error) });
      }
    });
  }

  const openBalance = roundMoney(
    targets.reduce((total, target) => {
      const paid = confirmedPayments
        .filter((payment) => payment.targetId === target.targetId)
        .reduce((sum, payment) => sum + payment.amount, 0);
      return total + Math.max(target.total - paid, 0);
    }, 0),
  );

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-4">
        <SummaryCard label="Cobrado" value={currency(totalConfirmed)} />
        <SummaryCard label="Pendiente por confirmar" value={currency(totalPending)} />
        <SummaryCard label="Saldo abierto" value={currency(openBalance)} />
        <SummaryCard label="Pagos registrados" value={String(payments.length)} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <article
          className="rounded-lg border border-[var(--line)] bg-white shadow-sm shadow-pink-950/5"
          id="registrar-pago"
        >
          <div className="border-b border-[var(--line)] p-5">
            <h2 className="text-lg font-bold text-[var(--chocolate)]">
              {editingId ? "Editar pago" : "Registrar pago"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Registra pagos completos o abonos de pedidos y facturas.
            </p>
          </div>

          <form className="space-y-4 p-5" onSubmit={(event) => event.preventDefault()}>
            {message ? <FormMessage message={message} /> : null}

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Pedido o factura</span>
              <select
                className="mt-2 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--berry)]"
                onChange={(event) => setField("targetKey", event.target.value)}
                value={form.targetKey}
              >
                <option value="">Seleccionar</option>
                {targets.map((target) => (
                  <option key={target.key} value={target.key}>
                    {target.targetCode} - {target.customerName} - {currency(target.total)}
                  </option>
                ))}
              </select>
            </label>

            {selectedTarget ? (
              <div className="rounded-lg bg-pink-50 p-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Total</span>
                  <strong>{currency(selectedTarget.total)}</strong>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Pagado</span>
                  <strong>{currency(targetPaid)}</strong>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-pink-200 pt-2 text-[var(--chocolate)]">
                  <span className="font-bold">Saldo</span>
                  <strong>{currency(targetBalance)}</strong>
                </div>
              </div>
            ) : (
              <div className="rounded-lg bg-[var(--cream)] p-4 text-sm leading-6 text-slate-600">
                Si no aparece nada, crea un pedido o genera una factura primero.
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Monto</span>
                <input
                  className="mt-2 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--berry)]"
                  min="0"
                  onChange={(event) => setField("amount", event.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  type="number"
                  value={form.amount}
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Fecha</span>
                <input
                  className="mt-2 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--berry)]"
                  onChange={(event) => setField("paidAt", event.target.value)}
                  type="date"
                  value={form.paidAt}
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Metodo</span>
                <select
                  className="mt-2 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--berry)]"
                  onChange={(event) => setField("method", event.target.value as PaymentMethod)}
                  value={form.method}
                >
                  {Object.entries(paymentMethodLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Estado</span>
                <select
                  className="mt-2 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--berry)]"
                  onChange={(event) => setField("status", event.target.value as PaymentStatus)}
                  value={form.status}
                >
                  {Object.entries(paymentStatusLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Referencia</span>
              <input
                className="mt-2 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--berry)]"
                onChange={(event) => setField("reference", event.target.value)}
                placeholder="Numero de transferencia, recibo o nota"
                value={form.reference}
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Notas</span>
              <textarea
                className="mt-2 min-h-20 w-full resize-y rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--berry)]"
                onChange={(event) => setField("notes", event.target.value)}
                placeholder="Anticipo, saldo pendiente o detalles de caja."
                value={form.notes}
              />
            </label>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button className="flex-1" disabled={isPending} onClick={savePayment}>
                <Plus aria-hidden className="size-4" />
                {isPending ? "Guardando..." : editingId ? "Guardar cambios" : "Guardar pago"}
              </Button>
              <Button className="flex-1" disabled={isPending} onClick={clearForm} variant="secondary">
                Limpiar
              </Button>
            </div>
          </form>
        </article>

        <article className="rounded-lg border border-[var(--line)] bg-white shadow-sm shadow-pink-950/5">
          <div className="flex flex-col gap-4 border-b border-[var(--line)] p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-[var(--chocolate)]">Movimientos de caja</h2>
              <p className="mt-1 text-sm text-slate-500">
                Pagos, anticipos y saldos vinculados a pedidos o facturas.
              </p>
            </div>
            <label className="flex min-h-10 items-center gap-2 rounded-lg border border-[var(--line)] bg-white px-3 text-sm text-slate-500 shadow-sm lg:w-80">
              <Search aria-hidden className="size-4" />
              <input
                className="min-w-0 flex-1 outline-none"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar pago"
                value={query}
              />
            </label>
          </div>

          {filteredPayments.length ? (
            <div className="divide-y divide-[var(--line)]">
              {filteredPayments.map((payment) => (
                <PaymentRow
                  key={payment.id}
                  onEdit={() => editPayment(payment)}
                  onRemove={() => removePayment(payment.id)}
                  onStatusChange={(status) => updatePaymentStatus(payment.id, status)}
                  payment={payment}
                  pending={isPending}
                />
              ))}
            </div>
          ) : (
            <div className="p-10 text-center">
              <WalletCards aria-hidden className="mx-auto size-10 text-slate-300" />
              <p className="mt-3 font-semibold text-slate-700">Todavia no hay pagos.</p>
              <p className="mt-1 text-sm text-slate-500">
                Registra un pago cuando tengas un pedido o factura.
              </p>
            </div>
          )}
        </article>
      </section>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
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
      className={
        message.type === "error"
          ? "rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700"
          : "rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700"
      }
    >
      {message.text}
    </div>
  );
}

function PaymentRow({
  payment,
  onEdit,
  onRemove,
  onStatusChange,
  pending,
}: {
  payment: PaymentRecord;
  onEdit: () => void;
  onRemove: () => void;
  onStatusChange: (status: PaymentStatus) => void;
  pending: boolean;
}) {
  const Icon = methodIcon(payment.method);

  return (
    <div className="p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg bg-pink-50 p-2 text-[var(--berry)]">
              <Icon aria-hidden className="size-4" />
            </span>
            <h3 className="font-bold text-slate-950">{payment.code}</h3>
            <Badge variant={statusVariant(payment.status)}>{paymentStatusLabels[payment.status]}</Badge>
          </div>
          <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
            <p><strong>Documento:</strong> {payment.targetCode}</p>
            <p><strong>Cliente:</strong> {payment.customerName}</p>
            <p><strong>Metodo:</strong> {paymentMethodLabels[payment.method]}</p>
            <p><strong>Fecha:</strong> {shortDate(payment.paidAt)}</p>
            <p><strong>Monto:</strong> {currency(payment.amount)}</p>
            <p><strong>Referencia:</strong> {payment.reference || "Sin referencia"}</p>
          </div>
          {payment.notes ? (
            <p className="mt-2 rounded-lg bg-[var(--cream)] px-3 py-2 text-sm text-slate-600">
              {payment.notes}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <select
            className="min-h-10 rounded-lg border border-[var(--line)] bg-white px-3 text-sm font-semibold outline-none focus:border-[var(--berry)]"
            disabled={pending}
            onChange={(event) => onStatusChange(event.target.value as PaymentStatus)}
            value={payment.status}
          >
            {Object.entries(paymentStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <IconButton disabled={pending} label="Editar pago" onClick={onEdit}>
            <Pencil aria-hidden className="size-4" />
          </IconButton>
          <IconButton disabled={pending} label="Eliminar pago" onClick={onRemove}>
            <Trash2 aria-hidden className="size-4" />
          </IconButton>
        </div>
      </div>
    </div>
  );
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
