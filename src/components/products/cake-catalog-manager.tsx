"use client";

import { memo, useEffect, useMemo, useState, useTransition } from "react";
import { Check, Pencil, Plus, RotateCcw, Save, Trash2, X } from "lucide-react";
import {
  deleteGeneralProduct,
  saveGeneralProduct,
  toggleGeneralProductStatus,
} from "@/app/actions/products";
import {
  replaceCakeCatalogSection,
  resetCakeCatalog,
} from "@/app/actions/cake-catalog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { productCategoryLabels } from "@/lib/products-catalog";
import { currency } from "@/lib/utils";
import type {
  CakeCatalog,
  CakeCover,
  CakeFilling,
  CakeFlavor,
  CakeModel,
  CakePortion,
  GeneralProduct,
  GeneralProductCategory,
} from "@/types/product-config";

type SectionKey = keyof CakeCatalog;

type EditableItem =
  | CakePortion
  | CakeFlavor
  | CakeFilling
  | CakeCover
  | CakeModel;

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function sortCatalog(catalog: CakeCatalog): CakeCatalog {
  return {
    ...catalog,
    portions: [...catalog.portions].sort((a, b) => a.portions - b.portions),
    flavors: [...catalog.flavors].sort((a, b) => a.name.localeCompare(b.name)),
    fillings: [...catalog.fillings].sort((a, b) => a.name.localeCompare(b.name)),
    covers: [...catalog.covers].sort((a, b) => a.name.localeCompare(b.name)),
    models: [...catalog.models].sort((a, b) => a.name.localeCompare(b.name)),
  };
}

