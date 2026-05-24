import { prisma } from "@/lib/prisma";
import { settingsId } from "@/lib/settings-db";
import { decryptSignaturePassword, readSignatureFileBuffer } from "@/lib/sri-signature-storage";
import { signXmlInvoice } from "@/lib/sri-signer";
import { buildSriInvoiceXml, writeSriXml } from "@/lib/sri-xml";
import { failValidation } from "@/lib/validation";


const maxAttempts = 5;

function nextRetryDate(attempts: number) {
  const date = new Date();
  date.setMinutes(date.getMinutes() + Math.min(Math.max(attempts, 1), 15));
  return date;
}

async function loadInvoiceForSri(invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({
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

  if (!invoice) failValidation("No se encontro la factura seleccionada.");
  if (invoice.status === "ANULADA") failValidation("No se puede enviar una factura anulada al SRI.");
  if (invoice.status === "AUTORIZADA") failValidation("La factura ya esta autorizada.");

  return invoice;
}

export async function enqueueSriJob(invoiceId: string) {
  const invoice = await loadInvoiceForSri(invoiceId);

  const existingJob = await prisma.sriJob.findFirst({
    where: {
      invoiceId: invoice.id,
      status: { in: ["PENDIENTE", "PROCESANDO", "ERROR"] },
    },
    orderBy: { createdAt: "desc" },
  });

  if (existingJob) return existingJob;

  return prisma.sriJob.create({
    data: {
      invoiceId: invoice.id,
      status: "PENDIENTE",
      nextRunAt: new Date(),
    },
  });
}

export async function processSriJob(jobId: string) {
  const job = await prisma.sriJob.findUnique({
    where: { id: jobId },
  });

  if (!job) failValidation("No se encontro el trabajo SRI.");
  if (job.status === "COMPLETADO") return job;
  if (job.attempts >= maxAttempts) {
    return prisma.sriJob.update({
      where: { id: job.id },
      data: {
        status: "ERROR",
        lastError: "Se alcanzo el maximo de reintentos automaticos.",
        nextRunAt: nextRetryDate(job.attempts),
      },
    });
  }

  const invoice = await loadInvoiceForSri(job.invoiceId);
  const settings = await prisma.businessSettings.findUnique({
    where: { id: settingsId },
  });

  await prisma.sriJob.update({
    where: { id: job.id },
    data: {
      status: "PROCESANDO",
      attempts: { increment: 1 },
      lockedAt: new Date(),
      lastError: null,
    },
  });

  try {
    if (!settings) {
      throw new Error("Configura los datos de la empresa antes de generar XML SRI.");
    }

    const { accessKey, xml } = buildSriInvoiceXml(invoice, settings);
    const xmlPath = await writeSriXml(invoice.number, xml);

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        status: "GENERADA_XML",
        sriAccessKey: accessKey,
        sriXmlUrl: xmlPath,
      },
    });

    if (!settings.sriEnabled) {
      throw new Error("Activa la integracion SRI en Configuracion antes de transmitir.");
    }

    if (!settings.signatureFilePath || !settings.signaturePassword) {
      throw new Error("Registra el archivo de firma electronica antes de firmar el XML.");
    }

    if (!settings.signatureExpiresAt || settings.signatureExpiresAt <= new Date()) {
      throw new Error("Configura una firma electronica vigente antes de firmar el XML.");
    }

    const password = decryptSignaturePassword(settings.signaturePassword);
    const p12Buffer = await readSignatureFileBuffer(settings.signatureFilePath);

    // Firmar el archivo XML generado
    await signXmlInvoice({
      xmlPath: xmlPath,
      p12Buffer,
      p12Password: password,
    });

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        status: "FIRMADA",
      },
    });

    // Actualizar el trabajo SRI como completado con éxito
    return prisma.sriJob.update({
      where: { id: job.id },
      data: {
        status: "COMPLETADO",
        completedAt: new Date(),
        lockedAt: null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido al procesar SRI.";
    const updatedJob = await prisma.sriJob.update({
      where: { id: job.id },
      data: {
        status: "ERROR",
        lastError: message,
        nextRunAt: nextRetryDate(job.attempts + 1),
        lockedAt: null,
      },
    });

    if (message.includes("servicios web")) {
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          status: "ERROR_CONEXION",
        },
      });
    }

    return updatedJob;
  }
}

export async function retryDueSriJobs(limit = 10) {
  const jobs = await prisma.sriJob.findMany({
    where: {
      status: { in: ["PENDIENTE", "ERROR"] },
      nextRunAt: { lte: new Date() },
      attempts: { lt: maxAttempts },
    },
    orderBy: { nextRunAt: "asc" },
    take: limit,
  });

  for (const job of jobs) {
    await processSriJob(job.id);
  }

  return jobs.length;
}
