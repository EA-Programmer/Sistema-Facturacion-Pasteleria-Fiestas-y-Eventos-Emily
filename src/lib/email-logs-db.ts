import { prisma } from "@/lib/prisma";
import type { EmailDeliveryStatus, InvoiceEmailLog } from "@/types/email";

function toEmailStatus(value: string): EmailDeliveryStatus {
  if (value === "ENVIADO" || value === "ERROR") return value;
  return "SIMULADO";
}

export async function getInvoiceEmailLogs(): Promise<InvoiceEmailLog[]> {
  const logs = await prisma.invoiceEmailLog.findMany({
    orderBy: { sentAt: "desc" },
  });

  return logs.map((log) => ({
    id: log.id,
    invoiceId: log.invoiceId,
    invoiceNumber: log.invoiceNumber,
    to: log.to,
    from: log.from,
    subject: log.subject,
    body: log.body,
    status: toEmailStatus(log.status),
    sentAt: log.sentAt.toISOString(),
  }));
}