export function CakeCatalogManager({
  initialCatalog,
  initialProducts,
}: {
  initialCatalog: CakeCatalog;
  initialProducts: GeneralProduct[];
}) {
  const [catalog, setCatalog] = useState<CakeCatalog>(sortCatalog(initialCatalog));
  const [products, setProducts] = useState<GeneralProduct[]>(initialProducts);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const activeSummary = useMemo(
    () => ({
      portions: catalog.portions.filter((item) => item.active).length,
      flavors: catalog.flavors.filter((item) => item.active).length,
      fillings: catalog.fillings.filter((item) => item.active).length,
      covers: catalog.covers.filter((item) => item.active).length,
      models: catalog.models.filter((item) => item.active).length,
    }),
    [catalog],
  );

  function updateSection<T extends EditableItem>(section: SectionKey, items: T[]) {
    const previousCatalog = catalog;
    const nextCatalog = sortCatalog({ ...catalog, [section]: items } as CakeCatalog);
    setCatalog(nextCatalog);
    setMessage(null);
    startTransition(async () => {
      try {
        await replaceCakeCatalogSection(section, nextCatalog[section]);
        setMessage({ type: "success", text: "Catalogo actualizado en PostgreSQL." });
      } catch (error) {
        setCatalog(previousCatalog);
        setMessage({
          type: "error",
          text: error instanceof Error ? error.message : "No se pudo actualizar el catalogo.",
        });
      }
    });
  }

  function resetCatalog() {
    startTransition(async () => {
      try {
        const nextCatalog = await resetCakeCatalog();
        setCatalog(sortCatalog(nextCatalog));
        setMessage({ type: "success", text: "Catalogo inicial restaurado." });
      } catch (error) {
        setMessage({
          type: "error",
          text: error instanceof Error ? error.message : "No se pudo restaurar el catalogo.",
        });
      }
    });
  }

  return (
    <div className="space-y-6" id="catalogo-tortas">
      {message ? <FormMessage message={message} /> : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="Porciones" value={activeSummary.portions} helper="Precios base" />
        <SummaryCard label="Sabores" value={activeSummary.flavors} helper="Incluye especialidad" />
        <SummaryCard label="Rellenos" value={activeSummary.fillings} helper="Con recargos" />
        <SummaryCard label="Coberturas" value={activeSummary.covers} helper="Chantilly y mantequilla" />
        <SummaryCard label="Modelos" value={activeSummary.models} helper="Personalizables" />
      </section>

      <GeneralProductsCrud items={products} onChange={setProducts} />

      <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <PortionsCrud
          items={catalog.portions}
          onChange={(items) => updateSection("portions", items)}
        />
        <TextCrud
          title="Sabores"
          description="Sabores disponibles para tortas."
          addLabel="Agregar sabor"
          nameLabel="Sabor"
          items={catalog.flavors}
          kind="flavor"
          onChange={(items) => updateSection("flavors", items)}
        />
        <PricedTextCrud
          title="Rellenos"
          description="Rellenos seleccionables y recargo opcional."
          addLabel="Agregar relleno"
          nameLabel="Relleno"
          items={catalog.fillings}
          kind="filling"
          onChange={(items) => updateSection("fillings", items)}
        />
        <PricedTextCrud
          title="Coberturas"
          description="Coberturas disponibles para la torta."
          addLabel="Agregar cobertura"
          nameLabel="Cobertura"
          items={catalog.covers}
          kind="cover"
          onChange={(items) => updateSection("covers", items)}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <ModelsCrud items={catalog.models} onChange={(items) => updateSection("models", items)} />

        <aside className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm shadow-pink-950/5">
          <h2 className="text-lg font-bold text-[var(--chocolate)]">Vista para pedidos</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Estas opciones alimentaran el formulario de pedidos: primero se escoge porcion/precio, luego sabor, relleno, cobertura, modelo y dedicatoria.
          </p>

          <div className="mt-5 rounded-lg bg-[var(--cream)] p-4">
            <p className="text-sm font-bold text-slate-800">Precio base actual</p>
            <div className="mt-3 space-y-2">
              {catalog.portions
                .filter((item) => item.active)
                .map((item) => (
                  <div className="flex items-center justify-between text-sm" key={item.id}>
                    <span>{item.portions} porciones</span>
                    <strong>{currency(item.price)}</strong>
                  </div>
                ))}
            </div>
          </div>

          <Button className="mt-5 w-full" disabled={isPending} onClick={resetCatalog} variant="secondary">
            <RotateCcw aria-hidden className="size-4" />
            Restaurar catalogo inicial
          </Button>
          <p className="mt-3 text-xs text-slate-500">
            {isPending ? "Guardando cambios en PostgreSQL..." : "Cambios guardados en PostgreSQL local."}
          </p>
        </aside>
      </section>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: number;
  helper: string;
}) {
  return (
    <article className="rounded-lg border border-[var(--line)] bg-white p-4 shadow-sm shadow-pink-950/5">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-[var(--chocolate)]">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{helper}</p>
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
          ? "animate-toast-in rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700"
          : "animate-toast-in rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700"
      }
      role={message.type === "error" ? "alert" : "status"}
    >
      {message.text}
    </div>
  );
}

function SectionCard({
  title,
  description,
  children,
  defaultOpen = false,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      className="group rounded-lg border border-[var(--line)] bg-white shadow-sm shadow-pink-950/5"
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 border-b border-[var(--line)] p-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--berry)]">
        <span>
          <span className="block text-lg font-bold text-[var(--chocolate)]">{title}</span>
          <span className="mt-1 block text-sm text-slate-500">{description}</span>
        </span>
        <span className="mt-1 rounded-lg bg-pink-50 px-2 py-1 text-xs font-bold text-[var(--berry)] group-open:hidden">
          Abrir
        </span>
        <span className="mt-1 hidden rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600 group-open:inline-flex">
          Cerrar
        </span>
      </summary>
      <div className="p-5">{children}</div>
    </details>
  );
}

