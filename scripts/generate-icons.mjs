import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SOURCE = path.join(ROOT, "design", "assets", "tata-bust-nobg-full.png");
const OUT_DIR = path.join(ROOT, "public", "icons");
const BG = "#1FA787";

async function makeIcon(size, fileName, { maskable = false } = {}) {
  const padding = maskable ? Math.round(size * 0.18) : Math.round(size * 0.08);
  const artSize = size - padding * 2;

  const art = await sharp(SOURCE)
    .resize(artSize, artSize, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: { width: size, height: size, channels: 4, background: BG },
  })
    .composite([{ input: art, gravity: "center" }])
    .png()
    .toFile(path.join(OUT_DIR, fileName));

  console.log("Generated", fileName);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  await makeIcon(192, "icon-192.png");
  await makeIcon(512, "icon-512.png");
  await makeIcon(512, "icon-maskable-512.png", { maskable: true });
  await makeIcon(180, "apple-touch-icon.png");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
