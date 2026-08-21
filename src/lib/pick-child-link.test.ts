import { describe, expect, it } from "vitest";
import { pickChildLink } from "./pick-child-link";

type Link = { childId: string; name: string };

const links: Link[] = [
  { childId: "primary-child", name: "Primary (first in list)" },
  { childId: "second-child", name: "Second" },
];

describe("pickChildLink", () => {
  it("returns the first link when no childId is given", () => {
    expect(pickChildLink(links)?.childId).toBe("primary-child");
  });

  it("returns the link matching the given childId", () => {
    expect(pickChildLink(links, "second-child")?.childId).toBe("second-child");
  });

  it("falls back to the first link when the given childId is not found", () => {
    expect(pickChildLink(links, "unknown-child")?.childId).toBe("primary-child");
  });

  it("returns undefined for an empty list", () => {
    expect(pickChildLink([])).toBeUndefined();
  });
});
