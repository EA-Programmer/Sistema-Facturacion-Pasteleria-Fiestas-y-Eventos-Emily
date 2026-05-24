import { headers } from "next/headers";
import { failValidation } from "@/lib/validation";

function firstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim().toLowerCase() || "";
}

function matchesHost(urlValue: string, host: string) {
  try {
    return new URL(urlValue).host.toLowerCase() === host;
  } catch {
    return false;
  }
}

export async function isSameOriginRequest() {
  const headerStore = await headers();
  const host = firstHeaderValue(headerStore.get("x-forwarded-host")) || firstHeaderValue(headerStore.get("host"));
  if (!host) return false;

  const origin = headerStore.get("origin");
  if (origin) return matchesHost(origin, host);

  const referer = headerStore.get("referer");
  if (referer) return matchesHost(referer, host);

  return false;
}

export async function requireSameOriginRequest() {
  if (!(await isSameOriginRequest())) {
    failValidation("La solicitud fue bloqueada por seguridad. Vuelve a cargar la pagina e intenta otra vez.");
  }
}
