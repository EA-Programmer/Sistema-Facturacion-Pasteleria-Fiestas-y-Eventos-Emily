"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { existsSync } from "fs";
import { readFile } from "fs/promises";
import { requireSameOriginRequest } from "@/lib/action-security";
import { requireAdminSession } from "@/lib/auth";
import { extractEmailAddress } from "@/lib/email-address";
import { getInternalInvoices, statusToPrisma } from "@/lib/invoices-db";
import { prisma } from "@/lib/prisma";
import { getBusinessSettings, settingsId } from "@/lib/settings-db";
import { enqueueSriJob, processSriJob, retryDueSriJobs } from "@/lib/sri-electronic";
import { buildSriInvoiceXml } from "@/lib/sri-xml";
import { generateInvoicePdfBuffer } from "@/lib/pdf-generator";
import { generateInvoiceHtmlEmail } from "@/lib/email-templates";
import { sendEmail } from "@/lib/email-sender";
import {
  AppValidationError,
  assertAllowedValue,
  assertSafeId,
  cleanEmailHeader,
  cleanText,
  failValidation,
  isValidEmail,
  validateCustomerDocument,
} from "@/lib/validation";
import type { InvoiceEmailLog } from "@/types/email";
import type { InternalInvoiceStatus } from "@/types/invoice";

const invoiceStatuses = [
  "PENDIENTE",
  "GENERADA_XML",
  "FIRMADA",
  "ENVIADA_SRI",
  "RECIBIDA",
  "EMITIDA",
  "ENVIADA",
  "AUTORIZADA",
  "DEVUELTA",
  "NO_AUTORIZADA",
  "ERROR_CONEXION",
  "ANULADA",
] as const satisfies readonly InternalInvoiceStatus[];

function formatSequence(value: number) {
  return String(value || 1).padStart(9, "0");
}

async function refreshInvoices() {
  revalidatePath("/facturas");
  revalidatePath("/pagos");
  revalidatePath("/reportes");
  revalidatePath("/");
  return getInternalInvoices();
}

function toActionMessage(error: unknown, fallback: string) {
  if (error instanceof AppValidationError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

async function createInvoiceNumber() {
  const settings = await prisma.businessSettings.findUnique({
    where: { id: settingsId },
    select: {
      establishmentCode: true,
      emissionPointCode: true,
      invoiceSequence: true,
    },
  });

  const establishmentCode = settings?.establishmentCode || "001";
  const emissionPointCode = settings?.emissionPointCode || "001";
  const invoiceSequence = settings?.invoiceSequence || 1;

  return {
    number: `${establishmentCode}-${emissionPointCode}-${formatSequence(invoiceSequence)}`,
    nextSequence: invoiceSequence + 1,
  };
}

export async function generateInvoice(orderId: string) {
  await requireSameOriginRequest();
  await requireAdminSession();
  const selectedOrderId = assertSafeId(orderId, "identificador del pedido");

  const order = await prisma.order.findUnique({
    where: { id: selectedOrderId },
    select: {
      id: true,
      customerId: true,
      status: true,
      subtotal: true,
      tax: true,
      total: true,
      customer: true,
      invoice: { select: { id: true } },
    },
  });

  if (!order) {
    failValidation("No se encontro el pedido seleccionado.");
  }

  if (order.invoice) {
    return {
      invoices: await refreshInvoices(),
      selectedInvoiceId: order.invoice.id,
    };
  }

  if (!["CONFIRMADO", "LISTO", "ENTREGADO"].includes(order.status)) {
    failValidation("Solo puedes facturar pedidos confirmados, listos o entregados.");
  }

  if (!validateCustomerDocument(order.customer.documentType, order.customer.document)) {
    failValidation("El cliente del pedido no tiene una identificacion valida para facturar.");
  }

  if (order.customer.documentType !== "CONSUMIDOR_FINAL" && !order.customer.address?.trim()) {
    failValidation("El cliente del pedido necesita direccion de facturacion.");
  }

  const { number, nextSequence } = await createInvoiceNumber();
  let selectedInvoiceId = "";

  await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.create({
      data: {
        number,
        orderId: order.id,
        customerId: order.customerId,
        status: "BORRADOR",
        subtotal: order.subtotal,
        tax: order.tax,
        total: order.total,
        issuedAt: new Date(),
      },
      select: { id: true },
    });

    selectedInvoiceId = invoice.id;

    await tx.businessSettings.update({
      where: { id: settingsId },
      data: { invoiceSequence: nextSequence },
    });

    await tx.payment.updateMany({
      where: {
        orderId: order.id,
        invoiceId: null,
      },
      data: { invoiceId: invoice.id },
    });
  });

  // Automatizar la emisión y firma electrónica SRI si está activa en la configuración
  try {
    const settings = await prisma.businessSettings.findUnique({
      where: { id: settingsId },
      select: { sriEnabled: true, signatureFilePath: true },
    });
    if (settings?.sriEnabled && settings?.signatureFilePath) {
      const job = await enqueueSriJob(selectedInvoiceId);
      await processSriJob(job.id);
    }
  } catch (error) {
    console.error("Error en la emisión automática al SRI al generar factura:", error);
  }

  return {
    invoices: await refreshInvoices(),
    selectedInvoiceId,
  };
}

