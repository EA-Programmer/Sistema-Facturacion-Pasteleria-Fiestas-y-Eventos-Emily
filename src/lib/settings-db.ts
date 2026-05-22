import { initialBusinessSettings } from "@/lib/settings-catalog";
import { prisma } from "@/lib/prisma";
import type { BusinessSettingsForm } from "@/types/settings";

const settingsId = "default";

export function normalizeBusinessSettings(settings: {
  businessName: string;
  tradeName: string | null;
  ruc: string;
  address: string;
  city: string | null;
  province: string | null;
  phone: string | null;
  email: string | null;
  logoPath: string | null;
  establishmentCode: string;
  emissionPointCode: string;
  invoiceSequence: number;
  taxRate: unknown;
  currency: string;
  emailFromName: string | null;
  emailFromAddress: string | null;
  emailReplyTo: string | null;
  sriEnvironment: string;
  sriEnabled: boolean;
  signatureFileName: string | null;
  signatureFilePath: string | null;
  signatureExpiresAt: Date | null;
  signatureRegisteredAt: Date | null;
}): BusinessSettingsForm {
  return {
    businessName: settings.businessName,
    tradeName: settings.tradeName ?? "",
    ruc: settings.ruc,
    address: settings.address,
    city: settings.city ?? "",
    province: settings.province ?? "",
    phone: settings.phone ?? "",
    email: settings.email ?? "",
    logoPath: settings.logoPath ?? initialBusinessSettings.logoPath,
    establishmentCode: settings.establishmentCode,
    emissionPointCode: settings.emissionPointCode,
    invoiceSequence: settings.invoiceSequence,
    taxRate: Number(settings.taxRate),
    currency: settings.currency,
    emailFromName: settings.emailFromName ?? "",
    emailFromAddress: settings.emailFromAddress ?? "",
    emailReplyTo: settings.emailReplyTo ?? "",
    sriEnvironment: settings.sriEnvironment === "PRODUCCION" ? "PRODUCCION" : "PRUEBAS",
    sriEnabled: settings.sriEnabled,
    signatureFileName: settings.signatureFileName ?? "",
    signatureExpiresAt: settings.signatureExpiresAt
      ? settings.signatureExpiresAt.toISOString().slice(0, 10)
      : "",
    signatureRegisteredAt: settings.signatureRegisteredAt?.toISOString() ?? "",
    hasSignature: Boolean(settings.signatureFilePath),
  };
}

export async function getBusinessSettings(): Promise<BusinessSettingsForm> {
  const settings = await prisma.businessSettings.findUnique({
    where: { id: settingsId },
  });

  if (!settings) return initialBusinessSettings;

  return normalizeBusinessSettings(settings);
}

export { settingsId };
