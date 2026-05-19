import { ButtonLink } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description: string;
  actionLabel?: string;
  actionIcon?: LucideIcon;
  actionHref?: React.ComponentProps<typeof ButtonLink>["href"];
};

export function PageHeader({
  eyebrow,
  title,
  description,
  actionLabel,
  actionIcon: ActionIcon,
  actionHref,
}: PageHeaderProps) {
  return (
    <div className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm shadow-pink-950/5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-3xl">
          {eyebrow ? (
            <p className="text-sm font-bold uppercase tracking-wide text-[var(--berry)]">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="mt-1 text-2xl font-bold text-[var(--chocolate)] sm:text-3xl">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        </div>
        {actionLabel && actionHref ? (
          <ButtonLink className="w-full sm:w-auto" href={actionHref}>
            {ActionIcon ? <ActionIcon aria-hidden className="size-4" /> : null}
            {actionLabel}
          </ButtonLink>
        ) : null}
      </div>
    </div>
  );
}
