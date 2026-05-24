"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { LogOut, Sparkles, UserRound } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { BrandMark } from "@/components/brand/brand-mark";
import { brand } from "@/lib/brand";
import { navigationItems } from "@/lib/navigation";
import { cn } from "@/lib/utils";

type DashboardShellProps = {
  children: React.ReactNode;
  user: {
    name: string;
    email: string;
  };
};

export function DashboardShell({ children, user }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    navigationItems.forEach((item) => router.prefetch(item.href as never));
  }, [router]);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[280px_1fr]">
      <a
        className="focus-ring sr-only fixed left-4 top-4 z-50 rounded-lg bg-white px-4 py-2 text-sm font-bold text-[var(--berry)] shadow focus:not-sr-only"
        href="#contenido-principal"
      >
        Saltar al contenido
      </a>
      <aside className="hidden border-r border-[var(--line)] bg-white/92 px-4 py-5 shadow-[8px_0_30px_rgba(74,33,15,0.04)] backdrop-blur lg:block">
        <BrandMark className="px-2" />

        <div className="mt-5 rounded-lg border border-pink-100 bg-[var(--icing)] p-3">
          <div className="flex items-start gap-2">
            <span className="rounded-md bg-white p-1.5 text-[var(--berry)] shadow-sm">
              <Sparkles aria-hidden className="size-4" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase text-[var(--berry-dark)]">Panel interno</p>
              <p className="mt-1 text-xs leading-5 text-slate-600">{brand.tagline}</p>
            </div>
          </div>
        </div>

        <nav aria-label="Navegacion principal" className="mt-8 space-y-1">
          {navigationItems.map((item) => {
            const isActive =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href as never}
                prefetch
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-pink-50 hover:text-[var(--berry)]",
                  isActive && "bg-pink-50 text-[var(--berry)] shadow-sm ring-1 ring-pink-100",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon aria-hidden className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-white/90 backdrop-blur">
          <div className="flex min-h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 lg:hidden">
              <BrandMark compact />
            </div>

            <div className="ml-auto flex items-center gap-2">
              <div className="focus-ring flex min-h-10 items-center gap-2 rounded-lg border border-[var(--line)] bg-white px-2.5 text-sm font-semibold text-slate-700">
                <UserRound aria-hidden className="size-4" />
                <span className="hidden sm:inline">{user.name}</span>
              </div>
              <form action={logoutAction}>
                <button
                  aria-label="Cerrar sesion"
                  className="focus-ring grid size-10 place-items-center rounded-lg border border-[var(--line)] bg-white text-slate-700 hover:bg-pink-50 hover:text-[var(--berry)]"
                  title="Cerrar sesion"
                  type="submit"
                >
                  <LogOut aria-hidden className="size-4" />
                </button>
              </form>
            </div>
          </div>

          <nav
            aria-label="Navegacion principal movil"
            className="flex gap-2 overflow-x-auto px-4 pb-3 lg:hidden"
          >
            {navigationItems.map((item) => {
              const isActive =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href as never}
                  prefetch
                  className={cn(
                    "inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600",
                    isActive && "bg-pink-50 text-[var(--berry)]",
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon aria-hidden className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>

        <main
          className="animate-page-enter px-4 py-6 sm:px-6 lg:px-8"
          id="contenido-principal"
          tabIndex={-1}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