export async function recordInvoiceEmail(log: InvoiceEmailLog) {
  await requireSameOriginRequest();
  await requireAdminSession();

  const invoiceId = assertSafeId(log.invoiceId, "identificador de la factura");
  const to = cleanText(log.to, "El correo de destino", 160, true);
  const subject = cleanEmailHeader(log.subject, "El asunto", 140);
  const body = cleanText(log.body, "El mensaje del correo", 1000);
  if (!isValidEmail(to)) failValidation("Ingresa un correo valido para enviar la factura.");

  // 1. Obtener la factura de la base de datos
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { id: true, number: true, status: true, sriAccessKey: true },
  });

  if (!invoice) failValidation("No se encontro la factura seleccionada.");

  const settings = await prisma.businessSettings.findUnique({
    where: { id: settingsId },
  });
  if (!settings) failValidation("Configura los datos de la empresa antes de enviar correos.");

  // Automatizar la emisión y firma electrónica SRI antes de enviar por correo si aún no se ha emitido
  if (settings.sriEnabled && settings.signatureFilePath && (!invoice.sriAccessKey || invoice.status === "BORRADOR")) {
    try {
      const job = await enqueueSriJob(invoiceId);
      await processSriJob(job.id);
    } catch (error) {
      console.error("Error al procesar SRI automáticamente antes de enviar correo:", error);
    }
  }

  // 2. Cargar los detalles completos como InternalInvoice y la configuración
  const fullInvoices = await getInternalInvoices();
  const fullInvoice = fullInvoices.find((inv) => inv.id === invoiceId);
  if (!fullInvoice) failValidation("No se pudieron cargar los detalles completos de la factura.");
  
  const normalizedSettings = await getBusinessSettings();

  // 3. Generar el PDF y el XML de forma dinámica
  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await generateInvoicePdfBuffer(fullInvoice, normalizedSettings);
  } catch (error) {
    console.error("Error al generar PDF de factura:", error);
    failValidation("Error al generar el PDF del comprobante.");
  }

  // Obtener o generar XML
  let xmlContent = "";
  const invoiceForXml = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      customer: true,
      order: {
        include: {
          items: {
            orderBy: { id: "asc" },
          },
        },
      },
    },
  });

  if (invoiceForXml) {
    if (invoiceForXml.sriXmlUrl && existsSync(invoiceForXml.sriXmlUrl)) {
      try {
        xmlContent = await readFile(invoiceForXml.sriXmlUrl, "utf8");
      } catch (err) {
        console.error("Error al leer XML existente:", err);
      }
    }
    
    if (!xmlContent) {
      try {
        const { xml } = buildSriInvoiceXml(
          invoiceForXml as unknown as Parameters<typeof buildSriInvoiceXml>[0],
          settings as unknown as Parameters<typeof buildSriInvoiceXml>[1]
        );
        xmlContent = xml;
      } catch (err) {
        console.warn("No se pudo generar el XML para adjuntarlo al correo:", err);
        xmlContent = "";
      }
    }
  }

  // 4. Preparar adjuntos y enviar el correo real
  const attachments = [
    {
      filename: `Factura_${fullInvoice.number}.pdf`,
      content: pdfBuffer,
    },
  ];

  if (xmlContent) {
    attachments.push({
      filename: `Factura_${fullInvoice.number}.xml`,
      content: Buffer.from(xmlContent, "utf8"),
    });
  }

  const html = generateInvoiceHtmlEmail(fullInvoice, normalizedSettings);
  let emailStatus: "ENVIADO" | "ERROR" = "ENVIADO";
  const rawFromAddress = normalizedSettings.emailFromAddress || process.env.EMAIL_FROM || normalizedSettings.email || "noreply@smartmenucloud.com";
  const fromAddress = extractEmailAddress(rawFromAddress);
  const fromName = cleanEmailHeader(normalizedSettings.emailFromName || normalizedSettings.businessName, "El remitente", 120);
  if (!isValidEmail(fromAddress)) failValidation("Configura un correo remitente valido antes de enviar facturas.");

  try {
    await sendEmail({
      from: `${fromName} <${fromAddress}>`,
      to,
      subject,
      html: html,
      attachments,
    });
  } catch (error) {
    emailStatus = "ERROR";
    console.error("Error crítico al enviar correo:", error);
    // Lanzamos el error hacia la UI para que el usuario reciba la retroalimentación
    failValidation(error instanceof Error ? error.message : "Error al transmitir el correo electrónico.");
  }

  // 5. Guardar registro histórico y actualizar factura
  const savedLog = await prisma.invoiceEmailLog.create({
    data: {
      invoiceId: invoice.id,
      invoiceNumber: invoice.number,
      to,
      from: `${fromName} <${fromAddress}>`,
      subject,
      body,
      status: emailStatus,
      sentAt: new Date(),
    },
  });

  await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      status: "ENVIADA",
      sentAt: savedLog.sentAt,
      issuedAt: new Date(),
    },
  });

  revalidatePath("/facturas");
  revalidatePath("/");

  return {
    log: {
      id: savedLog.id,
      invoiceId: savedLog.invoiceId,
      invoiceNumber: savedLog.invoiceNumber,
      to: savedLog.to,
      from: savedLog.from,
      subject: savedLog.subject,
      body: savedLog.body,
      status: emailStatus,
      sentAt: savedLog.sentAt.toISOString(),
    },
    invoices: await refreshInvoices(),
  };
}

