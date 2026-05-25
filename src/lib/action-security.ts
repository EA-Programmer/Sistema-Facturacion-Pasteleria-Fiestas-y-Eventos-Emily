import { headers } from "next/headers";
import { failValidation } from "@/lib/validation";

function firstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim().toLowerCase() || "";
}


export async function isSameOriginRequest() {
  const headerStore = await headers();
  const host = firstHeaderValue(headerStore.get("x-forwarded-host")) || firstHeaderValue(headerStore.get("host"));

  const allowedHosts = new Set<string>();
  if (host) {
    allowedHosts.add(host.toLowerCase());
  }

  if (process.env.NEXT_PUBLIC_SITE_URL) {
    try {
      const u = new URL(process.env.NEXT_PUBLIC_SITE_URL);
      allowedHosts.add(u.host.toLowerCase());
      allowedHosts.add(u.hostname.toLowerCase());
    } catch {}
  }

  if (process.env.SITE_DOMAIN) {
    const domainOnly = process.env.SITE_DOMAIN.split(":")[0].toLowerCase().trim();
    if (domainOnly) {
      allowedHosts.add(domainOnly);
    }
  }

  allowedHosts.add("localhost");
  allowedHosts.add("127.0.0.1");
  allowedHosts.add("app");

  const origin = headerStore.get("origin");
  if (origin) {
    try {
      const originUrl = new URL(origin);
      const originHost = originUrl.host.toLowerCase();
      const originHostname = originUrl.hostname.toLowerCase();
      if (allowedHosts.has(originHost) || allowedHosts.has(originHostname)) {
        return true;
      }
    } catch {}
  }

  const referer = headerStore.get("referer");
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const refererHost = refererUrl.host.toLowerCase();
      const refererHostname = refererUrl.hostname.toLowerCase();
      if (allowedHosts.has(refererHost) || allowedHosts.has(refererHostname)) {
        return true;
      }
    } catch {}
  }

  if (!origin && !referer) {
    return false;
  }

  return false;
}

export async function requireSameOriginRequest() {
  if (!(await isSameOriginRequest())) {
    failValidation("La solicitud fue bloqueada por seguridad. Vuelve a cargar la pagina e intenta otra vez.");
  }
}
