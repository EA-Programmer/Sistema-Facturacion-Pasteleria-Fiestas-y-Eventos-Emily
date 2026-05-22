import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const adminSessionCookie = "emily_admin_session";
const sessionDays = 7;

function sessionExpiresAt() {
  const expires = new Date();
  expires.setDate(expires.getDate() + sessionDays);
  return expires;
}

export async function createAdminSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expires = sessionExpiresAt();

  await prisma.session.create({
    data: {
      sessionToken: token,
      userId,
      expires,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(adminSessionCookie, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });
}

export async function getAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(adminSessionCookie)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { sessionToken: token },
    include: { user: true },
  });

  if (!session || session.expires < new Date()) {
    if (session) {
      await prisma.session.delete({ where: { sessionToken: token } }).catch(() => null);
    }
    return null;
  }

  return {
    token,
    user: {
      id: session.user.id,
      name: session.user.name ?? "Admin",
      email: session.user.email,
      role: session.user.role,
    },
  };
}

export async function requireAdminSession() {
  const session = await getAdminSession();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") {
    redirect("/login");
  }
  return session;
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(adminSessionCookie)?.value;

  if (token) {
    await prisma.session.delete({ where: { sessionToken: token } }).catch(() => null);
  }

  cookieStore.delete(adminSessionCookie);
}
