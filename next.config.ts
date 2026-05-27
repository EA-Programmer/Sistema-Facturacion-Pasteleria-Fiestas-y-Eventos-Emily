import type { NextConfig } from "next";

function serverActionAllowedOrigins() {
  const origins = new Set([
    "fiestasyeventosemily.duckdns.org",
    "209.159.155.98",
    "localhost",
    "localhost:3000",
    "127.0.0.1",
    "127.0.0.1:3000",
    "127.0.0.1:3001",
  ]);

  for (const value of [process.env.SITE_DOMAIN, process.env.NEXT_PUBLIC_SITE_URL]) {
    if (!value) continue;

    try {
      const url = value.includes("://") ? new URL(value) : new URL(`https://${value}`);
      if (url.host) origins.add(url.host);
      if (url.hostname) origins.add(url.hostname);
    } catch {
      const cleanValue = value.replace(/^https?:\/\//, "").replace(/\/.*$/, "").trim();
      if (cleanValue && cleanValue !== ":80") origins.add(cleanValue);
    }
  }

  return Array.from(origins);
}

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  typedRoutes: true,
  experimental: {
    serverActions: {
      allowedOrigins: serverActionAllowedOrigins(),
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
