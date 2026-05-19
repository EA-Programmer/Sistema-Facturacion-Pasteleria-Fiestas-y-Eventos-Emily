"use client";

import { useActionState } from "react";
import { LockKeyhole, LogIn, Mail } from "lucide-react";
import { loginAction, type LoginState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="mt-8 space-y-4">
      <label className="block">
        <span className="text-sm font-semibold text-slate-700">Correo</span>
        <span className="mt-2 flex items-center gap-2 rounded-lg border border-[var(--line)] bg-slate-50 px-3 py-2.5">
          <Mail aria-hidden className="size-4 text-slate-400" />
          <input
            autoComplete="email"
            className="w-full bg-transparent text-sm outline-none"
            defaultValue="admin@emily.local"
            name="email"
            placeholder="admin@emily.local"
            type="email"
          />
        </span>
      </label>

      <label className="block">
        <span className="text-sm font-semibold text-slate-700">Contrasena</span>
        <span className="mt-2 flex items-center gap-2 rounded-lg border border-[var(--line)] bg-slate-50 px-3 py-2.5">
          <LockKeyhole aria-hidden className="size-4 text-slate-400" />
          <input
            autoComplete="current-password"
            className="w-full bg-transparent text-sm outline-none"
            name="password"
            placeholder="********"
            type="password"
          />
        </span>
      </label>

      {state.error ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
          {state.error}
        </p>
      ) : null}

      <Button className="w-full" disabled={isPending} type="submit">
        <LogIn aria-hidden className="size-4" />
        {isPending ? "Ingresando..." : "Ingresar"}
      </Button>
    </form>
  );
}