export async function updateInvoiceStatus(id: string, status: InternalInvoiceStatus) {
  await requireSameOriginRequest();
  await requireAdminSession();
  const invoiceId = assertSafeId(id, "identificador de la factura");
  const nextStatus = assertAllowedValue(status, invoiceStatuses, "El estado de la factura");

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status: statusToPrisma[nextStatus],
      sentAt: nextStatus === "ENVIADA" ? new Date() : undefined,
      issuedAt: nextStatus === "EMITIDA" || nextStatus === "ENVIADA" ? new Date() : undefined,
    },
  });

  return refreshInvoices();
}

export async function deleteInvoice(id: string) {
  await requireSameOriginRequest();
  await requireAdminSession();
  const invoiceId = assertSafeId(id, "identificador de la factura");

  try {
    await prisma.invoice.delete({ where: { id: invoiceId } });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2003" || error.code === "P2014")
    ) {
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: "ANULADA" },
      });
    } else if (
      !(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025")
    ) {
      throw error;
    }
  }

  return refreshInvoices();
}

export async function emitInvoiceToSri(id: string) {
  await requireSameOriginRequest();
  await requireAdminSession();
  const invoiceId = assertSafeId(id, "identificador de la factura");

  let message = "Factura enviada a la cola SRI. Revisa el estado electronico.";
  let ok = true;

  try {
    const job = await enqueueSriJob(invoiceId);
    const processedJob = await processSriJob(job.id);
    if (processedJob.status === "ERROR") {
      ok = false;
      message = processedJob.lastError || "No se pudo completar el proceso SRI. Revisa la configuracion.";
    }
  } catch (error) {
    ok = false;
    message = toActionMessage(error, "No se pudo procesar la factura en la cola SRI.");
    console.error("Error al emitir factura al SRI:", error);
  }

  revalidatePath("/facturas");
  revalidatePath("/reportes");
  revalidatePath("/");

  return {
    invoices: await refreshInvoices(),
    message,
    ok,
  };
}

export async function retrySriQueue() {
  await requireSameOriginRequest();
  await requireAdminSession();

  let message = "Cola SRI revisada. Los pendientes fueron reintentados.";
  let ok = true;

  try {
    const processed = await retryDueSriJobs();
    if (processed === 0) {
      message = "No hay facturas pendientes listas para reintentar en este momento.";
    }
  } catch (error) {
    ok = false;
    message = toActionMessage(error, "No se pudo reintentar la cola SRI.");
    console.error("Error al reintentar cola SRI:", error);
  }

  revalidatePath("/facturas");
  revalidatePath("/reportes");
  revalidatePath("/");

  return {
    invoices: await refreshInvoices(),
    message,
    ok,
  };
}
