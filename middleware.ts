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
  "/reportes",
];

function isProtectedPath(pathname: string) {
  return protectedRoutes.some((route) => {
    if (route === "/") return pathname === "/";
    return pathname === route || pathname.startsWith(`${route}/`);
  });
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSessionCookie = Boolean(request.cookies.get(adminSessionCookie)?.value);

  if (pathname === "/login" && hasSessionCookie) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (isProtectedPath(pathname) && !hasSessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|brand|favicon.ico).*)"],
};
