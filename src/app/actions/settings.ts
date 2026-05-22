"use server";

import { revalidatePath } from "next/cache";
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
import { failValidation, isValidEcuadorRuc, isValidEmail, onlyDigits } from "@/lib/validation";
import type { BusinessSettingsForm } from "@/types/settings";

function parseOptionalDate(value: string) {
  return value ? new Date(`${value}T00:00:00`) : null;
}

export async function saveBusinessSettings(settings: BusinessSettingsForm) {
  await requireAdminSession();

  if (!settings.businessName.trim()) failValidation("Ingresa la razon social del negocio.");
  if (settings.ruc.trim() && !isValidEcuadorRuc(settings.ruc)) {
    failValidation("Ingresa un RUC valido de 13 digitos terminado en 001.");
  }
  if (settings.sriEnabled && !settings.ruc.trim()) failValidation("Ingresa el RUC antes de activar SRI.");
  if (settings.sriEnabled && !settings.address.trim()) failValidation("Ingresa la direccion matriz antes de activar SRI.");
  if (settings.email.trim() && !isValidEmail(settings.email)) failValidation("Ingresa un correo valido del negocio.");
  if (settings.emailFromAddress.trim() && !isValidEmail(settings.emailFromAddress)) {
    failValidation("Ingresa un correo valido para el remitente.");
  }
  if (settings.emailReplyTo.trim() && !isValidEmail(settings.emailReplyTo)) {
    failValidation("Ingresa un correo valido para responder.");
  }
  if (!/^\d{3}$/.test(settings.establishmentCode)) failValidation("El establecimiento debe tener 3 digitos.");
  if (!/^\d{3}$/.test(settings.emissionPointCode)) failValidation("El punto de emision debe tener 3 digitos.");
  if (!Number.isInteger(settings.invoiceSequence) || settings.invoiceSequence <= 0) {
    failValidation("La secuencia de factura debe ser un entero mayor a cero.");
  }
  if (!Number.isFinite(settings.taxRate) || settings.taxRate < 0 || settings.taxRate > 100) {
    failValidation("El IVA debe estar entre 0 y 100.");
  }

  await prisma.businessSettings.upsert({
    where: { id: settingsId },
    update: {
      businessName: settings.businessName.trim(),
      tradeName: settings.tradeName.trim(),
      ruc: onlyDigits(settings.ruc),
      address: settings.address.trim(),
      city: settings.city.trim(),
      province: settings.province.trim(),
      phone: settings.phone.trim(),
      email: settings.email.trim(),
      logoPath: settings.logoPath.trim(),
      establishmentCode: settings.establishmentCode,
      emissionPointCode: settings.emissionPointCode,
      invoiceSequence: settings.invoiceSequence,
      taxRate: settings.taxRate,
      currency: settings.currency,
      emailFromName: settings.emailFromName.trim(),
      emailFromAddress: settings.emailFromAddress.trim(),
      emailReplyTo: settings.emailReplyTo.trim(),
      sriEnvironment: settings.sriEnvironment,
      sriEnabled: settings.sriEnabled,
      signatureExpiresAt: parseOptionalDate(settings.signatureExpiresAt),
    },
    create: {
      id: settingsId,
      businessName: settings.businessName.trim(),
      tradeName: settings.tradeName.trim(),
      ruc: onlyDigits(settings.ruc),
      address: settings.address.trim(),
      city: settings.city.trim(),
      province: settings.province.trim(),
      phone: settings.phone.trim(),
      email: settings.email.trim(),
      logoPath: settings.logoPath.trim(),
      establishmentCode: settings.establishmentCode,
      emissionPointCode: settings.emissionPointCode,
      invoiceSequence: settings.invoiceSequence,
      taxRate: settings.taxRate,
      currency: settings.currency,
      emailFromName: settings.emailFromName.trim(),
      emailFromAddress: settings.emailFromAddress.trim(),
      emailReplyTo: settings.emailReplyTo.trim(),
      sriEnvironment: settings.sriEnvironment,
      sriEnabled: settings.sriEnabled,
      signatureExpiresAt: parseOptionalDate(settings.signatureExpiresAt),
    },
  });

  revalidatePath("/configuracion");
}

export async function resetBusinessSettings() {
  await requireAdminSession();

  await saveBusinessSettings(initialBusinessSettings);
  return getBusinessSettings();
}

export async function registerElectronicSignature(formData: FormData) {
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

  const storedFile = await saveSignatureFile(file, settings.ruc);

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
