import { auth } from "@/auth";
import { NextResponse } from "next/server";

const ROLE_BY_PREFIX: Record<string, "ADMIN" | "CAREGIVER" | "GUARDIAN"> = {
  "/admin": "ADMIN",
  "/cuidadora": "CAREGIVER",
  "/pais": "GUARDIAN",
};

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const prefix = Object.keys(ROLE_BY_PREFIX).find((p) => pathname.startsWith(p));
  if (!prefix) return NextResponse.next();

  const session = req.auth;
  if (!session?.user) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (session.user.role !== ROLE_BY_PREFIX[prefix]) {
    return NextResponse.redirect(new URL("/login", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/cuidadora/:path*", "/pais/:path*"],
};
