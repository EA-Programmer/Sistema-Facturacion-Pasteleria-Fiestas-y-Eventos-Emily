"use client";

import { useDeferredValue, useMemo, useState } from "react";
import {
  Download,
  FileText,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
  deleteProforma,
  saveProforma as saveProformaAction,
  updateProformaStatus as updateProformaStatusAction,
} from "@/app/actions/proformas";
import { proformaStatusLabels } from "@/lib/proformas-catalog";
import { productCategoryLabels } from "@/lib/products-catalog";
import { currency, shortDate } from "@/lib/utils";
import { todayAsDateInput } from "@/lib/validation";
import type { BillingCustomer } from "@/types/customer";
import type { CakeCatalog, GeneralProduct } from "@/types/product-config";
import type {
  Proforma,
  ProformaForm,
  ProformaItem,
  ProformaStatus,
} from "@/types/proforma";

const defaultTerms =
  "Validez sujeta a disponibilidad de agenda y confirmacion de anticipo. Esta proforma no reemplaza una factura autorizada por el SRI.";

const emptyForm: ProformaForm = {
  customerId: "",
  status: "BORRADOR",
  validUntil: "",
  deliveryDate: "",
  deliveryTime: "",
  deliveryAddress: "",
  notes: "",
  terms: defaultTerms,
  discount: 0,
  items: [],
};

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function statusVariant(status: ProformaStatus) {
  if (status === "ACEPTADA" || status === "CONVERTIDA") return "green";
  if (status === "ENVIADA") return "blue";
  if (status === "RECHAZADA" || status === "VENCIDA") return "default";
  return "berry";
}

