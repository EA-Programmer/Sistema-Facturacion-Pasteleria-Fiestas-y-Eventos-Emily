"use client";

import { memo, useCallback, useDeferredValue, useEffect, useMemo, useState, useTransition } from "react";
import {
  Check,
  FileText,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  ShoppingBag,
  Trash2,
  UserRoundCheck,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
  deleteCustomer,
  resetCustomers as resetCustomersAction,
  saveCustomer as saveCustomerAction,
  toggleCustomerStatus,
} from "@/app/actions/customers";
import { isValidEmail, validateCustomerDocument } from "@/lib/validation";
import type { BillingCustomer, CustomerDocumentType } from "@/types/customer";

const documentLabels: Record<CustomerDocumentType, string> = {
  CEDULA: "Cedula",
  RUC: "RUC",
  PASAPORTE: "Pasaporte",
  CONSUMIDOR_FINAL: "Consumidor final",
};

const emptyForm: BillingCustomer = {
  id: "",
  name: "",
  documentType: "CEDULA",
  document: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  province: "",
  notes: "",
  active: true,
};

function createId() {
  return `customer-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function getDocumentHelp(type: CustomerDocumentType) {
  if (type === "CEDULA") return "10 digitos";
  if (type === "RUC") return "13 digitos";
  if (type === "PASAPORTE") return "Documento extranjero";
  return "9999999999999";
}

function isCustomerReady(customer: BillingCustomer) {
  if (!customer.name.trim()) return false;
  if (!customer.document.trim()) return false;
  if (customer.documentType !== "CONSUMIDOR_FINAL" && !customer.email.trim()) return false;
  if (customer.documentType !== "CONSUMIDOR_FINAL" && !customer.address.trim()) return false;
  return true;
}

export function CustomerManager({ initialCustomers }: { initialCustomers: BillingCustomer[] }) {
  const [customers, setCustomers] = useState<BillingCustomer[]>(initialCustomers);
  const [formSeed, setFormSeed] = useState<BillingCustomer>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const deferredQuery = useDeferredValue(query);

  const filteredCustomers = useMemo(() => {
    const cleanQuery = deferredQuery.trim().toLowerCase();
    if (!cleanQuery) return customers;

    return customers.filter((customer) => {
      return (
        customer.name.toLowerCase().includes(cleanQuery) ||
        customer.document.toLowerCase().includes(cleanQuery) ||
        (customer.email && customer.email.toLowerCase().includes(cleanQuery)) ||
        (customer.phone && customer.phone.toLowerCase().includes(cleanQuery)) ||
        (customer.city && customer.city.toLowerCase().includes(cleanQuery)) ||
        (customer.province && customer.province.toLowerCase().includes(cleanQuery))
      );
    });
  }, [customers, deferredQuery]);

  const activeCustomers = customers.filter((customer) => customer.active).length;
  const invoiceReady = customers.filter(isCustomerReady).length;

  const clearForm = useCallback(() => {
    setFormSeed(emptyForm);
    setEditingId(null);
    setMessage(null);
    setIsFormOpen(false);
  }, []);

  const openNewCustomer = useCallback(() => {
    setFormSeed(emptyForm);
    setEditingId(null);
    setMessage(null);
    setIsFormOpen(true);
  }, []);

  function errorText(error: unknown) {
    return error instanceof Error ? error.message : "No se pudo guardar. Revisa los datos e intenta nuevamente.";
  }

  const saveCustomer = useCallback((payload: BillingCustomer) => {
    startTransition(async () => {
      try {
        const savedCustomers = await saveCustomerAction(payload);
        setCustomers(savedCustomers);
        clearForm();
        setMessage({ type: "success", text: "Cliente guardado correctamente." });
      } catch (error) {
        setMessage({ type: "error", text: errorText(error) });
      }
    });
  }, [clearForm]);

  const editCustomer = useCallback((customer: BillingCustomer) => {
    setEditingId(customer.id);
    setFormSeed(customer);
    setMessage(null);
    setIsFormOpen(true);
  }, []);

  const removeCustomer = useCallback((id: string) => {
    startTransition(async () => {
      try {
        const savedCustomers = await deleteCustomer(id);
        setCustomers(savedCustomers);
        if (editingId === id) clearForm();
        setMessage({ type: "success", text: "Cliente actualizado." });
      } catch (error) {
        setMessage({ type: "error", text: errorText(error) });
      }
    });
  }, [editingId, clearForm]);

  const toggleCustomer = useCallback((id: string) => {
    const customer = customers.find((item) => item.id === id);
    if (!customer) return;

    startTransition(async () => {
      try {
        const savedCustomers = await toggleCustomerStatus(id, !customer.active);
        setCustomers(savedCustomers);
        setMessage({ type: "success", text: "Estado del cliente actualizado." });
      } catch (error) {
        setMessage({ type: "error", text: errorText(error) });
      }
    });
  }, [customers]);

  const resetCustomers = useCallback(() => {
    startTransition(async () => {
      try {
        const savedCustomers = await resetCustomersAction();
        setCustomers(savedCustomers);
        clearForm();
        setMessage({ type: "success", text: "Clientes iniciales restaurados." });
      } catch (error) {
        setMessage({ type: "error", text: errorText(error) });
      }
    });
  }, [clearForm]);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Clientes registrados" value={customers.length} />
        <SummaryCard label="Clientes activos" value={activeCustomers} />
        <SummaryCard label="Listos para factura" value={invoiceReady} />
      </section>

      <section className="space-y-5">
        <article className="rounded-lg border border-[var(--line)] bg-white shadow-sm shadow-pink-950/5">
          <div className="flex flex-col gap-4 border-b border-[var(--line)] p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-[var(--chocolate)]">Clientes guardados</h2>
              <p className="mt-1 text-sm text-slate-500">
                Selecciona un cliente para editarlo o prepararlo para pedido.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="flex min-h-10 items-center gap-2 rounded-lg border border-[var(--line)] bg-white px-3 text-sm text-slate-500 shadow-sm lg:w-80">
                <Search aria-hidden className="size-4" />
                <input
                  aria-label="Buscar cliente"
                  className="min-w-0 flex-1 outline-none"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar cliente"
                  value={query}
                />
              </label>
              <Button onClick={openNewCustomer}>
                <Plus aria-hidden className="size-4" />
                Nuevo cliente
              </Button>
            </div>
          </div>

          <div className="divide-y divide-[var(--line)]">
            {filteredCustomers.map((customer) => (
              <CustomerRow
                customer={customer}
                key={customer.id}
                onEdit={editCustomer}
                onRemove={removeCustomer}
                onToggle={toggleCustomer}
                pending={isPending}
              />
            ))}
          </div>

          {filteredCustomers.length === 0 ? (
            <div className="p-10 text-center">
              <UserRoundCheck aria-hidden className="mx-auto size-10 text-slate-300" />
              <p className="mt-3 font-semibold text-slate-700">No hay clientes con esa busqueda.</p>
            </div>
          ) : null}
        </article>
      </section>

      <section className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm shadow-pink-950/5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-[var(--chocolate)]">Datos que se usaran en factura</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Tipo y numero de identificacion, nombres o razon social, direccion, correo de envio y telefono de contacto. El correo se usara para enviar PDF/RIDE cuando conectemos facturacion.
            </p>
          </div>
          <Button disabled={isPending} onClick={resetCustomers} variant="secondary">
            <RotateCcw aria-hidden className="size-4" />
            {isPending ? "Actualizando..." : "Restaurar clientes iniciales"}
          </Button>
        </div>
      </section>

      <CustomerFormModal
        editingId={editingId}
        initialCustomer={formSeed}
        message={isFormOpen ? message : null}
        onClose={clearForm}
        onSave={saveCustomer}
        open={isFormOpen}
        pending={isPending}
      />
    </div>
  );
}

const CustomerRow = memo(function CustomerRow({
  customer,
  onEdit,
  onRemove,
  onToggle,
  pending,
}: {
  customer: BillingCustomer;
  onEdit: (customer: BillingCustomer) => void;
  onRemove: (id: string) => void;
  onToggle: (id: string) => void;
  pending: boolean;
}) {
  return (
    <div className="perf-row p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold text-slate-950">{customer.name}</h3>
            <Badge variant={customer.active ? "green" : "default"}>
              {customer.active ? "Activo" : "Inactivo"}
            </Badge>
            {isCustomerReady(customer) ? (
              <Badge variant="berry">Listo para factura</Badge>
            ) : (
              <Badge variant="amber">Datos pendientes</Badge>
            )}
          </div>
          <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
            <p><strong>{documentLabels[customer.documentType]}:</strong> {customer.document}</p>
            <p><strong>Correo:</strong> {customer.email || "Sin correo"}</p>
            <p><strong>Telefono:</strong> {customer.phone || "Sin telefono"}</p>
            <p><strong>Ubicacion:</strong> {[customer.city, customer.province].filter(Boolean).join(", ") || "Sin ciudad"}</p>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            <strong>Direccion:</strong> {customer.address || "Sin direccion"}
          </p>
          {customer.notes ? (
            <p className="mt-2 rounded-lg bg-[var(--cream)] px-3 py-2 text-sm text-slate-600">
              {customer.notes}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <ButtonLink href="/pedidos#nuevo-pedido" variant="secondary">
            <ShoppingBag aria-hidden className="size-4" />
            Preparar pedido
          </ButtonLink>
          <IconButton disabled={pending} label="Editar cliente" onClick={() => onEdit(customer)}>
            <Pencil aria-hidden className="size-4" />
          </IconButton>
          <IconButton disabled={pending} label={customer.active ? "Desactivar cliente" : "Activar cliente"} onClick={() => onToggle(customer.id)}>
            {customer.active ? <X aria-hidden className="size-4" /> : <Check aria-hidden className="size-4" />}
          </IconButton>
          <IconButton disabled={pending} label="Eliminar cliente" onClick={() => onRemove(customer.id)}>
            <Trash2 aria-hidden className="size-4" />
          </IconButton>
        </div>
      </div>
    </div>
  );
});

function CustomerFormModal({
  editingId,
  initialCustomer,
  message,
  onClose,
  onSave,
  open,
  pending,
}: {
  editingId: string | null;
  initialCustomer: BillingCustomer;
  message: { type: "error" | "success"; text: string } | null;
  onClose: () => void;
  onSave: (customer: BillingCustomer) => void;
  open: boolean;
  pending: boolean;
}) {
  const [form, setForm] = useState<BillingCustomer>(initialCustomer);
  const [localMessage, setLocalMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(initialCustomer);
    setLocalMessage(null);
  }, [initialCustomer, open]);

  function setField<K extends keyof BillingCustomer>(key: K, value: BillingCustomer[K]) {
    setLocalMessage(null);
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === "documentType" && value === "CONSUMIDOR_FINAL") {
        return {
          ...next,
          name: "Consumidor final",
          document: "9999999999999",
          address: "Sin direccion",
          email: "",
          phone: "",
        };
      }
      return next;
    });
  }

  function getValidationMessage() {
    if (!form.name.trim()) return "Ingresa el nombre o razon social del cliente.";
    if (!form.document.trim()) return "Ingresa el numero de identificacion.";
    if (!validateCustomerDocument(form.documentType, form.document)) {
      if (form.documentType === "CEDULA") return "La cedula debe tener 10 digitos validos.";
      if (form.documentType === "RUC") return "El RUC debe tener 13 digitos validos y terminar en 001.";
      if (form.documentType === "CONSUMIDOR_FINAL") return "Consumidor final debe usar 9999999999999.";
      return "El pasaporte solo puede tener letras, numeros y guiones.";
    }
    if (form.email.trim() && !isValidEmail(form.email)) return "Ingresa un correo valido.";
    if (form.documentType !== "CONSUMIDOR_FINAL" && !form.email.trim()) {
      return "Ingresa el correo para enviar la factura.";
    }
    if (form.documentType !== "CONSUMIDOR_FINAL" && !form.address.trim()) {
      return "Ingresa la direccion de facturacion.";
    }
    return "";
  }

  function submit() {
    const validationMessage = getValidationMessage();
    if (validationMessage) {
      setLocalMessage({ type: "error", text: validationMessage });
      return;
    }

    onSave({
      ...form,
      id: editingId ?? createId(),
      name: form.name.trim(),
      document: form.document.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      city: form.city.trim(),
      province: form.province.trim(),
      notes: form.notes.trim(),
    });
  }

  const shownMessage = localMessage ?? message;

  return (
    <Modal
      description="Datos de facturacion y contacto para preparar pedidos."
      onClose={onClose}
      open={open}
      title={editingId ? "Editar cliente" : "Nuevo cliente"}
      width="lg"
    >
      <form className="space-y-4" onSubmit={(event) => event.preventDefault()}>
        {shownMessage ? <FormMessage message={shownMessage} /> : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Tipo de identificacion</span>
            <select
              className="mt-2 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--berry)]"
              onChange={(event) => setField("documentType", event.target.value as CustomerDocumentType)}
              value={form.documentType}
            >
              <option value="CEDULA">Cedula</option>
              <option value="RUC">RUC</option>
              <option value="PASAPORTE">Pasaporte</option>
              <option value="CONSUMIDOR_FINAL">Consumidor final</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Numero de identificacion</span>
            <input
              className="mt-2 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--berry)]"
              onChange={(event) => setField("document", event.target.value)}
              placeholder={getDocumentHelp(form.documentType)}
              value={form.document}
            />
            <span className="mt-1 block text-xs text-slate-500">{getDocumentHelp(form.documentType)}</span>
          </label>
        </div>

        <label className="block">
          <span className="text-sm font-semibold text-slate-700">Nombres o razon social</span>
          <input
            className="mt-2 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--berry)]"
            onChange={(event) => setField("name", event.target.value)}
            placeholder="Maria Fernanda Arias"
            value={form.name}
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Correo para factura</span>
            <input
              className="mt-2 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--berry)]"
              onChange={(event) => setField("email", event.target.value)}
              placeholder="cliente@correo.com"
              type="email"
              value={form.email}
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Telefono</span>
            <input
              className="mt-2 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--berry)]"
              onChange={(event) => setField("phone", event.target.value)}
              placeholder="0999999999"
              value={form.phone}
            />
          </label>
        </div>

        <label className="block">
          <span className="text-sm font-semibold text-slate-700">Direccion de facturacion</span>
          <input
            className="mt-2 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--berry)]"
            onChange={(event) => setField("address", event.target.value)}
            placeholder="Direccion completa"
            value={form.address}
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Ciudad</span>
            <input
              className="mt-2 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--berry)]"
              onChange={(event) => setField("city", event.target.value)}
              placeholder="Machala"
              value={form.city}
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Provincia</span>
            <input
              className="mt-2 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--berry)]"
              onChange={(event) => setField("province", event.target.value)}
              placeholder="El Oro"
              value={form.province}
            />
          </label>
        </div>

        <label className="block">
          <span className="text-sm font-semibold text-slate-700">Notas internas</span>
          <textarea
            className="mt-2 min-h-24 w-full resize-y rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--berry)]"
            onChange={(event) => setField("notes", event.target.value)}
            placeholder="Referencias para entrega, preferencias o datos utiles."
            value={form.notes}
          />
        </label>

        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <input
            checked={form.active}
            className="size-4 accent-[var(--berry)]"
            onChange={(event) => setField("active", event.target.checked)}
            type="checkbox"
          />
          Cliente activo
        </label>

        <div className="flex flex-col gap-2 border-t border-[var(--line)] pt-4 sm:flex-row sm:justify-end">
          <Button disabled={pending} onClick={onClose} variant="secondary">
            Cancelar
          </Button>
          <Button disabled={pending} onClick={submit}>
            {editingId ? <FileText aria-hidden className="size-4" /> : <Plus aria-hidden className="size-4" />}
            {pending ? "Guardando..." : editingId ? "Guardar cambios" : "Guardar cliente"}
          </Button>
        </div>
      </form>
    </Modal>
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
