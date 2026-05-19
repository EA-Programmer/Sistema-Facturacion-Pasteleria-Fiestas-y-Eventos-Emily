"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Building2,
  FileText,
  Mail,
  RotateCcw,
  Save,
  ShieldCheck,
} from "lucide-react";
import {
  resetBusinessSettings,
  saveBusinessSettings,
} from "@/app/actions/settings";
import { BrandMark } from "@/components/brand/brand-mark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { BusinessSettingsForm } from "@/types/settings";

function formatSequence(value: number) {
  return String(value || 1).padStart(9, "0");
}

const storageKey = "emily-business-settings-v1";

export function SettingsManager({
  initialSettings,
}: {
  initialSettings: BusinessSettingsForm;
}) {
  const [settings, setSettings] = useState<BusinessSettingsForm>(initialSettings);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(settings));
  }, [settings]);

  const nextInvoiceNumber = useMemo(
    () =>
      `${settings.establishmentCode || "001"}-${settings.emissionPointCode || "001"}-${formatSequence(settings.invoiceSequence)}`,
    [settings.emissionPointCode, settings.establishmentCode, settings.invoiceSequence],
  );

  function setField<K extends keyof BusinessSettingsForm>(
    key: K,
    value: BusinessSettingsForm[K],
  ) {
    setMessage(null);
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function saveSettings() {
    startTransition(async () => {
      try {
        await saveBusinessSettings(settings);
        setMessage({ type: "success", text: "Configuracion guardada correctamente." });
      } catch (error) {
        setMessage({
          type: "error",
          text: error instanceof Error ? error.message : "No se pudo guardar la configuracion.",
        });
      }
    });
  }

  function resetSettings() {
    startTransition(async () => {
      try {
        const nextSettings = await resetBusinessSettings();
        setSettings(nextSettings);
        setMessage({ type: "success", text: "Valores iniciales restaurados." });
      } catch (error) {
        setMessage({
          type: "error",
          text: error instanceof Error ? error.message : "No se pudo restaurar la configuracion.",
        });
      }
    });
  }

  return (
    <div className="space-y-6">
      {message ? <FormMessage message={message} /> : null}

      <section className="grid gap-4 md:grid-cols-4">
        <SummaryCard label="Empresa" value={settings.businessName || "Sin nombre"} />
        <SummaryCard label="RUC" value={settings.ruc || "Pendiente"} />
        <SummaryCard label="Factura siguiente" value={nextInvoiceNumber} />
        <SummaryCard label="IVA" value={`${settings.taxRate || 0}%`} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <SettingsCard
            description="Datos comerciales y tributarios que se imprimiran en factura."
            icon={Building2}
            id="empresa"
            title="Empresa"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <TextField
                label="Razon social"
                onChange={(value) => setField("businessName", value)}
                placeholder="Fiestas & Eventos Emily"
                value={settings.businessName}
              />
              <TextField
                label="Nombre comercial"
                onChange={(value) => setField("tradeName", value)}
                placeholder="Emily"
                value={settings.tradeName}
              />
              <TextField
                label="RUC"
                onChange={(value) => setField("ruc", value)}
                placeholder="Ingrese RUC"
                value={settings.ruc}
              />
              <TextField
                label="Telefono"
                onChange={(value) => setField("phone", value)}
                placeholder="0999999999"
                value={settings.phone}
              />
              <TextField
                label="Correo de contacto"
                onChange={(value) => setField("email", value)}
                placeholder="correo@dominio.com"
                type="email"
                value={settings.email}
              />
              <TextField
                label="Ruta del logo"
                onChange={(value) => setField("logoPath", value)}
                placeholder="/brand/logo-emily.png"
                value={settings.logoPath}
              />
              <TextField
                className="md:col-span-2"
                label="Direccion matriz"
                onChange={(value) => setField("address", value)}
                placeholder="Direccion completa"
                value={settings.address}
              />
              <TextField
                label="Ciudad"
                onChange={(value) => setField("city", value)}
                placeholder="Machala"
                value={settings.city}
              />
              <TextField
                label="Provincia"
                onChange={(value) => setField("province", value)}
                placeholder="El Oro"
                value={settings.province}
              />
            </div>
          </SettingsCard>

          <SettingsCard
            description="Secuenciales e impuestos para facturas internas y futura autorizacion SRI."
            icon={FileText}
            title="Facturacion"
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <TextField
                label="Establecimiento"
                maxLength={3}
                onChange={(value) => setField("establishmentCode", value)}
                placeholder="001"
                value={settings.establishmentCode}
              />
              <TextField
                label="Punto de emision"
                maxLength={3}
                onChange={(value) => setField("emissionPointCode", value)}
                placeholder="001"
                value={settings.emissionPointCode}
              />
              <NumberField
                label="Secuencial siguiente"
                min={1}
                onChange={(value) => setField("invoiceSequence", value)}
                value={settings.invoiceSequence}
              />
              <NumberField
                label="IVA (%)"
                min={0}
                onChange={(value) => setField("taxRate", value)}
                step="0.01"
                value={settings.taxRate}
              />
            </div>
            <div className="mt-4 rounded-lg bg-[var(--cream)] p-4 text-sm text-slate-700">
              La siguiente factura interna se generara como <strong>{nextInvoiceNumber}</strong>.
            </div>
          </SettingsCard>

          <SettingsCard
            description="Datos que usaremos para enviar facturas por correo cuando conectemos Resend."
            icon={Mail}
            title="Correo"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <TextField
                label="Nombre del remitente"
                onChange={(value) => setField("emailFromName", value)}
                placeholder="Fiestas & Eventos Emily"
                value={settings.emailFromName}
              />
              <TextField
                label="Correo remitente"
                onChange={(value) => setField("emailFromAddress", value)}
                placeholder="facturas@dominio.com"
                type="email"
                value={settings.emailFromAddress}
              />
              <TextField
                className="md:col-span-2"
                label="Responder a"
                onChange={(value) => setField("emailReplyTo", value)}
                placeholder="contacto@dominio.com"
                type="email"
                value={settings.emailReplyTo}
              />
            </div>
          </SettingsCard>

          <SettingsCard
            description="Solo queda preparado. No conectaremos SRI hasta terminar MVP interno."
            icon={ShieldCheck}
            title="SRI"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Ambiente</span>
                <select
                  className="mt-2 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--berry)]"
                  onChange={(event) =>
                    setField("sriEnvironment", event.target.value as "PRUEBAS" | "PRODUCCION")
                  }
                  value={settings.sriEnvironment}
                >
                  <option value="PRUEBAS">Pruebas</option>
                  <option value="PRODUCCION">Produccion</option>
                </select>
              </label>

              <TextField
                label="Vencimiento firma electronica"
                onChange={(value) => setField("signatureExpiresAt", value)}
                type="date"
                value={settings.signatureExpiresAt}
              />
            </div>

            <label className="mt-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input
                checked={settings.sriEnabled}
                className="size-4 accent-[var(--berry)]"
                onChange={(event) => setField("sriEnabled", event.target.checked)}
                type="checkbox"
              />
              Activar integracion SRI cuando estemos listos
            </label>
          </SettingsCard>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button disabled={isPending} onClick={saveSettings}>
              <Save aria-hidden className="size-4" />
              {isPending ? "Guardando..." : "Guardar configuracion"}
            </Button>
            <Button disabled={isPending} onClick={resetSettings} variant="secondary">
              <RotateCcw aria-hidden className="size-4" />
              Restaurar valores iniciales
            </Button>
          </div>
        </div>

        <aside className="space-y-5">
          <section className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm shadow-pink-950/5">
            <BrandMark />
            <div className="mt-5 rounded-lg bg-[var(--cream)] p-4">
              <p className="text-xs font-bold uppercase text-slate-500">Vista para factura</p>
              <h2 className="mt-2 text-xl font-bold text-[var(--chocolate)]">
                {settings.tradeName || settings.businessName}
              </h2>
              <p className="mt-1 text-sm text-slate-600">{settings.businessName}</p>
              <p className="text-sm text-slate-600">RUC: {settings.ruc || "Pendiente"}</p>
              <p className="mt-3 text-sm text-slate-600">{settings.address || "Direccion pendiente"}</p>
              <p className="text-sm text-slate-600">
                {[settings.city, settings.province].filter(Boolean).join(", ") || "Ciudad pendiente"}
              </p>
            </div>
          </section>

          <section className="rounded-lg border border-pink-100 bg-pink-50 p-5">
            <h2 className="font-bold text-[var(--chocolate)]">Estado del sistema</h2>
            <div className="mt-4 space-y-3 text-sm">
              <StatusLine label="Datos de empresa" ready={Boolean(settings.businessName && settings.ruc)} />
              <StatusLine label="Secuencial factura" ready={Boolean(settings.establishmentCode && settings.emissionPointCode)} />
              <StatusLine label="Correo facturas" ready={Boolean(settings.emailFromAddress)} />
              <StatusLine label="SRI preparado" ready={settings.sriEnabled} />
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-lg border border-[var(--line)] bg-white p-4 shadow-sm shadow-pink-950/5">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-2 truncate text-xl font-bold text-[var(--chocolate)]">{value}</p>
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

function SettingsCard({
  title,
  description,
  icon: Icon,
  children,
  id,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section
      className="rounded-lg border border-[var(--line)] bg-white shadow-sm shadow-pink-950/5"
      id={id}
    >
      <div className="flex items-start gap-3 border-b border-[var(--line)] p-5">
        <span className="rounded-lg bg-pink-50 p-2 text-[var(--berry)]">
          <Icon aria-hidden className="size-5" />
        </span>
        <div>
          <h2 className="text-lg font-bold text-[var(--chocolate)]">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  className,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  className?: string;
  maxLength?: number;
}) {
  return (
    <label className={className ? `block ${className}` : "block"}>
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <input
        className="mt-2 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--berry)]"
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  step = "1",
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  step?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <input
        className="mt-2 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--berry)]"
        min={min}
        onChange={(event) => onChange(Number(event.target.value))}
        step={step}
        type="number"
        value={value}
      />
    </label>
  );
}

function StatusLine({ label, ready }: { label: string; ready: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
      <span className="font-semibold text-slate-700">{label}</span>
      <Badge variant={ready ? "green" : "amber"}>{ready ? "Listo" : "Pendiente"}</Badge>
    </div>
  );
}
