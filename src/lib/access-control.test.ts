import { describe, expect, it } from "vitest";
import { isAuthorizedForPath, requiredRoleForPath } from "./access-control";

describe("requiredRoleForPath", () => {
  it("maps each portal prefix to its role", () => {
    expect(requiredRoleForPath("/admin")).toBe("ADMIN");
    expect(requiredRoleForPath("/admin/financeiro")).toBe("ADMIN");
    expect(requiredRoleForPath("/cuidadora/criancas/abc123")).toBe("CAREGIVER");
    expect(requiredRoleForPath("/pais/jornada")).toBe("GUARDIAN");
  });

  it("returns null for public routes", () => {
    expect(requiredRoleForPath("/login")).toBeNull();
    expect(requiredRoleForPath("/offline")).toBeNull();
    expect(requiredRoleForPath("/")).toBeNull();
  });
});

describe("isAuthorizedForPath", () => {
  it("allows the correct role", () => {
    expect(isAuthorizedForPath("/admin/criancas", "ADMIN")).toBe(true);
  });

  it("denies a mismatched role", () => {
    expect(isAuthorizedForPath("/admin/criancas", "CAREGIVER")).toBe(false);
    expect(isAuthorizedForPath("/pais", "ADMIN")).toBe(false);
  });

  it("denies when there is no role at all", () => {
    expect(isAuthorizedForPath("/cuidadora", undefined)).toBe(false);
  });

  it("allows any role (including none) on unprotected routes", () => {
    expect(isAuthorizedForPath("/login", undefined)).toBe(true);
    expect(isAuthorizedForPath("/login", "GUARDIAN")).toBe(true);
  });
});
