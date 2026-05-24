import { NextResponse, type NextRequest } from "next/server";

const adminSessionCookie = "emily_admin_session";

const protectedRoutes = [
  "/",
  "/clientes",
  "/configuracion",
  "/facturas",
  "/pagos",
  "/pedidos",
  "/productos",
  "/proformas",
  "/reportes",
];

function isProtectedPath(pathname: string) {
  return protectedRoutes.some((route) => {
    if (route === "/") return pathname === "/";
    return pathname === route || pathname.startsWith(`${route}/`);
  });
}

function createNonce() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function contentSecurityPolicy(nonce: string) {
  const isDev = process.env.NODE_ENV !== "production";
  const scriptSrc = ["'self'", `'nonce-${nonce}'`, isDev ? "'unsafe-eval'" : ""]
    .filter(Boolean)
    .join(" ");

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    isDev ? "" : "upgrade-insecure-requests",
  ]
    .filter(Boolean)
    .join("; ");
}

function withSecurityHeaders(response: NextResponse, nonce: string) {
  response.headers.set("Content-Security-Policy", contentSecurityPolicy(nonce));
  response.headers.set("x-nonce", nonce);
  return response;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const nonce = createNonce();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  const hasSessionCookie = Boolean(request.cookies.get(adminSessionCookie)?.value);

  if (pathname === "/login" && hasSessionCookie) {
    return withSecurityHeaders(NextResponse.redirect(new URL("/", request.url)), nonce);
  }

  if (isProtectedPath(pathname) && !hasSessionCookie) {
    return withSecurityHeaders(NextResponse.redirect(new URL("/login", request.url)), nonce);
  }

  return withSecurityHeaders(NextResponse.next({ request: { headers: requestHeaders } }), nonce);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|brand|favicon.ico).*)"],
};