function GeneralProductsCrud({
  items,
  onChange,
}: {
  items: GeneralProduct[];
  onChange: (items: GeneralProduct[]) => void;
}) {
  const [formSeed, setFormSeed] = useState<GeneralProduct>(emptyGeneralProduct);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  function clearForm() {
    setEditingId(null);
    setIsFormOpen(false);
    setFormSeed(emptyGeneralProduct);
  }

  function openCreateProduct() {
    setEditingId(null);
    setFormSeed(emptyGeneralProduct);
    setMessage(null);
    setIsFormOpen(true);
  }

  function errorText(error: unknown) {
    return error instanceof Error ? error.message : "No se pudo guardar el producto.";
  }

  function saveProduct(payload: GeneralProduct) {
    startTransition(async () => {
      try {
        const savedProducts = await saveGeneralProduct(payload);
        onChange(savedProducts);
        clearForm();
        setMessage({ type: "success", text: "Producto guardado correctamente." });
      } catch (error) {
        setMessage({ type: "error", text: errorText(error) });
      }
    });
  }

  function editProduct(product: GeneralProduct) {
    setEditingId(product.id);
    setFormSeed(product);
    setMessage(null);
    setIsFormOpen(true);
  }

  function removeProduct(id: string) {
    startTransition(async () => {
      try {
        const savedProducts = await deleteGeneralProduct(id);
        onChange(savedProducts);
        if (editingId === id) clearForm();
        setMessage({ type: "success", text: "Producto eliminado o desactivado." });
      } catch (error) {
        setMessage({ type: "error", text: errorText(error) });
      }
    });
  }

  function toggleProduct(product: GeneralProduct) {
    startTransition(async () => {
      try {
        const savedProducts = await toggleGeneralProductStatus(product.id, !product.active);
        onChange(savedProducts);
        setMessage({ type: "success", text: "Estado del producto actualizado." });
      } catch (error) {
        setMessage({ type: "error", text: errorText(error) });
      }
    });
  }

  return (
    <SectionCard
      title="Productos generales"
      description="Bocaditos, cupcakes, galletas, postres, velas y extras para agregarlos a pedidos y facturas."
      defaultOpen
    >
      <div className="space-y-4">
        {message ? <FormMessage message={message} /> : null}

        <Button disabled={isPending} onClick={openCreateProduct}>
          <Plus aria-hidden className="size-4" />
          Agregar producto
        </Button>
      </div>

      <div className="mt-5 divide-y divide-[var(--line)]">
        {items.length ? (
          items.map((product) => (
            <GeneralProductRow
              key={product.id}
              onEdit={editProduct}
              onRemove={removeProduct}
              onToggle={toggleProduct}
              product={product}
            />
          ))
        ) : (
          <div className="rounded-lg bg-[var(--cream)] p-4 text-sm text-slate-600">
            Todavia no hay productos generales. Agrega aqui bocaditos, cupcakes, galletas, postres, velas o extras.
          </div>
        )}
      </div>

      <GeneralProductFormModal
        editingId={editingId}
        initialProduct={formSeed}
        message={isFormOpen ? message : null}
        onClose={clearForm}
        onSave={saveProduct}
        open={isFormOpen}
        pending={isPending}
      />
    </SectionCard>
  );
}

const emptyGeneralProduct: GeneralProduct = {
  id: "",
  name: "",
  description: "",
  category: "BOCADITOS_SAL",
  basePrice: 0,
  active: true,
};

