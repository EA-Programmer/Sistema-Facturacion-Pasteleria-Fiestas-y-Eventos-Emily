import Image from "next/image";
import { notFound } from "next/navigation";
import { proformaStatusLabels } from "@/lib/proformas-catalog";
import { prisma } from "@/lib/prisma";
import { getBusinessSettings } from "@/lib/settings-db";
import { currency, shortDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

function normalizeToken(value: string) {
  return decodeURIComponent(value).trim();
}

function maskDocument(value: string) {
  if (value.length <= 6) return "Documento registrado";
  return `${value.slice(0, 3)}****${value.slice(-3)}`;
}

export default async function VerifyProformaPage({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  const { number } = await params;
  const proformaId = normalizeToken(number);

  if (!/^[A-Za-z0-9_-]{1,120}$/.test(proformaId)) {
    notFound();
  }

  const [settings, proforma] = await Promise.all([
    getBusinessSettings(),
    prisma.proforma.findUnique({
      where: { id: proformaId },
      include: {
        customer: {
          select: {
            name: true,
            document: true,
          },
        },
        items: {
          select: {
            name: true,
            quantity: true,
          },
          orderBy: { id: "asc" },
        },
      },
    }),
  ]);

  if (!proforma) notFound();

  return (
    <main className="min-h-screen bg-[var(--cream)] px-4 py-8">
      <section className="mx-auto max-w-2xl rounded-lg border border-pink-100 bg-white p-6 shadow-xl shadow-pink-950/10">
        <div className="flex flex-col gap-5 border-b border-[var(--line)] pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {settings.logoPath ? (
              <Image
                alt="Logo Fiestas & Eventos Emily"
                className="size-16 object-contain"
                height={64}
                src={settings.logoPath}
                width={64}
              />
            ) : null}
            <div>
              <p className="text-sm font-bold uppercase text-[var(--berry)]">Verificacion de proforma</p>
              <h1 className="mt-1 text-2xl font-bold text-[var(--chocolate)]">
                {settings.tradeName || settings.businessName}
              </h1>
            </div>
          </div>
          <span className="rounded-lg bg-pink-50 px-3 py-2 text-sm font-bold text-[var(--berry)]">
            {proformaStatusLabels[proforma.status]}
          </span>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Info label="Numero" value={proforma.number} />
          <Info label="Emision" value={shortDate(proforma.issueDate.toISOString())} />
          <Info label="Cliente" value={proforma.customer.name} />
          <Info label="Documento" value={maskDocument(proforma.customer.document)} />
          <Info label="Total" value={currency(Number(proforma.total))} />
          <Info label="Validez" value={proforma.validUntil ? shortDate(proforma.validUntil.toISOString()) : "Por confirmar"} />
        </div>

        <div className="mt-6 rounded-lg border border-[var(--line)] bg-[var(--cream)] p-4">
          <h2 className="font-bold text-[var(--chocolate)]">Detalle resumido</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            {proforma.items.map((item) => (
              <li className="flex justify-between gap-3" key={`${item.name}-${item.quantity}`}>
                <span>{item.name}</span>
                <strong>x {item.quantity}</strong>
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-6 text-xs leading-5 text-slate-500">
          Esta verificacion confirma que la proforma fue generada por el sistema interno de
          {` ${settings.tradeName || settings.businessName}`}. No representa una factura ni un
          comprobante tributario autorizado por el SRI.
        </p>
      </section>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--line)] bg-white p-4">
      <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-950">{value}</p>
    </div>
  );
}
