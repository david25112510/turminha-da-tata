import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { requiredRoleForPath } from "@/lib/access-control";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const requiredRole = requiredRoleForPath(pathname);
  if (!requiredRole) return NextResponse.next();

  const session = req.auth;
  if (!session?.user) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (session.user.role !== requiredRole) {
    return NextResponse.redirect(new URL("/login", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/cuidadora/:path*", "/pais/:path*"],
};