export function ProformaManager({
  initialCatalog,
  initialCustomers,
  initialProducts,
  initialProformas,
  taxRate,
}: {
  initialCatalog: CakeCatalog;
  initialCustomers: BillingCustomer[];
  initialProducts: GeneralProduct[];
  initialProformas: Proforma[];
  taxRate: number;
}) {
  const [proformas, setProformas] = useState<Proforma[]>(initialProformas);
  const [customers] = useState<BillingCustomer[]>(initialCustomers);
  const [catalog] = useState<CakeCatalog>(initialCatalog);
  const [products] = useState<GeneralProduct[]>(initialProducts);
  const [form, setForm] = useState<ProformaForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [productForm, setProductForm] = useState({ productId: "", quantity: "1" });
  const [manualForm, setManualForm] = useState({ name: "", description: "", quantity: "1", unitPrice: "" });
  const [cakeForm, setCakeForm] = useState({
    portionsId: "",
    flavorId: "",
    fillingId: "",
    coverId: "",
    modelId: "",
    theme: "",
    dedication: "",
  });
  const [isPending, setIsPending] = useState(false);
  const deferredQuery = useDeferredValue(query);

  const activeCustomers = useMemo(() => customers.filter((customer) => customer.active), [customers]);
  const activeProducts = products.filter((product) => product.active);
  const selectedCustomer = activeCustomers.find((customer) => customer.id === form.customerId);
  const selectedPortion = catalog.portions.find((item) => item.id === cakeForm.portionsId && item.active);
  const selectedFlavor = catalog.flavors.find((item) => item.id === cakeForm.flavorId && item.active);
  const selectedFilling = catalog.fillings.find((item) => item.id === cakeForm.fillingId && item.active);
  const selectedCover = catalog.covers.find((item) => item.id === cakeForm.coverId && item.active);
  const selectedModel = catalog.models.find((item) => item.id === cakeForm.modelId && item.active);

  const totals = useMemo(() => {
    const subtotal = roundMoney(form.items.reduce((sum, item) => sum + item.total, 0));
    const discount = Math.min(roundMoney(Number(form.discount || 0)), subtotal);
    const taxableBase = roundMoney(subtotal - discount);
    const tax = roundMoney(taxableBase * taxRate);
    return {
      subtotal,
      discount,
      tax,
      total: roundMoney(taxableBase + tax),
    };
  }, [form.discount, form.items, taxRate]);

  const filteredProformas = useMemo(() => {
    const cleanQuery = normalize(deferredQuery);
    if (!cleanQuery) return proformas;

    return proformas.filter((proforma) =>
      [
        proforma.number,
        proforma.customerName,
        proforma.customerDocument,
        proforma.status,
        proforma.items.map((item) => item.name).join(" "),
      ]
        .map(normalize)
        .some((value) => value.includes(cleanQuery)),
    );
  }, [proformas, deferredQuery]);

  function setField<K extends keyof ProformaForm>(key: K, value: ProformaForm[K]) {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === "customerId") {
        const customer = activeCustomers.find((item) => item.id === value);
        next.deliveryAddress = customer?.address ?? "";
      }
      return next;
    });
  }

  function clearForm() {
    setEditingId(null);
    setForm(emptyForm);
    setProductForm({ productId: "", quantity: "1" });
    setManualForm({ name: "", description: "", quantity: "1", unitPrice: "" });
    setCakeForm({
      portionsId: "",
      flavorId: "",
      fillingId: "",
      coverId: "",
      modelId: "",
      theme: "",
      dedication: "",
    });
    setMessage(null);
    setIsFormOpen(false);
  }

  function openNewProforma() {
    clearForm();
    setIsFormOpen(true);
  }

  function addProductItem() {
    const product = activeProducts.find((item) => item.id === productForm.productId);
    const quantity = Number(productForm.quantity || "1");

    if (!product || !Number.isInteger(quantity) || quantity <= 0) {
      setMessage({ type: "error", text: "Selecciona un producto y una cantidad entera mayor a cero." });
      return;
    }

    setForm((current) => ({
      ...current,
      items: [
        ...current.items,
        {
          id: createId("prof-item"),
          productId: product.id,
          type: "PRODUCTO",
          name: product.name,
          description: `${productCategoryLabels[product.category]}${product.description ? ` - ${product.description}` : ""}`,
          quantity,
          unitPrice: product.basePrice,
          total: roundMoney(product.basePrice * quantity),
        },
      ],
    }));
    setProductForm({ productId: "", quantity: "1" });
  }

  function addManualItem() {
    const name = manualForm.name.trim();
    const quantity = Number(manualForm.quantity || "1");
    const unitPrice = Number(manualForm.unitPrice || "0");

    if (!name || !Number.isInteger(quantity) || quantity <= 0 || unitPrice < 0) {
      setMessage({ type: "error", text: "El detalle necesita nombre, cantidad entera y precio valido." });
      return;
    }

    setForm((current) => ({
      ...current,
      items: [
        ...current.items,
        {
          id: createId("manual"),
          productId: "",
          type: "MANUAL",
          name,
          description: manualForm.description.trim(),
          quantity,
          unitPrice: roundMoney(unitPrice),
          total: roundMoney(quantity * unitPrice),
        },
      ],
    }));
    setManualForm({ name: "", description: "", quantity: "1", unitPrice: "" });
  }

  function addCakeItem() {
    if (!selectedPortion || !selectedFlavor || !selectedFilling || !selectedCover || !selectedModel) {
      setMessage({ type: "error", text: "Selecciona porciones, sabor, relleno, cobertura y modelo de la torta." });
      return;
    }

    const unitPrice = roundMoney(
      selectedPortion.price +
        selectedFilling.extraPrice +
        selectedCover.extraPrice +
        selectedModel.extraPrice,
    );
    const details = [
      `${selectedPortion.portions} porciones`,
      `Sabor ${selectedFlavor.name}`,
      `Relleno ${selectedFilling.name}`,
      `Cobertura ${selectedCover.name}`,
      `Modelo ${selectedModel.name}`,
      cakeForm.theme ? `Tematica: ${cakeForm.theme.trim()}` : "",
      cakeForm.dedication ? `Dedicatoria: ${cakeForm.dedication.trim()}` : "",
    ].filter(Boolean);

    setForm((current) => ({
      ...current,
      items: [
        ...current.items,
        {
          id: createId("cake"),
          productId: "",
          type: "TORTA",
          name: "Torta personalizada",
          description: details.join(". "),
          quantity: 1,
          unitPrice,
          total: unitPrice,
          customization: {
            portionsId: selectedPortion.id,
            flavorId: selectedFlavor.id,
            fillingId: selectedFilling.id,
            coverId: selectedCover.id,
            modelId: selectedModel.id,
          },
        },
      ],
    }));
    setCakeForm({
      portionsId: "",
      flavorId: "",
      fillingId: "",
      coverId: "",
      modelId: "",
      theme: "",
      dedication: "",
    });
  }

  function removeItem(id: string) {
    setForm((current) => ({
      ...current,
      items: current.items.filter((item) => item.id !== id),
    }));
  }

  function editProforma(proforma: Proforma) {
    setEditingId(proforma.id);
    setForm({
      customerId: proforma.customerId,
      status: proforma.status,
      validUntil: proforma.validUntil,
      deliveryDate: proforma.deliveryDate,
      deliveryTime: proforma.deliveryTime,
      deliveryAddress: proforma.deliveryAddress,
      notes: proforma.notes,
      terms: proforma.terms || defaultTerms,
      discount: proforma.discount,
      items: proforma.items,
    });
    setMessage(null);
    setIsFormOpen(true);
  }

  function validationMessage() {
    if (!selectedCustomer) return "Selecciona un cliente activo.";
    if (!form.items.length) return "Agrega al menos un detalle a la proforma.";
    if (totals.total <= 0) return "El total de la proforma debe ser mayor a cero.";
    return "";
  }

  async function saveProforma() {
    const error = validationMessage();
    if (error) {
      setMessage({ type: "error", text: error });
      return;
    }

    const existing = editingId ? proformas.find((item) => item.id === editingId) : undefined;
    const customer = selectedCustomer!;
    const payload: Proforma = {
      id: editingId ?? createId("proforma"),
      number: existing?.number ?? "",
      customerId: customer.id,
      customerName: customer.name,
      customerDocument: customer.document,
      customerEmail: customer.email,
      customerPhone: customer.phone,
      customerAddress: customer.address,
      status: form.status,
      issueDate: existing?.issueDate ?? todayAsDateInput(),
      validUntil: form.validUntil,
      deliveryDate: form.deliveryDate,
      deliveryTime: form.deliveryTime,
      deliveryAddress: form.deliveryAddress.trim(),
      notes: form.notes.trim(),
      terms: form.terms.trim(),
      discount: totals.discount,
      items: form.items,
      subtotal: totals.subtotal,
      tax: totals.tax,
      total: totals.total,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };

    setIsPending(true);
    try {
      const saved = await saveProformaAction(payload);
      setProformas(saved);
      clearForm();
      setMessage({ type: "success", text: "Proforma guardada correctamente." });
    } catch (saveError) {
      setMessage({
        type: "error",
        text: saveError instanceof Error ? saveError.message : "No se pudo guardar la proforma.",
      });
    } finally {
      setIsPending(false);
    }
  }

  async function removeProforma(id: string) {
    setIsPending(true);
    try {
      const saved = await deleteProforma(id);
      setProformas(saved);
      setMessage({ type: "success", text: "Proforma eliminada." });
    } catch (deleteError) {
      setMessage({
        type: "error",
        text: deleteError instanceof Error ? deleteError.message : "No se pudo eliminar la proforma.",
      });
    } finally {
      setIsPending(false);
    }
  }

  async function updateStatus(id: string, status: ProformaStatus) {
    setIsPending(true);
    try {
      const saved = await updateProformaStatusAction(id, status);
      setProformas(saved);
      setMessage({ type: "success", text: "Estado de proforma actualizado." });
    } catch (statusError) {
      setMessage({
        type: "error",
        text: statusError instanceof Error ? statusError.message : "No se pudo actualizar el estado.",
      });
    } finally {
      setIsPending(false);
    }
  }

  const accepted = proformas.filter((item) => item.status === "ACEPTADA").length;
  const sent = proformas.filter((item) => item.status === "ENVIADA").length;

  return (
    <div className="space-y-6">
      {message ? <FormMessage message={message} /> : null}

      <section className="grid gap-4 md:grid-cols-4">
        <SummaryCard label="Proformas" value={proformas.length} />
        <SummaryCard label="Enviadas" value={sent} />
        <SummaryCard label="Aceptadas" value={accepted} />
        <SummaryCard label="Monto proformado" value={currency(proformas.reduce((sum, item) => sum + item.total, 0))} />
      </section>

      <Modal
        description="Arma un documento descriptivo con tortas personalizadas, productos, bocaditos y detalles manuales."
        onClose={clearForm}
        open={isFormOpen}
        title={editingId ? "Editar proforma" : "Nueva proforma"}
        width="xl"
      >
        <form className="space-y-5" onSubmit={(event) => event.preventDefault()}>
          {message ? <FormMessage message={message} /> : null}

          <div className="grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Cliente</span>
              <select
                className="mt-2 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--berry)]"
                onChange={(event) => setField("customerId", event.target.value)}
                value={form.customerId}
              >
                <option value="">Seleccionar cliente</option>
                {activeCustomers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} - {customer.document}
                  </option>
                ))}
              </select>
            </label>
            <SelectField
              label="Estado"
              onChange={(value) => setField("status", value as ProformaStatus)}
              options={Object.entries(proformaStatusLabels).map(([value, label]) => ({ value, label }))}
              value={form.status}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <DateField label="Valida hasta" onChange={(value) => setField("validUntil", value)} value={form.validUntil} />
            <DateField label="Fecha de entrega estimada" onChange={(value) => setField("deliveryDate", value)} value={form.deliveryDate} />
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Hora estimada</span>
              <input
                className="mt-2 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--berry)]"
                onChange={(event) => setField("deliveryTime", event.target.value)}
                type="time"
                value={form.deliveryTime}
              />
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Direccion o referencia de entrega</span>
            <input
              className="mt-2 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--berry)]"
              onChange={(event) => setField("deliveryAddress", event.target.value)}
              value={form.deliveryAddress}
            />
          </label>

          <section className="rounded-lg border border-pink-100 bg-pink-50/45 p-4">
            <h3 className="font-bold text-[var(--chocolate)]">Torta personalizada</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <SelectField label="Porciones" onChange={(value) => setCakeForm((current) => ({ ...current, portionsId: value }))} options={catalog.portions.filter((item) => item.active).map((item) => ({ value: item.id, label: `${item.portions} porciones - ${currency(item.price)}` }))} value={cakeForm.portionsId} />
              <SelectField label="Sabor" onChange={(value) => setCakeForm((current) => ({ ...current, flavorId: value }))} options={catalog.flavors.filter((item) => item.active).map((item) => ({ value: item.id, label: item.name }))} value={cakeForm.flavorId} />
              <SelectField label="Relleno" onChange={(value) => setCakeForm((current) => ({ ...current, fillingId: value }))} options={catalog.fillings.filter((item) => item.active).map((item) => ({ value: item.id, label: `${item.name}${item.extraPrice ? ` + ${currency(item.extraPrice)}` : ""}` }))} value={cakeForm.fillingId} />
              <SelectField label="Cobertura" onChange={(value) => setCakeForm((current) => ({ ...current, coverId: value }))} options={catalog.covers.filter((item) => item.active).map((item) => ({ value: item.id, label: `${item.name}${item.extraPrice ? ` + ${currency(item.extraPrice)}` : ""}` }))} value={cakeForm.coverId} />
              <SelectField label="Modelo" onChange={(value) => setCakeForm((current) => ({ ...current, modelId: value }))} options={catalog.models.filter((item) => item.active).map((item) => ({ value: item.id, label: `${item.name}${item.extraPrice ? ` + ${currency(item.extraPrice)}` : ""}` }))} value={cakeForm.modelId} />
              <input className="rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--berry)]" onChange={(event) => setCakeForm((current) => ({ ...current, theme: event.target.value }))} placeholder="Tematica" value={cakeForm.theme} />
            </div>
            <textarea
              className="mt-3 min-h-16 w-full resize-y rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--berry)]"
              onChange={(event) => setCakeForm((current) => ({ ...current, dedication: event.target.value }))}
              placeholder="Dedicatoria o detalle especial"
              value={cakeForm.dedication}
            />
            <Button className="mt-3" onClick={addCakeItem} variant="secondary">
              <Plus aria-hidden className="size-4" />
              Agregar torta
            </Button>
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-lg border border-[var(--line)] bg-white p-4">
              <h3 className="font-bold text-[var(--chocolate)]">Productos guardados</h3>
              <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_90px_auto]">
                <select className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--berry)]" onChange={(event) => setProductForm((current) => ({ ...current, productId: event.target.value }))} value={productForm.productId}>
                  <option value="">Seleccionar producto</option>
                  {activeProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} - {currency(product.basePrice)}
                    </option>
                  ))}
                </select>
                <input aria-label="Cantidad del producto" className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--berry)]" min="1" onChange={(event) => setProductForm((current) => ({ ...current, quantity: event.target.value }))} type="number" value={productForm.quantity} />
                <Button onClick={addProductItem} variant="secondary"><Plus aria-hidden className="size-4" /></Button>
              </div>
            </div>

            <div className="rounded-lg border border-[var(--line)] bg-white p-4">
              <h3 className="font-bold text-[var(--chocolate)]">Detalle manual</h3>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <input className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--berry)]" onChange={(event) => setManualForm((current) => ({ ...current, name: event.target.value }))} placeholder="Nombre" value={manualForm.name} />
                <input className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--berry)]" min="0" onChange={(event) => setManualForm((current) => ({ ...current, unitPrice: event.target.value }))} placeholder="Precio" type="number" value={manualForm.unitPrice} />
                <input className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--berry)]" min="1" onChange={(event) => setManualForm((current) => ({ ...current, quantity: event.target.value }))} placeholder="Cantidad" type="number" value={manualForm.quantity} />
                <Button onClick={addManualItem} variant="secondary"><Plus aria-hidden className="size-4" />Agregar</Button>
              </div>
              <textarea className="mt-2 min-h-16 w-full resize-y rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--berry)]" onChange={(event) => setManualForm((current) => ({ ...current, description: event.target.value }))} placeholder="Descripcion detallada" value={manualForm.description} />
            </div>
          </section>

          <ProformaItems items={form.items} onRemove={removeItem} />

          <div className="grid gap-3 md:grid-cols-[1fr_180px]">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Notas visibles</span>
              <textarea className="mt-2 min-h-20 w-full resize-y rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--berry)]" onChange={(event) => setField("notes", event.target.value)} value={form.notes} />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Descuento</span>
              <input className="mt-2 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--berry)]" min="0" onChange={(event) => setField("discount", Number(event.target.value || "0"))} type="number" value={form.discount} />
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Condiciones</span>
            <textarea className="mt-2 min-h-20 w-full resize-y rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--berry)]" onChange={(event) => setField("terms", event.target.value)} value={form.terms} />
          </label>

          <TotalsPanel totals={totals} />

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button className="flex-1" disabled={isPending} onClick={saveProforma}>
              {editingId ? <FileText aria-hidden className="size-4" /> : <Plus aria-hidden className="size-4" />}
              {isPending ? "Guardando..." : editingId ? "Guardar cambios" : "Guardar proforma"}
            </Button>
            <Button className="flex-1" disabled={isPending} onClick={clearForm} variant="secondary">
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>

      <section className="rounded-lg border border-[var(--line)] bg-white shadow-sm shadow-pink-950/5">
        <div className="flex flex-col gap-4 border-b border-[var(--line)] p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-[var(--chocolate)]">Proformas guardadas</h2>
            <p className="mt-1 text-sm text-slate-500">Cotizaciones detalladas listas para PDF y seguimiento comercial.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="flex min-h-10 items-center gap-2 rounded-lg border border-[var(--line)] bg-white px-3 text-sm text-slate-500 shadow-sm lg:w-80">
              <Search aria-hidden className="size-4" />
              <input aria-label="Buscar proforma" className="min-w-0 flex-1 outline-none" onChange={(event) => setQuery(event.target.value)} placeholder="Buscar proforma" value={query} />
            </label>
            <Button onClick={openNewProforma}>
              <Plus aria-hidden className="size-4" />
              Nueva proforma
            </Button>
          </div>
        </div>

        {filteredProformas.length ? (
          <div className="divide-y divide-[var(--line)]">
            {filteredProformas.map((proforma) => (
              <ProformaRow
                key={proforma.id}
                onEdit={() => editProforma(proforma)}
                onRemove={() => removeProforma(proforma.id)}
                onStatusChange={(status) => updateStatus(proforma.id, status)}
                pending={isPending}
                proforma={proforma}
              />
            ))}
          </div>
        ) : (
          <div className="p-10 text-center">
            <FileText aria-hidden className="mx-auto size-10 text-slate-300" />
            <p className="mt-3 font-semibold text-slate-700">Todavia no hay proformas.</p>
            <p className="mt-1 text-sm text-slate-500">Crea una cotizacion con tortas, productos o detalles manuales.</p>
          </div>
        )}
      </section>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number | string }) {
  return (
    <article className="rounded-lg border border-[var(--line)] bg-white p-4 shadow-sm shadow-pink-950/5">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-[var(--chocolate)]">{value}</p>
    </article>
  );
}

