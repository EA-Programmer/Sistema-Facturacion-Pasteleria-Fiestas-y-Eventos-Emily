"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isSameOriginRequest, requireSameOriginRequest } from "@/lib/action-security";
import { clearAdminSession, createAdminSession } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

export type LoginState = {
  error?: string;
};

const loginAttempts = new Map<string, { count: number; firstAttempt: number }>();
const loginWindowMs = 15 * 60 * 1000;
const maxLoginAttempts = 5;

async function loginAttemptKey(email: string) {
  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = headerStore.get("x-real-ip")?.trim();
  return `${forwardedFor || realIp || "local"}:${email}`;
}

function isRateLimited(key: string) {
  const now = Date.now();
  const attempt = loginAttempts.get(key);
  if (!attempt) return false;

  if (now - attempt.firstAttempt > loginWindowMs) {
    loginAttempts.delete(key);
    return false;
  }

  return attempt.count >= maxLoginAttempts;
}

function recordFailedLogin(key: string) {
  const now = Date.now();
  const attempt = loginAttempts.get(key);

  if (!attempt || now - attempt.firstAttempt > loginWindowMs) {
    loginAttempts.set(key, { count: 1, firstAttempt: now });
    return;
  }

  loginAttempts.set(key, { count: attempt.count + 1, firstAttempt: attempt.firstAttempt });
}

export async function loginAction(_state: LoginState, formData: FormData): Promise<LoginState> {
  if (!(await isSameOriginRequest())) {
    return { error: "La solicitud fue bloqueada por seguridad. Vuelve a cargar la pagina." };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Ingresa correo y contrasena." };
  }

  if (email.length > 254 || password.length > 200) {
    return { error: "Credenciales incorrectas." };
  }

  const attemptKey = await loginAttemptKey(email);
  if (isRateLimited(attemptKey)) {
    return { error: "Demasiados intentos. Espera unos minutos antes de volver a intentar." };
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user?.passwordHash) {
    recordFailedLogin(attemptKey);
    return { error: "Credenciales incorrectas." };
  }

  const passwordOk = await verifyPassword(password, user.passwordHash);
  if (!passwordOk) {
    recordFailedLogin(attemptKey);
    return { error: "Credenciales incorrectas." };
  }

  loginAttempts.delete(attemptKey);
  await createAdminSession(user.id);
  redirect("/");
}

export async function logoutAction() {
  await requireSameOriginRequest();
  await clearAdminSession();
  redirect("/login");
}
