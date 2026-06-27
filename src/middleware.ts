import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  // All routes are publicly accessible — auth is optional.
  // Redirect authenticated users away from login/register pages.
  const { pathname } = req.nextUrl;
  if (req.auth && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/room", req.url));
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/login", "/register"],
};
