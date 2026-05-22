import { BrandMark } from "@/components/brand/brand-mark";

export default function DashboardLoading() {
  return (
    <div className="animate-page-enter space-y-6" role="status" aria-live="polite">
      <div className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm shadow-pink-950/5">
        <BrandMark />
        <div className="mt-5 h-3 w-52 rounded-full bg-pink-100" />
        <div className="mt-3 h-3 w-80 max-w-full rounded-full bg-slate-100" />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div className="rounded-lg border border-[var(--line)] bg-white p-4 shadow-sm" key={index}>
            <div className="h-3 w-24 rounded-full bg-slate-100" />
            <div className="mt-4 h-8 w-20 rounded-full bg-pink-100" />
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
        <div className="h-4 w-40 rounded-full bg-slate-100" />
        <div className="mt-5 space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div className="h-12 rounded-lg bg-slate-50" key={index} />
          ))}
        </div>
      </div>

      <span className="sr-only">Cargando seccion</span>
    </div>
  );
}
