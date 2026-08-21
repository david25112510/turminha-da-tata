export type AppRole = "ADMIN" | "CAREGIVER" | "GUARDIAN";

export const ROLE_BY_PREFIX: Record<string, AppRole> = {
  "/admin": "ADMIN",
  "/cuidadora": "CAREGIVER",
  "/pais": "GUARDIAN",
};

/**
 * Returns the role required to access `pathname`, or null if the path
 * isn't under a role-protected prefix.
 */
export function requiredRoleForPath(pathname: string): AppRole | null {
  const prefix = Object.keys(ROLE_BY_PREFIX).find((p) => pathname.startsWith(p));
  return prefix ? ROLE_BY_PREFIX[prefix] : null;
}

export function isAuthorizedForPath(pathname: string, role: AppRole | undefined): boolean {
  const required = requiredRoleForPath(pathname);
  if (!required) return true;
  return role === required;
}
