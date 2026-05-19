import { brand } from "@/lib/brand";
import type { BusinessSettingsForm } from "@/types/settings";

export const initialBusinessSettings: BusinessSettingsForm = {
  businessName: "Fiestas & Eventos Emily",
  tradeName: "Emily",
  ruc: "",
  address: "",
  city: "",
  province: "",
  phone: "",
  email: "",
  logoPath: brand.logoPath,
  establishmentCode: "001",
  emissionPointCode: "001",
  invoiceSequence: 1,
  taxRate: 15,
  currency: "USD",
  emailFromName: "Fiestas & Eventos Emily",
  emailFromAddress: "",
  emailReplyTo: "",
  sriEnvironment: "PRUEBAS",
  sriEnabled: false,
  signatureExpiresAt: "",
};
