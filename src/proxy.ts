import NextAuth from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

// Si la persona ya inició sesión, /login y /register la llevan directo a crear sala.
const redirectSignedIn = auth((req) => {
  const { pathname } = req.nextUrl;
  if (req.auth && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/room", req.url));
  }
  return NextResponse.next();
});

export default function proxy(req: NextRequest, event: Parameters<typeof redirectSignedIn>[1]) {
  // Sin cuentas configuradas no hay sesión que revisar (las páginas muestran "Próximamente").
  if (!process.env.AUTH_SECRET) return NextResponse.next();
  return redirectSignedIn(req, event);
}

export const config = {
  matcher: ["/login", "/register"],
};
