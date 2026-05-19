import { cn } from "@/lib/utils";

const variants = {
  default: "bg-slate-100 text-slate-700 ring-slate-200",
  berry: "bg-rose-50 text-rose-700 ring-rose-200",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  blue: "bg-sky-50 text-sky-700 ring-sky-200",
} as const;

type BadgeProps = {
  children: React.ReactNode;
  variant?: keyof typeof variants;
};

export function Badge({ children, variant = "default" }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1",
        variants[variant],
      )}
    >
      {children}
    </span>
  );
}
