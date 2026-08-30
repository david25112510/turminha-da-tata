import { describe, expect, it } from "vitest";
import { isStoredReference, keyFromStoredReference, storageKeyFromReference, storedReference } from "./storage";

describe("storage privado", () => {
  it("persiste referência opaca, não URL pública", () => {
    const reference = storedReference("children/child-1/photo.png");
    expect(reference).toBe("storage://children/child-1/photo.png");
    expect(isStoredReference(reference)).toBe(true);
    expect(keyFromStoredReference(reference)).toBe("children/child-1/photo.png");
  });
  it("mantém compatibilidade com uploads locais antigos", () => expect(storageKeyFromReference("/uploads/children/child-1/old.jpg")).toBe("children/child-1/old.jpg"));
  it("recusa traversal", () => expect(() => storedReference("../secret")).toThrow("Chave de storage inválida"));
});
