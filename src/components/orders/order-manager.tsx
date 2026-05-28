"use client";

import { useDeferredValue, useMemo, useState, useTransition } from "react";
import {
  CalendarClock,
  FileText,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
  deleteOrder,
  saveOrder as saveOrderAction,
  updateOrderStatus as updateOrderStatusAction,
} from "@/app/actions/orders";
import { orderStatusLabels } from "@/lib/orders-catalog";
import { productCategoryLabels } from "@/lib/products-catalog";
import { currency, shortDate } from "@/lib/utils";
import { isPastDateInput, todayAsDateInput } from "@/lib/validation";
import type { BillingCustomer } from "@/types/customer";
import type { CakeCatalog, GeneralProduct } from "@/types/product-config";
import type { CakeOrder, CakeOrderForm, CakeOrderStatus } from "@/types/order";

const emptyForm: CakeOrderForm = {
  customerId: "",
  status: "BORRADOR",
  deliveryDate: "",
  deliveryTime: "",
  portionsId: "",
  flavorId: "",
  fillingId: "",
  coverId: "",
  modelId: "",
  dedication: "",
  referenceImageNote: "",
  deliveryAddress: "",
  notes: "",
  extras: [],
  productItems: [],
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

function statusVariant(status: CakeOrderStatus) {
  if (status === "CONFIRMADO") return "blue";
  if (status === "EN_PRODUCCION") return "amber";
  if (status === "LISTO" || status === "ENTREGADO") return "green";
  if (status === "CANCELADO") return "default";
  return "berry";
}

export function OrderManager({
  initialCatalog,
  initialCustomers,
  initialOrders,
  initialProducts,
  taxRate,
}: {
  initialCatalog: CakeCatalog;
  initialCustomers: BillingCustomer[];
  initialOrders: CakeOrder[];
  initialProducts: GeneralProduct[];
  taxRate: number;
}) {
  const [orders, setOrders] = useState<CakeOrder[]>(initialOrders);
  const [customers] = useState<BillingCustomer[]>(initialCustomers);
  const [catalog] = useState<CakeCatalog>(initialCatalog);
  const [products] = useState<GeneralProduct[]>(initialProducts);
  const [form, setForm] = useState<CakeOrderForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [extraForm, setExtraForm] = useState({ name: "", price: "", quantity: "1" });
  const [productForm, setProductForm] = useState({ productId: "", quantity: "1" });
  const [bocaditoSalForm, setBocaditoSalForm] = useState({ productId: "", quantity: "25" });
  const [bocaditoDulceForm, setBocaditoDulceForm] = useState({ productId: "", quantity: "25" });
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const deferredQuery = useDeferredValue(query);

  const activeCustomers = useMemo(
    () => customers.filter((customer) => customer.active),
    [customers],
  );
  const activePortions = catalog.portions.filter((item) => item.active);
  const activeFlavors = catalog.flavors.filter((item) => item.active);
  const activeFillings = catalog.fillings.filter((item) => item.active);
  const activeCovers = catalog.covers.filter((item) => item.active);
  const activeModels = catalog.models.filter((item) => item.active);
  
  // Excluir bocaditos de la sección genérica
  const activeProducts = products.filter(
    (item) => item.active && item.category !== "BOCADITOS_SAL" && item.category !== "BOCADITOS_DULCE"
  );

  // Bocaditos de sal y dulce
  const activeSaltyBocaditos = products.filter(
    (item) => item.active && item.category === "BOCADITOS_SAL"
  );
  const activeSweetBocaditos = products.filter(
    (item) => item.active && item.category === "BOCADITOS_DULCE"
  );

  const totalBocaditosCount = useMemo(() => {
    return form.productItems
      .filter((item) => item.category === "BOCADITOS_SAL" || item.category === "BOCADITOS_DULCE")
      .reduce((sum, item) => sum + item.quantity, 0);
  }, [form.productItems]);

  const selectedCustomer = activeCustomers.find((customer) => customer.id === form.customerId);
  const selectedPortion = activePortions.find((item) => item.id === form.portionsId);
  const selectedFlavor = activeFlavors.find((item) => item.id === form.flavorId);
  const selectedFilling = activeFillings.find((item) => item.id === form.fillingId);
  const selectedCover = activeCovers.find((item) => item.id === form.coverId);
  const selectedModel = activeModels.find((item) => item.id === form.modelId);
  const hasCakeSelection = Boolean(
    form.portionsId ||
      form.flavorId ||
      form.fillingId ||
      form.coverId ||
      form.modelId,
  );
  const hasCompleteCake = Boolean(
    selectedPortion &&
      selectedFlavor &&
      selectedFilling &&
      selectedCover &&
      selectedModel,
  );

  const totals = useMemo(() => {
    const extrasTotal = form.extras.reduce(
      (total, extra) => total + extra.price * extra.quantity,
      0,
    );
    const productsTotal = form.productItems.reduce((total, item) => total + item.total, 0);
    const subtotal = roundMoney(
      (selectedPortion?.price ?? 0) +
        (selectedFilling?.extraPrice ?? 0) +
        (selectedCover?.extraPrice ?? 0) +
        (selectedModel?.extraPrice ?? 0) +
        extrasTotal +
        productsTotal,
    );
    const tax = roundMoney(subtotal * taxRate);
    return {
      extrasTotal: roundMoney(extrasTotal),
      productsTotal: roundMoney(productsTotal),
      subtotal,
      tax,
      total: roundMoney(subtotal + tax),
    };
  }, [form.extras, form.productItems, selectedCover, selectedFilling, selectedModel, selectedPortion, taxRate]);

  const filteredOrders = useMemo(() => {
    const cleanQuery = normalize(deferredQuery);
    if (!cleanQuery) return orders;

    return orders.filter((order) =>
      [
        order.code,
        order.customerName,
        order.customerDocument,
        order.flavorName,
        order.modelName,
        order.status,
      ]
        .map(normalize)
        .some((value) => value.includes(cleanQuery)),
    );
  }, [orders, deferredQuery]);

  function setField<K extends keyof CakeOrderForm>(key: K, value: CakeOrderForm[K]) {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === "customerId") {
        const customer = activeCustomers.find((item) => item.id === value);
        next.deliveryAddress = customer?.address ?? "";
      }
      return next;
    });
  }

  function addExtra() {
    const name = extraForm.name.trim();
    const price = Number(extraForm.price || "0");
    const quantity = Number(extraForm.quantity || "1");
    if (!name || price < 0 || quantity <= 0 || !Number.isInteger(quantity)) {
      setMessage({ type: "error", text: "El extra necesita nombre, precio valido y cantidad entera mayor a cero." });
      return;
    }

    setForm((current) => ({
      ...current,
      extras: [
        ...current.extras,
        { id: createId("extra"), name, price, quantity },
      ],
    }));
    setExtraForm({ name: "", price: "", quantity: "1" });
  }

  function addProductItem() {
    const product = activeProducts.find((item) => item.id === productForm.productId);
    const quantity = Number(productForm.quantity || "1");

    if (!product || !Number.isInteger(quantity) || quantity <= 0) {
      setMessage({ type: "error", text: "Selecciona un producto y una cantidad entera mayor a cero." });
      return;
    }

    setForm((current) => {
      const existing = current.productItems.find((item) => item.productId === product.id);
      if (existing) {
        return {
          ...current,
          productItems: current.productItems.map((item) =>
            item.productId === product.id
              ? {
                  ...item,
                  quantity: item.quantity + quantity,
                  total: roundMoney((item.quantity + quantity) * item.unitPrice),
                }
              : item,
          ),
        };
      }

      return {
        ...current,
        productItems: [
          ...current.productItems,
          {
            id: createId("item"),
            productId: product.id,
            name: product.name,
            category: product.category,
            quantity,
            unitPrice: product.basePrice,
            total: roundMoney(product.basePrice * quantity),
          },
        ],
      };
    });
    setProductForm({ productId: "", quantity: "1" });
  }

  function addBocaditoItem(productId: string, quantityStr: string, isSalty: boolean) {
    const product = products.find((item) => item.id === productId);
    const quantity = Number(quantityStr || "1");

    if (!product || !Number.isInteger(quantity) || quantity <= 0) {
      setMessage({ type: "error", text: "Selecciona un bocadito y una cantidad entera mayor a cero." });
      return;
    }

    setForm((current) => {
      const existing = current.productItems.find((item) => item.productId === product.id);
      if (existing) {
        return {
          ...current,
          productItems: current.productItems.map((item) =>
            item.productId === product.id
              ? {
                  ...item,
                  quantity: item.quantity + quantity,
                  total: roundMoney((item.quantity + quantity) * item.unitPrice),
                }
              : item,
          ),
        };
      }

      return {
        ...current,
        productItems: [
          ...current.productItems,
          {
            id: createId("item"),
            productId: product.id,
            name: product.name,
            category: product.category,
            quantity,
            unitPrice: product.basePrice,
            total: roundMoney(product.basePrice * quantity),
          },
        ],
      };
    });

    if (isSalty) {
      setBocaditoSalForm({ productId: "", quantity: "25" });
    } else {
      setBocaditoDulceForm({ productId: "", quantity: "25" });
    }
  }

  function removeProductItem(id: string) {
    setForm((current) => ({
      ...current,
      productItems: current.productItems.filter((item) => item.id !== id),
    }));
  }

  function removeExtra(id: string) {
    setForm((current) => ({
      ...current,
      extras: current.extras.filter((extra) => extra.id !== id),
    }));
  }

  function clearForm() {
    setEditingId(null);
    setForm(emptyForm);
    setExtraForm({ name: "", price: "", quantity: "1" });
    setProductForm({ productId: "", quantity: "1" });
    setBocaditoSalForm({ productId: "", quantity: "25" });
    setBocaditoDulceForm({ productId: "", quantity: "25" });
    setMessage(null);
    setIsFormOpen(false);
  }

  function openNewOrder() {
    setEditingId(null);
    setForm(emptyForm);
    setExtraForm({ name: "", price: "", quantity: "1" });
    setProductForm({ productId: "", quantity: "1" });
    setBocaditoSalForm({ productId: "", quantity: "25" });
    setBocaditoDulceForm({ productId: "", quantity: "25" });
    setMessage(null);
    setIsFormOpen(true);
  }

  function errorText(error: unknown) {
    return error instanceof Error ? error.message : "No se pudo guardar el pedido. Revisa los datos.";
  }

  function getValidationMessage() {
    if (!selectedCustomer) return "Selecciona un cliente activo.";
    if (hasCakeSelection && !selectedPortion) return "Selecciona las porciones de la torta o deja la torta vacia.";
    if (hasCakeSelection && !selectedFlavor) return "Selecciona el sabor de la torta o deja la torta vacia.";
    if (hasCakeSelection && !selectedFilling) return "Selecciona el relleno de la torta o deja la torta vacia.";
    if (hasCakeSelection && !selectedCover) return "Selecciona la cobertura de la torta o deja la torta vacia.";
    if (hasCakeSelection && !selectedModel) return "Selecciona el modelo de la torta o deja la torta vacia.";
    if (!form.deliveryDate) return "Selecciona la fecha de entrega.";
    if (isPastDateInput(form.deliveryDate)) return "La fecha de entrega no puede ser anterior a hoy.";
    if (!hasCompleteCake && !form.extras.length && !form.productItems.length) {
      return "Agrega una torta completa, un producto, un postre, bocaditos o un detalle adicional.";
    }
    
    if (totalBocaditosCount > 0 && totalBocaditosCount < 50) {
      return `El pedido mínimo para bocaditos es de 50 unidades en total. Actualmente has seleccionado ${totalBocaditosCount} unidades.`;
    }

    if (totals.total <= 0) return "El total del pedido debe ser mayor a cero.";
    return "";
  }

  function saveOrder() {
    const validationMessage = getValidationMessage();
    if (validationMessage) {
      setMessage({ type: "error", text: validationMessage });
      return;
    }

    const existingOrder = editingId
      ? orders.find((order) => order.id === editingId)
      : undefined;
    const customer = selectedCustomer!;

    const payload: CakeOrder = {
      id: editingId ?? createId("order"),
      code: existingOrder?.code ?? "",
      customerId: customer.id,
      customerName: customer.name,
      customerDocument: customer.document,
      customerEmail: customer.email,
      status: form.status,
      deliveryDate: form.deliveryDate,
      deliveryTime: form.deliveryTime,
      portionsId: selectedPortion?.id ?? "",
      portionsLabel: selectedPortion ? `${selectedPortion.portions} porciones` : "",
      basePrice: selectedPortion?.price ?? 0,
      flavorId: selectedFlavor?.id ?? "",
      flavorName: selectedFlavor?.name ?? "",
      fillingId: selectedFilling?.id ?? "",
      fillingName: selectedFilling?.name ?? "",
      fillingExtraPrice: selectedFilling?.extraPrice ?? 0,
      coverId: selectedCover?.id ?? "",
      coverName: selectedCover?.name ?? "",
      coverExtraPrice: selectedCover?.extraPrice ?? 0,
      modelId: selectedModel?.id ?? "",
      modelName: selectedModel?.name ?? "",
      modelExtraPrice: selectedModel?.extraPrice ?? 0,
      dedication: form.dedication.trim(),
      referenceImageNote: form.referenceImageNote.trim(),
      deliveryAddress: form.deliveryAddress.trim(),
      notes: form.notes.trim(),
      extras: form.extras,
      productItems: form.productItems,
      subtotal: totals.subtotal,
      tax: totals.tax,
      total: totals.total,
      createdAt: existingOrder?.createdAt ?? new Date().toISOString(),
    };

    startTransition(async () => {
      try {
        const savedOrders = await saveOrderAction(payload);
        setOrders(savedOrders);
        clearForm();
        setMessage({ type: "success", text: "Pedido guardado correctamente." });
      } catch (error) {
        setMessage({ type: "error", text: errorText(error) });
      }
    });
  }

  function editOrder(order: CakeOrder) {
    setEditingId(order.id);
    setForm({
      customerId: order.customerId,
      status: order.status,
      deliveryDate: order.deliveryDate,
      deliveryTime: order.deliveryTime,
      portionsId: order.portionsId,
      flavorId: order.flavorId,
      fillingId: order.fillingId,
      coverId: order.coverId,
      modelId: order.modelId,
      dedication: order.dedication,
      referenceImageNote: order.referenceImageNote,
      deliveryAddress: order.deliveryAddress,
      notes: order.notes,
      extras: order.extras,
      productItems: order.productItems,
    });
    setMessage(null);
    setIsFormOpen(true);
  }

  function removeOrder(id: string) {
    startTransition(async () => {
      try {
        const savedOrders = await deleteOrder(id);
        setOrders(savedOrders);
        if (editingId === id) clearForm();
        setMessage({ type: "success", text: "Pedido actualizado." });
      } catch (error) {
        setMessage({ type: "error", text: errorText(error) });
      }
    });
  }

  function updateOrderStatus(id: string, status: CakeOrderStatus) {
    startTransition(async () => {
      try {
        const savedOrders = await updateOrderStatusAction(id, status);
        setOrders(savedOrders);
        setMessage({ type: "success", text: "Estado del pedido actualizado." });
      } catch (error) {
        setMessage({ type: "error", text: errorText(error) });
      }
    });
  }

  const confirmedOrders = orders.filter((order) => order.status !== "CANCELADO").length;
  const pendingInvoices = orders.filter((order) =>
    ["CONFIRMADO", "LISTO", "ENTREGADO"].includes(order.status),
  ).length;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Pedidos registrados" value={orders.length} />
        <SummaryCard label="Pedidos activos" value={confirmedOrders} />
        <SummaryCard label="Listos para factura" value={pendingInvoices} />
      </section>

      <section className="space-y-5">
        <Modal
          description="Configura la torta, calcula el total y deja el pedido listo para facturar."
          onClose={clearForm}
          open={isFormOpen}
          title={editingId ? "Editar pedido" : "Nuevo pedido"}
          width="xl"
        >
        <article
          className="bg-white"
          id="nuevo-pedido"
        >
          <form className="space-y-4" onSubmit={(event) => event.preventDefault()}>
            {message ? <FormMessage message={message} /> : null}

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

            {activeCustomers.length <= 1 ? (
              <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                Registra clientes reales en la seccion Clientes para usarlos aqui.
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Fecha de entrega</span>
                <input
                  className="mt-2 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--berry)]"
                  min={todayAsDateInput()}
                  onChange={(event) => setField("deliveryDate", event.target.value)}
                  type="date"
                  value={form.deliveryDate}
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Hora</span>
                <input
                  className="mt-2 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--berry)]"
                  onChange={(event) => setField("deliveryTime", event.target.value)}
                  type="time"
                  value={form.deliveryTime}
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <SelectField
                label="Porciones"
                onChange={(value) => setField("portionsId", value)}
                options={activePortions.map((item) => ({
                  label: `${item.portions} porciones - ${currency(item.price)}`,
                  value: item.id,
                }))}
                value={form.portionsId}
              />
              <SelectField
                label="Sabor"
                onChange={(value) => setField("flavorId", value)}
                options={activeFlavors.map((item) => ({
                  label: item.specialty ? `${item.name} (especialidad)` : item.name,
                  value: item.id,
                }))}
                value={form.flavorId}
              />
              <SelectField
                label="Relleno"
                onChange={(value) => setField("fillingId", value)}
                options={activeFillings.map((item) => ({
                  label: `${item.name} + ${currency(item.extraPrice)}`,
                  value: item.id,
                }))}
                value={form.fillingId}
              />
              <SelectField
                label="Cobertura"
                onChange={(value) => setField("coverId", value)}
                options={activeCovers.map((item) => ({
                  label: `${item.name} + ${currency(item.extraPrice)}`,
                  value: item.id,
                }))}
                value={form.coverId}
              />
            </div>

            <SelectField
              label="Modelo"
              onChange={(value) => setField("modelId", value)}
              options={activeModels.map((item) => ({
                label: `${item.name} - personalizable + ${currency(item.extraPrice)}`,
                value: item.id,
              }))}
              value={form.modelId}
            />

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Dedicatoria</span>
              <input
                className="mt-2 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--berry)]"
                onChange={(event) => setField("dedication", event.target.value)}
                placeholder="Feliz cumple, Emily"
                value={form.dedication}
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Imagen o referencia del modelo</span>
              <textarea
                className="mt-2 min-h-20 w-full resize-y rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--berry)]"
                onChange={(event) => setField("referenceImageNote", event.target.value)}
                placeholder="Descripcion de imagen enviada por WhatsApp, colores, personaje o tematica."
                value={form.referenceImageNote}
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Direccion de entrega</span>
              <input
                className="mt-2 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--berry)]"
                onChange={(event) => setField("deliveryAddress", event.target.value)}
                placeholder="Direccion de entrega"
                value={form.deliveryAddress}
              />
            </label>

            <div className="rounded-lg border border-[var(--line)] bg-[var(--cream)] p-4">
              <p className="font-bold text-[var(--chocolate)]">Extras</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_100px_90px_auto]">
                <input
                  aria-label="Nombre del extra"
                  className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--berry)]"
                  onChange={(event) => setExtraForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Vela, topper, empaque"
                  value={extraForm.name}
                />
                <input
                  aria-label="Precio del extra"
                  className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--berry)]"
                  min="0"
                  onChange={(event) => setExtraForm((current) => ({ ...current, price: event.target.value }))}
                  placeholder="Precio"
                  step="0.01"
                  type="number"
                  value={extraForm.price}
                />
                <input
                  aria-label="Cantidad del extra"
                  className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--berry)]"
                  min="1"
                  onChange={(event) => setExtraForm((current) => ({ ...current, quantity: event.target.value }))}
                  placeholder="Cant."
                  type="number"
                  value={extraForm.quantity}
                />
                <Button disabled={isPending} onClick={addExtra} variant="secondary">
                  <Plus aria-hidden className="size-4" />
                </Button>
              </div>

              {form.extras.length ? (
                <div className="mt-3 space-y-2">
                  {form.extras.map((extra) => (
                    <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm" key={extra.id}>
                      <span>{extra.name} x {extra.quantity}</span>
                      <div className="flex items-center gap-2">
                        <strong>{currency(extra.price * extra.quantity)}</strong>
                        <button
                          aria-label="Eliminar extra"
                          className="text-slate-400 hover:text-[var(--berry)]"
                          onClick={() => removeExtra(extra.id)}
                          type="button"
                        >
                          <X aria-hidden className="size-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            {/* Sección de Bocaditos */}
            <div className="rounded-lg border border-pink-100 bg-pink-50/20 p-4 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-pink-100/60 pb-3">
                <div>
                  <p className="font-bold text-[var(--chocolate)] flex items-center gap-1.5 text-base">
                    <span>🧁</span> Sección de Bocaditos
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Combina bocaditos de sal y dulce. Pedido mínimo de 50 unidades en total.
                  </p>
                </div>
                {totalBocaditosCount > 0 && (
                  <Badge variant={totalBocaditosCount >= 50 ? "green" : "amber"}>
                    {totalBocaditosCount} / 50 unidades
                  </Badge>
                )}
              </div>

              {totalBocaditosCount > 0 && (
                <div className="rounded-lg p-3 text-xs space-y-2 border transition-all duration-300 bg-white shadow-sm shadow-pink-900/5">
                  {totalBocaditosCount < 50 ? (
                    <div className="text-amber-800 font-semibold flex flex-col gap-1">
                      <div className="flex justify-between items-center">
                        <span>Llevas {totalBocaditosCount} bocaditos agregados</span>
                        <span className="text-amber-600">Faltan {50 - totalBocaditosCount} unidades</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-1 border border-slate-200/50">
                        <div
                          className="bg-gradient-to-r from-amber-400 to-amber-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${(totalBocaditosCount / 50) * 100}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-emerald-800 font-semibold flex flex-col gap-1">
                      <div className="flex justify-between items-center">
                        <span>¡Pedido mínimo completado! 🎉</span>
                        <span className="text-emerald-600">Total: {totalBocaditosCount} unidades</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-1 border border-slate-200/50">
                        <div
                          className="bg-gradient-to-r from-emerald-400 to-emerald-500 h-full rounded-full transition-all duration-300"
                          style={{ width: "100%" }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                {/* Bocaditos de Sal */}
                <div className="space-y-3 rounded-lg border border-blue-100/50 bg-blue-50/10 p-3 shadow-inner">
                  <p className="text-xs font-bold text-blue-700 tracking-wider uppercase">🧂 Bocaditos de Sal</p>
                  <div className="flex gap-2">
                    <div className="flex-1 rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold text-slate-700 flex items-center justify-between shadow-sm">
                      <span>Bocaditos de Sal</span>
                      <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-[10px]">$20.00 / 100u</span>
                    </div>
                    <input
                      aria-label="Cantidad bocaditos de sal"
                      className="w-16 rounded-lg border border-[var(--line)] bg-white px-2 py-2 text-center text-xs outline-none focus:border-[var(--berry)]"
                      min="1"
                      onChange={(event) =>
                        setBocaditoSalForm((current) => ({ ...current, quantity: event.target.value }))
                      }
                      type="number"
                      value={bocaditoSalForm.quantity}
                    />
                    <Button
                      disabled={isPending || !activeSaltyBocaditos[0]}
                      onClick={() => {
                        const prod = activeSaltyBocaditos[0];
                        if (prod) {
                          addBocaditoItem(prod.id, bocaditoSalForm.quantity, true);
                        }
                      }}
                      variant="secondary"
                      className="px-3"
                    >
                      <Plus className="size-4" />
                    </Button>
                  </div>
                </div>

                {/* Bocaditos de Dulce */}
                <div className="space-y-3 rounded-lg border border-pink-100/50 bg-pink-50/10 p-3 shadow-inner">
                  <p className="text-xs font-bold text-pink-700 tracking-wider uppercase">🍬 Bocaditos de Dulce</p>
                  <div className="flex gap-2">
                    <div className="flex-1 rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold text-slate-700 flex items-center justify-between shadow-sm">
                      <span>Bocaditos de Dulce</span>
                      <span className="text-pink-600 bg-pink-50 px-2 py-0.5 rounded text-[10px]">$18.00 / 100u</span>
                    </div>
                    <input
                      aria-label="Cantidad bocaditos de dulce"
                      className="w-16 rounded-lg border border-[var(--line)] bg-white px-2 py-2 text-center text-xs outline-none focus:border-[var(--berry)]"
                      min="1"
                      onChange={(event) =>
                        setBocaditoDulceForm((current) => ({ ...current, quantity: event.target.value }))
                      }
                      type="number"
                      value={bocaditoDulceForm.quantity}
                    />
                    <Button
                      disabled={isPending || !activeSweetBocaditos[0]}
                      onClick={() => {
                        const prod = activeSweetBocaditos[0];
                        if (prod) {
                          addBocaditoItem(prod.id, bocaditoDulceForm.quantity, false);
                        }
                      }}
                      variant="secondary"
                      className="px-3"
                    >
                      <Plus className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-[var(--line)] bg-white p-4">
              <p className="font-bold text-[var(--chocolate)]">Otros productos</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_100px_auto]">
                <select
                  aria-label="Producto adicional"
                  className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--berry)]"
                  onChange={(event) =>
                    setProductForm((current) => ({ ...current, productId: event.target.value }))
                  }
                  value={productForm.productId}
                >
                  <option value="">Seleccionar producto</option>
                  {activeProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} - {productCategoryLabels[product.category]} - {currency(product.basePrice)}
                    </option>
                  ))}
                </select>
                <input
                  aria-label="Cantidad del producto adicional"
                  className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--berry)]"
                  min="1"
                  onChange={(event) =>
                    setProductForm((current) => ({ ...current, quantity: event.target.value }))
                  }
                  placeholder="Cant."
                  type="number"
                  value={productForm.quantity}
                />
                <Button disabled={isPending} onClick={addProductItem} variant="secondary">
                  <Plus aria-hidden className="size-4" />
                </Button>
              </div>

              {form.productItems.length ? (
                <div className="mt-3 space-y-2">
                  {form.productItems.map((item) => (
                    <div className="flex items-center justify-between rounded-lg bg-[var(--cream)] px-3 py-2 text-sm border border-slate-100 hover:bg-[var(--cream)]/80 transition-colors" key={item.id}>
                      <span className="flex items-center gap-2">
                        {item.category === "BOCADITOS_SAL" && (
                          <span className="inline-flex items-center rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 ring-1 ring-inset ring-blue-700/10">🧂 Sal</span>
                        )}
                        {item.category === "BOCADITOS_DULCE" && (
                          <span className="inline-flex items-center rounded-md bg-pink-50 px-1.5 py-0.5 text-[10px] font-bold text-pink-700 ring-1 ring-inset ring-pink-700/10">🍬 Dulce</span>
                        )}
                        <span className="font-semibold text-slate-800">{item.name}</span>
                        <span className="text-slate-500 font-medium">x {item.quantity}</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <strong>{currency(item.total)}</strong>
                        <button
                          aria-label="Eliminar producto"
                          className="text-slate-400 hover:text-[var(--berry)]"
                          onClick={() => removeProductItem(item.id)}
                          type="button"
                        >
                          <X aria-hidden className="size-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-500">
                  Agrega cupcakes, galletas, postres, velas o extras al pedido.
                </p>
              )}
            </div>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Notas internas</span>
              <textarea
                className="mt-2 min-h-20 w-full resize-y rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--berry)]"
                onChange={(event) => setField("notes", event.target.value)}
                placeholder="Anticipo, indicaciones de produccion, referencias del cliente."
                value={form.notes}
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Estado</span>
              <select
                className="mt-2 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--berry)]"
                onChange={(event) => setField("status", event.target.value as CakeOrderStatus)}
                value={form.status}
              >
                {Object.entries(orderStatusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <OrderTotals totals={totals} />

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button className="flex-1" disabled={isPending} onClick={saveOrder}>
                {editingId ? <FileText aria-hidden className="size-4" /> : <Plus aria-hidden className="size-4" />}
                {isPending ? "Guardando..." : editingId ? "Guardar cambios" : "Guardar pedido"}
              </Button>
              <Button className="flex-1" disabled={isPending} onClick={clearForm} variant="secondary">
                Limpiar
              </Button>
            </div>
          </form>
        </article>
        </Modal>

        <article className="rounded-lg border border-[var(--line)] bg-white shadow-sm shadow-pink-950/5">
          <div className="flex flex-col gap-4 border-b border-[var(--line)] p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-[var(--chocolate)]">Pedidos guardados</h2>
              <p className="mt-1 text-sm text-slate-500">
                Seguimiento de produccion, entrega y facturacion.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="flex min-h-10 items-center gap-2 rounded-lg border border-[var(--line)] bg-white px-3 text-sm text-slate-500 shadow-sm lg:w-80">
                <Search aria-hidden className="size-4" />
                <input
                  aria-label="Buscar pedido"
                  className="min-w-0 flex-1 outline-none"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar pedido"
                  value={query}
                />
              </label>
              <Button onClick={openNewOrder}>
                <Plus aria-hidden className="size-4" />
                Nuevo pedido
              </Button>
            </div>
          </div>

          {filteredOrders.length ? (
            <div className="divide-y divide-[var(--line)]">
              {filteredOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  onEdit={() => editOrder(order)}
                  onRemove={() => removeOrder(order.id)}
                  onStatusChange={(status) => updateOrderStatus(order.id, status)}
                  order={order}
                  pending={isPending}
                />
              ))}
            </div>
          ) : (
            <div className="p-10 text-center">
              <CalendarClock aria-hidden className="mx-auto size-10 text-slate-300" />
              <p className="mt-3 font-semibold text-slate-700">Todavia no hay pedidos guardados.</p>
              <p className="mt-1 text-sm text-slate-500">
                Crea el primero con el boton Nuevo pedido.
              </p>
            </div>
          )}
        </article>
      </section>
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

function SelectField({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ label: string; value: string }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <select
        className="mt-2 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--berry)]"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        <option value="">Seleccionar</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function OrderTotals({
  totals,
}: {
  totals: { extrasTotal: number; productsTotal: number; subtotal: number; tax: number; total: number };
}) {
  return (
    <div className="rounded-lg border border-pink-100 bg-pink-50 p-4">
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span>Extras</span>
          <strong>{currency(totals.extrasTotal)}</strong>
        </div>
        <div className="flex justify-between">
          <span>Otros productos</span>
          <strong>{currency(totals.productsTotal)}</strong>
        </div>
        <div className="flex justify-between">
          <span>Subtotal</span>
          <strong>{currency(totals.subtotal)}</strong>
        </div>
        <div className="flex justify-between">
          <span>IVA 15%</span>
          <strong>{currency(totals.tax)}</strong>
        </div>
      </div>
      <div className="mt-3 flex justify-between border-t border-pink-200 pt-3 text-lg font-bold text-[var(--chocolate)]">
        <span>Total</span>
        <span>{currency(totals.total)}</span>
      </div>
    </div>
  );
}

function OrderCard({
  order,
  onEdit,
  onRemove,
  onStatusChange,
  pending,
}: {
  order: CakeOrder;
  onEdit: () => void;
  onRemove: () => void;
  onStatusChange: (status: CakeOrderStatus) => void;
  pending: boolean;
}) {
  return (
    <div className="perf-row p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold text-slate-950">{order.code}</h3>
            <Badge variant={statusVariant(order.status)}>{orderStatusLabels[order.status]}</Badge>
            <Badge variant="berry">{order.portionsLabel || "Pedido variado"}</Badge>
          </div>
          <p className="mt-2 text-sm font-semibold text-slate-700">{order.customerName}</p>
          <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
            <p><strong>Entrega:</strong> {shortDate(order.deliveryDate)} {order.deliveryTime || ""}</p>
            {order.flavorName ? <p><strong>Sabor:</strong> {order.flavorName}</p> : null}
            {order.fillingName ? <p><strong>Relleno:</strong> {order.fillingName}</p> : null}
            {order.coverName ? <p><strong>Cobertura:</strong> {order.coverName}</p> : null}
            {order.modelName ? <p><strong>Modelo:</strong> {order.modelName}</p> : null}
            <p><strong>Total:</strong> {currency(order.total)}</p>
          </div>
          {order.dedication ? (
            <p className="mt-2 rounded-lg bg-[var(--cream)] px-3 py-2 text-sm text-slate-600">
              Dedicatoria: {order.dedication}
            </p>
          ) : null}
          {order.extras.length ? (
            <p className="mt-2 text-sm text-slate-500">
              Extras: {order.extras.map((extra) => `${extra.name} x${extra.quantity}`).join(", ")}
            </p>
          ) : null}
          {order.productItems.length ? (
            <p className="mt-2 text-sm text-slate-500">
              Productos: {order.productItems.map((item) => `${item.name} x${item.quantity}`).join(", ")}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <select
            className="min-h-10 rounded-lg border border-[var(--line)] bg-white px-3 text-sm font-semibold outline-none focus:border-[var(--berry)]"
            disabled={pending}
            onChange={(event) => onStatusChange(event.target.value as CakeOrderStatus)}
            value={order.status}
          >
            {Object.entries(orderStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <ButtonLink href="/facturas#generar-factura" variant="secondary">
            <FileText aria-hidden className="size-4" />
            Facturar
          </ButtonLink>
          <IconButton disabled={pending} label="Editar pedido" onClick={onEdit}>
            <Pencil aria-hidden className="size-4" />
          </IconButton>
          <IconButton disabled={pending} label="Eliminar pedido" onClick={onRemove}>
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
