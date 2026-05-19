import Link from "next/link";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

const variants = {
  primary:
    "bg-[var(--berry)] text-white shadow-sm shadow-pink-950/10 hover:bg-[var(--berry-dark)]",
  secondary:
    "border border-[var(--line)] bg-white text-slate-800 shadow-sm hover:bg-pink-50 hover:text-[var(--berry-dark)]",
  ghost: "text-slate-700 hover:bg-slate-100",
};

export function buttonClasses({
  className,
  variant = "primary",
}: {
  className?: string;
  variant?: "primary" | "secondary" | "ghost";
} = {}) {
  return cn(
    "focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-55",
    variants[variant],
    className,
  );
}

export function Button({
  className,
  variant = "primary",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClasses({ className, variant })}
      {...props}
    />
  );
}

type ButtonLinkProps = React.ComponentProps<typeof Link> & {
  children: React.ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "ghost";
};

export function ButtonLink({
  children,
  className,
  variant = "primary",
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={buttonClasses({ className, variant })} {...props}>
      {children}
    </Link>
  );
}