function FormMessage({ message }: { message: { type: "error" | "success"; text: string } }) {
  return (
    <div
      aria-live={message.type === "error" ? "assertive" : "polite"}
      className={message.type === "error" ? "rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700" : "rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700"}
      role={message.type === "error" ? "alert" : "status"}
    >
      {message.text}
    </div>
  );
}

function SelectField({ label, options, value, onChange }: { label: string; options: Array<{ label: string; value: string }>; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <select className="mt-2 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--berry)]" onChange={(event) => onChange(event.target.value)} value={value}>
        <option value="">Seleccionar</option>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <input className="mt-2 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--berry)]" min={todayAsDateInput()} onChange={(event) => onChange(event.target.value)} type="date" value={value} />
    </label>
  );
}

function ProformaItems({ items, onRemove }: { items: ProformaItem[]; onRemove: (id: string) => void }) {
  if (!items.length) {
    return <div className="rounded-lg bg-[var(--cream)] p-4 text-sm text-slate-600">Aun no hay detalles agregados.</div>;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--line)]">
      <table className="w-full min-w-[680px] text-left text-sm">
        <thead className="bg-[var(--cream)] text-xs uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3">Detalle</th>
            <th className="px-4 py-3 text-center">Cant.</th>
            <th className="px-4 py-3 text-right">Unitario</th>
            <th className="px-4 py-3 text-right">Total</th>
            <th className="px-4 py-3 text-right">Accion</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--line)]">
          {items.map((item) => (
            <tr key={item.id}>
              <td className="px-4 py-3">
                <div className="font-semibold text-slate-900">{item.name}</div>
                {item.description ? <div className="mt-1 text-xs leading-5 text-slate-500">{item.description}</div> : null}
              </td>
              <td className="px-4 py-3 text-center">{item.quantity}</td>
              <td className="px-4 py-3 text-right">{currency(item.unitPrice)}</td>
              <td className="px-4 py-3 text-right font-semibold">{currency(item.total)}</td>
              <td className="px-4 py-3 text-right">
                <button aria-label="Eliminar detalle" className="focus-ring inline-grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-pink-50 hover:text-[var(--berry)]" onClick={() => onRemove(item.id)} type="button">
                  <X aria-hidden className="size-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TotalsPanel({ totals }: { totals: { subtotal: number; discount: number; tax: number; total: number } }) {
  return (
    <aside className="rounded-lg border border-pink-100 bg-pink-50 p-4">
      <div className="space-y-2 text-sm">
        <div className="flex justify-between"><span>Subtotal</span><strong>{currency(totals.subtotal)}</strong></div>
        <div className="flex justify-between"><span>Descuento</span><strong>{currency(totals.discount)}</strong></div>
        <div className="flex justify-between"><span>IVA</span><strong>{currency(totals.tax)}</strong></div>
      </div>
      <div className="mt-3 flex justify-between border-t border-pink-200 pt-3 text-lg font-bold text-[var(--chocolate)]">
        <span>Total proforma</span>
        <span>{currency(totals.total)}</span>
      </div>
    </aside>
  );
}

function ProformaRow({ proforma, pending, onEdit, onRemove, onStatusChange }: { proforma: Proforma; pending: boolean; onEdit: () => void; onRemove: () => void; onStatusChange: (status: ProformaStatus) => void }) {
  return (
    <div className="perf-row p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold text-slate-950">{proforma.number}</h3>
            <Badge variant={statusVariant(proforma.status)}>{proformaStatusLabels[proforma.status]}</Badge>
            <Badge variant="berry">{currency(proforma.total)}</Badge>
          </div>
          <p className="mt-2 text-sm font-semibold text-slate-700">{proforma.customerName}</p>
          <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
            <p><strong>Emision:</strong> {shortDate(proforma.issueDate)}</p>
            <p><strong>Validez:</strong> {proforma.validUntil ? shortDate(proforma.validUntil) : "Por confirmar"}</p>
            <p><strong>Entrega:</strong> {proforma.deliveryDate ? shortDate(proforma.deliveryDate) : "Por confirmar"} {proforma.deliveryTime}</p>
            <p><strong>Detalles:</strong> {proforma.items.length}</p>
          </div>
          <p className="mt-2 text-sm text-slate-500">{proforma.items.map((item) => `${item.name} x${item.quantity}`).join(", ")}</p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <select className="min-h-10 rounded-lg border border-[var(--line)] bg-white px-3 text-sm font-semibold outline-none focus:border-[var(--berry)]" disabled={pending} onChange={(event) => onStatusChange(event.target.value as ProformaStatus)} value={proforma.status}>
            {Object.entries(proformaStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <a className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[var(--line)] bg-white px-4 text-sm font-bold text-slate-800 shadow-sm transition hover:bg-pink-50 hover:text-[var(--berry-dark)]" href={`/api/proformas/${proforma.id}/pdf`} target="_blank" rel="noreferrer">
            <Download aria-hidden className="size-4" />
            PDF
          </a>
          <IconButton disabled={pending} label="Editar proforma" onClick={onEdit}><Pencil aria-hidden className="size-4" /></IconButton>
          <IconButton disabled={pending} label="Eliminar proforma" onClick={onRemove}><Trash2 aria-hidden className="size-4" /></IconButton>
        </div>
      </div>
    </div>
  );
}

function IconButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button aria-label={label} className="focus-ring grid size-10 place-items-center rounded-lg border border-[var(--line)] bg-white text-slate-600 hover:bg-pink-50 hover:text-[var(--berry)]" disabled={disabled} onClick={onClick} title={label} type="button">
      {children}
    </button>
  );
}
