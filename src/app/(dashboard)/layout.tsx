import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requireAdminSession } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await requireAdminSession();

  return <DashboardShell user={session.user}>{children}</DashboardShell>;
}