const GeneralProductRow = memo(function GeneralProductRow({
  product,
  onEdit,
  onRemove,
  onToggle,
}: {
  product: GeneralProduct;
  onEdit: (product: GeneralProduct) => void;
  onRemove: (id: string) => void;
  onToggle: (product: GeneralProduct) => void;
}) {
  return (
    <div className="perf-row flex flex-col gap-3 py-3 xl:flex-row xl:items-center xl:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-bold text-slate-950">{product.name}</h3>
          <Badge variant={product.active ? "green" : "default"}>
            {product.active ? "Activo" : "Inactivo"}
          </Badge>
          <Badge variant="berry">{productCategoryLabels[product.category]}</Badge>
        </div>
        <p className="mt-1 text-sm font-semibold text-slate-700">{currency(product.basePrice)}</p>
        {product.description ? (
          <p className="mt-1 text-sm text-slate-500">{product.description}</p>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <StatusButton active={product.active} onClick={() => onToggle(product)} />
        <IconButton label="Editar producto" onClick={() => onEdit(product)}>
          <Pencil aria-hidden className="size-4" />
        </IconButton>
        <IconButton label="Eliminar producto" onClick={() => onRemove(product.id)}>
          <Trash2 aria-hidden className="size-4" />
        </IconButton>
      </div>
    </div>
  );
});

function GeneralProductFormModal({
  editingId,
  initialProduct,
  message,
  onClose,
  onSave,
  open,
  pending,
}: {
  editingId: string | null;
  initialProduct: GeneralProduct;
  message: { type: "error" | "success"; text: string } | null;
  onClose: () => void;
  onSave: (product: GeneralProduct) => void;
  open: boolean;
  pending: boolean;
}) {
  const [form, setForm] = useState<GeneralProduct>(initialProduct);
  const [localMessage, setLocalMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(initialProduct);
    setLocalMessage(null);
  }, [initialProduct, open]);

  function submit() {
    const payload: GeneralProduct = {
      ...form,
      id: editingId ?? createId("product"),
      name: form.name.trim(),
      description: form.description.trim(),
      basePrice: Number(form.basePrice),
    };

    if (!payload.name) {
      setLocalMessage({ type: "error", text: "Ingresa el nombre del producto." });
      return;
    }

    if (!Number.isFinite(payload.basePrice) || payload.basePrice < 0) {
      setLocalMessage({ type: "error", text: "El precio debe ser mayor o igual a cero." });
      return;
    }

    onSave(payload);
  }

  const shownMessage = localMessage ?? message;

  return (
    <Modal
      description="Completa solo los datos del producto. Al guardar, vuelve automaticamente al listado."
      onClose={onClose}
      open={open}
      title={editingId ? "Editar producto" : "Agregar producto"}
    >
      <div className="space-y-4">
        {shownMessage ? <FormMessage message={shownMessage} /> : null}

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Nombre</span>
            <input
              className="mt-2 w-full rounded-lg border border-[var(--line)] px-3 py-2.5 text-sm outline-none focus:border-[var(--berry)]"
              onChange={(event) => {
                setLocalMessage(null);
                setForm((current) => ({ ...current, name: event.target.value }));
              }}
              placeholder="Cupcake de vainilla"
              value={form.name}
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Categoria</span>
            <select
              className="mt-2 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--berry)]"
              onChange={(event) => {
                setLocalMessage(null);
                setForm((current) => ({
                  ...current,
                  category: event.target.value as GeneralProductCategory,
                }));
              }}
              value={form.category}
            >
              {Object.entries(productCategoryLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Precio base</span>
            <input
              className="mt-2 w-full rounded-lg border border-[var(--line)] px-3 py-2.5 text-sm outline-none focus:border-[var(--berry)]"
              min="0"
              onChange={(event) => {
                setLocalMessage(null);
                setForm((current) => ({ ...current, basePrice: Number(event.target.value) }));
              }}
              placeholder="0.00"
              step="0.01"
              type="number"
              value={form.basePrice}
            />
          </label>

          <div className="flex items-end">
            <StatusButton
              active={form.active}
              onClick={() => setForm((current) => ({ ...current, active: !current.active }))}
            />
          </div>
        </div>

        <label className="block">
          <span className="text-sm font-semibold text-slate-700">Descripcion</span>
          <textarea
            className="mt-2 min-h-24 w-full resize-y rounded-lg border border-[var(--line)] px-3 py-2.5 text-sm outline-none focus:border-[var(--berry)]"
            onChange={(event) => {
              setLocalMessage(null);
              setForm((current) => ({ ...current, description: event.target.value }));
            }}
            placeholder="Unidad, presentacion, sabor o nota interna."
            value={form.description}
          />
        </label>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button disabled={pending} onClick={onClose} variant="secondary">
            Cancelar
          </Button>
          <Button disabled={pending} onClick={submit}>
            <Save aria-hidden className="size-4" />
            {pending ? "Guardando..." : "Guardar producto"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function StatusButton({
  active,
  onClick,
}: {
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="focus-ring inline-flex min-h-9 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-3 text-xs font-bold text-slate-700 hover:bg-pink-50"
      onClick={onClick}
      type="button"
    >
      {active ? <Check aria-hidden className="mr-1 size-3.5 text-emerald-600" /> : <X aria-hidden className="mr-1 size-3.5 text-slate-400" />}
      {active ? "Activo" : "Inactivo"}
    </button>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      aria-label={label}
      className="focus-ring grid size-9 place-items-center rounded-lg border border-[var(--line)] bg-white text-slate-600 hover:bg-pink-50 hover:text-[var(--berry)]"
      onClick={onClick}
      type="button"
      title={label}
    >
      {children}
    </button>
  );
}

function PortionsCrud({
  items,
  onChange,
}: {
  items: CakePortion[];
  onChange: (items: CakePortion[]) => void;
}) {
  const [form, setForm] = useState({ portions: "", price: "" });
  const [editingId, setEditingId] = useState<string | null>(null);

  function saveItem() {
    const portions = Number(form.portions);
    const price = Number(form.price);
    if (!portions || price < 0) return;

    if (editingId) {
      onChange(
        items.map((item) =>
          item.id === editingId ? { ...item, portions, price } : item,
        ),
      );
    } else {
      onChange([...items, { id: createId("portion"), portions, price, active: true }]);
    }

    setEditingId(null);
    setForm({ portions: "", price: "" });
  }

  return (
    <SectionCard title="Porciones y precios" description="Define el precio base de cada torta por numero de porciones.">
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <input
          aria-label="Numero de porciones"
          className="rounded-lg border border-[var(--line)] px-3 py-2.5 text-sm outline-none focus:border-[var(--berry)]"
          min="1"
          onChange={(event) => setForm((current) => ({ ...current, portions: event.target.value }))}
          placeholder="Porciones"
          type="number"
          value={form.portions}
        />
        <input
          aria-label="Precio de la porcion"
          className="rounded-lg border border-[var(--line)] px-3 py-2.5 text-sm outline-none focus:border-[var(--berry)]"
          min="0"
          onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))}
          placeholder="Precio"
          step="0.01"
          type="number"
          value={form.price}
        />
        <Button onClick={saveItem}>
          {editingId ? <Save aria-hidden className="size-4" /> : <Plus aria-hidden className="size-4" />}
          {editingId ? "Guardar" : "Agregar"}
        </Button>
      </div>

      <div className="mt-4 divide-y divide-[var(--line)]">
        {items.map((item) => (
          <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between" key={item.id}>
            <div>
              <p className="font-semibold text-slate-950">{item.portions} porciones</p>
              <p className="text-sm text-slate-500">{currency(item.price)}</p>
            </div>
            <div className="flex items-center gap-2">
              <StatusButton
                active={item.active}
                onClick={() => onChange(items.map((row) => row.id === item.id ? { ...row, active: !row.active } : row))}
              />
              <IconButton
                label="Editar porcion"
                onClick={() => {
                  setEditingId(item.id);
                  setForm({ portions: String(item.portions), price: String(item.price) });
                }}
              >
                <Pencil aria-hidden className="size-4" />
              </IconButton>
              <IconButton label="Eliminar porcion" onClick={() => onChange(items.filter((row) => row.id !== item.id))}>
                <Trash2 aria-hidden className="size-4" />
              </IconButton>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function TextCrud({
  title,
  description,
  addLabel,
  nameLabel,
  items,
  kind,
  onChange,
}: {
  title: string;
  description: string;
  addLabel: string;
  nameLabel: string;
  items: CakeFlavor[];
  kind: string;
  onChange: (items: CakeFlavor[]) => void;
}) {
  const [name, setName] = useState("");
  const [specialty, setSpecialty] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  function saveItem() {
    const cleanName = name.trim();
    if (!cleanName) return;

    if (editingId) {
      onChange(items.map((item) => item.id === editingId ? { ...item, name: cleanName, specialty } : item));
    } else {
      onChange([...items, { id: createId(kind), name: cleanName, specialty, active: true }]);
    }

    setName("");
    setSpecialty(false);
    setEditingId(null);
  }

  return (
    <SectionCard title={title} description={description}>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <input
          aria-label={nameLabel}
          className="rounded-lg border border-[var(--line)] px-3 py-2.5 text-sm outline-none focus:border-[var(--berry)]"
          onChange={(event) => setName(event.target.value)}
          placeholder={nameLabel}
          value={name}
        />
        <Button onClick={saveItem}>
          {editingId ? <Save aria-hidden className="size-4" /> : <Plus aria-hidden className="size-4" />}
          {editingId ? "Guardar" : addLabel}
        </Button>
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
        <input
          checked={specialty}
          className="size-4 accent-[var(--berry)]"
          onChange={(event) => setSpecialty(event.target.checked)}
          type="checkbox"
        />
        Especialidad de la casa
      </label>

      <div className="mt-4 flex flex-wrap gap-2">
        {items.map((item) => (
          <div className="flex items-center gap-2 rounded-lg border border-[var(--line)] bg-white p-2" key={item.id}>
            <Badge variant={item.specialty ? "berry" : item.active ? "green" : "default"}>
              {item.name}
            </Badge>
            <StatusButton
              active={item.active}
              onClick={() => onChange(items.map((row) => row.id === item.id ? { ...row, active: !row.active } : row))}
            />
            <IconButton
              label="Editar sabor"
              onClick={() => {
                setEditingId(item.id);
                setName(item.name);
                setSpecialty(Boolean(item.specialty));
              }}
            >
              <Pencil aria-hidden className="size-4" />
            </IconButton>
            <IconButton label="Eliminar sabor" onClick={() => onChange(items.filter((row) => row.id !== item.id))}>
              <Trash2 aria-hidden className="size-4" />
            </IconButton>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function PricedTextCrud<T extends CakeFilling | CakeCover>({
  title,
  description,
  addLabel,
  nameLabel,
  items,
  kind,
  onChange,
}: {
  title: string;
  description: string;
  addLabel: string;
  nameLabel: string;
  items: T[];
  kind: string;
  onChange: (items: T[]) => void;
}) {
  const [form, setForm] = useState({ name: "", extraPrice: "" });
  const [editingId, setEditingId] = useState<string | null>(null);

  function saveItem() {
    const name = form.name.trim();
    const extraPrice = Number(form.extraPrice || "0");
    if (!name || extraPrice < 0) return;

    if (editingId) {
      onChange(items.map((item) => item.id === editingId ? { ...item, name, extraPrice } : item) as T[]);
    } else {
      onChange([...items, { id: createId(kind), name, extraPrice, active: true } as T]);
    }

    setForm({ name: "", extraPrice: "" });
    setEditingId(null);
  }

  return (
    <SectionCard title={title} description={description}>
      <div className="grid gap-3 sm:grid-cols-[1fr_150px_auto]">
        <input
          aria-label={nameLabel}
          className="rounded-lg border border-[var(--line)] px-3 py-2.5 text-sm outline-none focus:border-[var(--berry)]"
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          placeholder={nameLabel}
          value={form.name}
        />
        <input
          aria-label={`Recargo de ${nameLabel.toLowerCase()}`}
          className="rounded-lg border border-[var(--line)] px-3 py-2.5 text-sm outline-none focus:border-[var(--berry)]"
          min="0"
          onChange={(event) => setForm((current) => ({ ...current, extraPrice: event.target.value }))}
          placeholder="Recargo"
          step="0.01"
          type="number"
          value={form.extraPrice}
        />
        <Button onClick={saveItem}>
          {editingId ? <Save aria-hidden className="size-4" /> : <Plus aria-hidden className="size-4" />}
          {editingId ? "Guardar" : addLabel}
        </Button>
      </div>

      <div className="mt-4 divide-y divide-[var(--line)]">
        {items.map((item) => (
          <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between" key={item.id}>
            <div>
              <p className="font-semibold text-slate-950">{item.name}</p>
              <p className="text-sm text-slate-500">Recargo: {currency(item.extraPrice)}</p>
            </div>
            <div className="flex items-center gap-2">
              <StatusButton
                active={item.active}
                onClick={() => onChange(items.map((row) => row.id === item.id ? { ...row, active: !row.active } : row) as T[])}
              />
              <IconButton
                label={`Editar ${nameLabel.toLowerCase()}`}
                onClick={() => {
                  setEditingId(item.id);
                  setForm({ name: item.name, extraPrice: String(item.extraPrice) });
                }}
              >
                <Pencil aria-hidden className="size-4" />
              </IconButton>
              <IconButton label={`Eliminar ${nameLabel.toLowerCase()}`} onClick={() => onChange(items.filter((row) => row.id !== item.id))}>
                <Trash2 aria-hidden className="size-4" />
              </IconButton>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function ModelsCrud({
  items,
  onChange,
}: {
  items: CakeModel[];
  onChange: (items: CakeModel[]) => void;
}) {
  const [form, setForm] = useState({ name: "", extraPrice: "" });
  const [editingId, setEditingId] = useState<string | null>(null);

  function saveItem() {
    const name = form.name.trim();
    const extraPrice = Number(form.extraPrice || "0");
    if (!name || extraPrice < 0) return;

    if (editingId) {
      onChange(items.map((item) => item.id === editingId ? { ...item, name, extraPrice, customizable: true } : item));
    } else {
      onChange([...items, { id: createId("model"), name, extraPrice, customizable: true, active: true }]);
    }

    setForm({ name: "", extraPrice: "" });
    setEditingId(null);
  }

  return (
    <SectionCard title="Modelos" description="Todos los modelos quedan marcados como personalizables.">
      <div className="grid gap-3 sm:grid-cols-[1fr_150px_auto]">
        <input
          aria-label="Nombre del modelo"
          className="rounded-lg border border-[var(--line)] px-3 py-2.5 text-sm outline-none focus:border-[var(--berry)]"
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          placeholder="Modelo"
          value={form.name}
        />
        <input
          aria-label="Recargo del modelo"
          className="rounded-lg border border-[var(--line)] px-3 py-2.5 text-sm outline-none focus:border-[var(--berry)]"
          min="0"
          onChange={(event) => setForm((current) => ({ ...current, extraPrice: event.target.value }))}
          placeholder="Recargo"
          step="0.01"
          type="number"
          value={form.extraPrice}
        />
        <Button onClick={saveItem}>
          {editingId ? <Save aria-hidden className="size-4" /> : <Plus aria-hidden className="size-4" />}
          {editingId ? "Guardar" : "Agregar modelo"}
        </Button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {items.map((item) => (
          <div className="rounded-lg border border-[var(--line)] bg-white p-4" key={item.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-950">{item.name}</h3>
                <p className="mt-1 text-sm text-slate-500">Recargo: {currency(item.extraPrice)}</p>
              </div>
              <Badge variant="berry">Personalizable</Badge>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <StatusButton
                active={item.active}
                onClick={() => onChange(items.map((row) => row.id === item.id ? { ...row, active: !row.active } : row))}
              />
              <IconButton
                label="Editar modelo"
                onClick={() => {
                  setEditingId(item.id);
                  setForm({ name: item.name, extraPrice: String(item.extraPrice) });
                }}
              >
                <Pencil aria-hidden className="size-4" />
              </IconButton>
              <IconButton label="Eliminar modelo" onClick={() => onChange(items.filter((row) => row.id !== item.id))}>
                <Trash2 aria-hidden className="size-4" />
              </IconButton>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
