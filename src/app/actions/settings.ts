"use server";

import { revalidatePath } from "next/cache";
import { requireSameOriginRequest } from "@/lib/action-security";
import { requireAdminSession } from "@/lib/auth";
import { initialBusinessSettings } from "@/lib/settings-catalog";
import { getBusinessSettings, settingsId } from "@/lib/settings-db";
import { prisma } from "@/lib/prisma";
import {
  encryptSignaturePassword,
  removeSignatureFile,
  saveSignatureFile,
  validateSignatureFile,
} from "@/lib/sri-signature-storage";
import {
  assertAllowedValue,
  assertBooleanValue,
  assertSafeLogoPath,
  cleanEmailHeader,
  cleanText,
  failValidation,
  isValidEcuadorRuc,
  isValidEmail,
  onlyDigits,
} from "@/lib/validation";
import type { BusinessSettingsForm } from "@/types/settings";

const sriEnvironments = ["PRUEBAS", "PRODUCCION"] as const;
const currencies = ["USD"] as const;

function parseOptionalDate(value: string) {
  return value ? new Date(`${value}T00:00:00`) : null;
}

export async function saveBusinessSettings(settings: BusinessSettingsForm) {
  await requireSameOriginRequest();
  await requireAdminSession();

  const businessName = cleanText(settings.businessName, "La razon social", 160, true);
  const tradeName = cleanText(settings.tradeName, "El nombre comercial", 120);
  const ruc = onlyDigits(cleanText(settings.ruc, "El RUC", 13));
  const address = cleanText(settings.address, "La direccion", 220, settings.sriEnabled);
  const city = cleanText(settings.city, "La ciudad", 80);
  const province = cleanText(settings.province, "La provincia", 80);
  const phone = cleanText(settings.phone, "El telefono", 30);
  const email = cleanText(settings.email, "El correo del negocio", 160);
  const logoPath = assertSafeLogoPath(settings.logoPath);
  const emailFromName = settings.emailFromName.trim()
    ? cleanEmailHeader(settings.emailFromName, "El nombre del remitente", 120)
    : "";
  const emailFromAddress = cleanText(settings.emailFromAddress, "El correo remitente", 160);
  const emailReplyTo = cleanText(settings.emailReplyTo, "El correo de respuesta", 160);
  const establishmentCode = cleanText(settings.establishmentCode, "El establecimiento", 3, true);
  const emissionPointCode = cleanText(settings.emissionPointCode, "El punto de emision", 3, true);
  const currency = assertAllowedValue(settings.currency, currencies, "La moneda");
  const sriEnvironment = assertAllowedValue(settings.sriEnvironment, sriEnvironments, "El ambiente SRI");
  const sriEnabled = assertBooleanValue(settings.sriEnabled, "La activacion SRI");

  if (ruc && !isValidEcuadorRuc(ruc)) {
    failValidation("Ingresa un RUC valido de 13 digitos terminado en 001.");
  }
  if (sriEnabled && !ruc) failValidation("Ingresa el RUC antes de activar SRI.");
  if (email && !isValidEmail(email)) failValidation("Ingresa un correo valido del negocio.");
  if (emailFromAddress && !isValidEmail(emailFromAddress)) {
    failValidation("Ingresa un correo valido para el remitente.");
  }
  if (emailReplyTo && !isValidEmail(emailReplyTo)) {
    failValidation("Ingresa un correo valido para responder.");
  }
  if (!/^\d{3}$/.test(establishmentCode)) failValidation("El establecimiento debe tener 3 digitos.");
  if (!/^\d{3}$/.test(emissionPointCode)) failValidation("El punto de emision debe tener 3 digitos.");
  if (!Number.isInteger(settings.invoiceSequence) || settings.invoiceSequence <= 0) {
    failValidation("La secuencia de factura debe ser un entero mayor a cero.");
  }
  if (!Number.isFinite(settings.taxRate) || settings.taxRate < 0 || settings.taxRate > 100) {
    failValidation("El IVA debe estar entre 0 y 100.");
  }

  await prisma.businessSettings.upsert({
    where: { id: settingsId },
    update: {
      businessName,
      tradeName,
      ruc,
      address,
      city,
      province,
      phone,
      email,
      logoPath,
      establishmentCode,
      emissionPointCode,
      invoiceSequence: settings.invoiceSequence,
      taxRate: settings.taxRate,
      currency,
      emailFromName,
      emailFromAddress,
      emailReplyTo,
      sriEnvironment,
      sriEnabled,
      signatureExpiresAt: parseOptionalDate(settings.signatureExpiresAt),
    },
    create: {
      id: settingsId,
      businessName,
      tradeName,
      ruc,
      address,
      city,
      province,
      phone,
      email,
      logoPath,
      establishmentCode,
      emissionPointCode,
      invoiceSequence: settings.invoiceSequence,
      taxRate: settings.taxRate,
      currency,
      emailFromName,
      emailFromAddress,
      emailReplyTo,
      sriEnvironment,
      sriEnabled,
      signatureExpiresAt: parseOptionalDate(settings.signatureExpiresAt),
    },
  });

  revalidatePath("/configuracion");
}

export async function resetBusinessSettings() {
  await requireSameOriginRequest();
  await requireAdminSession();

  await saveBusinessSettings(initialBusinessSettings);
  return getBusinessSettings();
}

export async function registerElectronicSignature(formData: FormData) {
  await requireSameOriginRequest();
  await requireAdminSession();

  const file = formData.get("signatureFile");
  const password = String(formData.get("signaturePassword") ?? "");
  const expiresAt = String(formData.get("signatureExpiresAt") ?? "");

  if (!(file instanceof File)) failValidation("Selecciona el archivo de firma electronica.");
  if (!password.trim()) failValidation("Ingresa la clave de la firma electronica.");
  if (!expiresAt) failValidation("Ingresa la fecha de vencimiento de la firma.");

  const expirationDate = parseOptionalDate(expiresAt);
  if (!expirationDate || expirationDate <= new Date()) {
    failValidation("La fecha de vencimiento de la firma debe ser futura.");
  }

  validateSignatureFile(file);

  const settings = await prisma.businessSettings.findUnique({
    where: { id: settingsId },
  });

  if (!settings?.ruc) failValidation("Guarda el RUC de la empresa antes de registrar la firma.");

  const storedFile = await saveSignatureFile(file, settings.ruc, password);

  await prisma.businessSettings.update({
    where: { id: settingsId },
    data: {
      signatureFileName: storedFile.originalName,
      signatureFilePath: storedFile.path,
      signaturePassword: encryptSignaturePassword(password),
      signatureExpiresAt: expirationDate,
      signatureRegisteredAt: new Date(),
    },
  });

  await removeSignatureFile(settings.signatureFilePath);

  revalidatePath("/configuracion");
  revalidatePath("/facturas");

  return getBusinessSettings();
}

export async function removeElectronicSignature() {
  await requireSameOriginRequest();
  await requireAdminSession();

  const settings = await prisma.businessSettings.findUnique({
    where: { id: settingsId },
    select: { signatureFilePath: true },
  });

  await prisma.businessSettings.update({
    where: { id: settingsId },
    data: {
      signatureFileName: null,
      signatureFilePath: null,
      signaturePassword: null,
      signatureRegisteredAt: null,
    },
  });

  await removeSignatureFile(settings?.signatureFilePath);

  revalidatePath("/configuracion");
  revalidatePath("/facturas");

  return getBusinessSettings();
}
