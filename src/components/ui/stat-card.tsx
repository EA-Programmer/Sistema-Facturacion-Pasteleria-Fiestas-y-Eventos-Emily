import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  value: string;
  helper: string;
  icon: LucideIcon;
  tone?: "berry" | "green" | "amber" | "blue";
};

const tones = {
  berry: "bg-rose-50 text-rose-700",
  green: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-800",
  blue: "bg-sky-50 text-sky-700",
};

export function StatCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = "berry",
}: StatCardProps) {
  return (
    <article className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm shadow-pink-950/5 transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold text-[var(--chocolate)]">{value}</p>
        </div>
        <span className={cn("rounded-lg p-2.5", tones[tone])}>
          <Icon aria-hidden className="size-5" />
        </span>
      </div>
      <p className="mt-4 border-t border-slate-100 pt-3 text-sm text-slate-500">{helper}</p>
    </article>
  );
}
