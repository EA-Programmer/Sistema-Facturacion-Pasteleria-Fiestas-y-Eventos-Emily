"use server";

import { redirect } from "next/navigation";
import { clearAdminSession, createAdminSession } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

export type LoginState = {
  error?: string;
};

export async function loginAction(_state: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Ingresa correo y contrasena." };
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user?.passwordHash) {
    return { error: "Credenciales incorrectas." };
  }

  const passwordOk = await verifyPassword(password, user.passwordHash);
  if (!passwordOk) {
    return { error: "Credenciales incorrectas." };
  }

  await createAdminSession(user.id);
  redirect("/");
}

export async function logoutAction() {
  await clearAdminSession();
  redirect("/login");
}
