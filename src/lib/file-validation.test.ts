import { describe, expect, it } from "vitest";
import { detectImageType, extensionFor } from "./file-validation";

const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const JPEG_HEADER = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
const WEBP_HEADER = Buffer.concat([Buffer.from("RIFF"), Buffer.from([0, 0, 0, 0]), Buffer.from("WEBP")]);

describe("detectImageType", () => {
  it("CASO 1: reconhece um PNG real pelos magic bytes", () => {
    expect(detectImageType(PNG_HEADER)).toBe("image/png");
  });

  it("CASO 2: reconhece um JPEG real pelos magic bytes", () => {
    expect(detectImageType(JPEG_HEADER)).toBe("image/jpeg");
  });

  it("CASO 3: reconhece um WEBP real pelos magic bytes (RIFF....WEBP)", () => {
    expect(detectImageType(WEBP_HEADER)).toBe("image/webp");
  });

  it("CASO 4: rejeita um arquivo cujo conteúdo não bate com nenhuma assinatura conhecida", () => {
    expect(detectImageType(Buffer.from("não é uma imagem, é só texto"))).toBeNull();
  });

  it("CASO 5: rejeita um arquivo forjado — extensão/MIME diria PNG, mas os bytes reais são de outra coisa", () => {
    // Simula exatamente o ataque que essa validação existe para prevenir: um cliente que declara
    // file.type = "image/png" mas envia um payload arbitrário (aqui, um HTML disfarçado).
    const forged = Buffer.from("<html><script>alert(1)</script></html>");
    expect(detectImageType(forged)).toBeNull();
  });

  it("CASO 6: rejeita um buffer curto demais para conter qualquer assinatura", () => {
    expect(detectImageType(Buffer.from([0x89, 0x50]))).toBeNull();
  });
});

describe("extensionFor", () => {
  it("mapeia cada tipo permitido para a extensão correta", () => {
    expect(extensionFor("image/png")).toBe("png");
    expect(extensionFor("image/webp")).toBe("webp");
    expect(extensionFor("image/jpeg")).toBe("jpg");
  });
});
