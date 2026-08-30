import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const source = process.argv[2];
const output = process.argv[3] ?? "public/images/brand/logo-turminha-da-tata.webp";

if (!source) {
  throw new Error("Usage: node scripts/prepare-brand-logo.mjs <source-image> [output-image]");
}
const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const count = info.width * info.height;
const background = new Uint8Array(count);
const queue = new Int32Array(count);
let head = 0, tail = 0;
const isGreen = (pixel) => {
  const offset = pixel * 4, r = data[offset], g = data[offset + 1], b = data[offset + 2];
  return g > 70 && g - Math.max(r, b) > 18 && g > r * 1.1 && g > b * 1.1;
};
const add = (pixel) => { if (!background[pixel] && isGreen(pixel)) { background[pixel] = 1; queue[tail++] = pixel; } };
for (let x = 0; x < info.width; x++) { add(x); add((info.height - 1) * info.width + x); }
for (let y = 0; y < info.height; y++) { add(y * info.width); add(y * info.width + info.width - 1); }
while (head < tail) {
  const pixel = queue[head++], x = pixel % info.width, y = Math.floor(pixel / info.width);
  if (x) add(pixel - 1); if (x + 1 < info.width) add(pixel + 1);
  if (y) add(pixel - info.width); if (y + 1 < info.height) add(pixel + info.width);
}
for (let pixel = 0; pixel < count; pixel++) if (background[pixel]) data[pixel * 4 + 3] = 0;
await mkdir("public/images/brand", { recursive: true });
await sharp(data, { raw: info }).resize({ width: 760, withoutEnlargement: true }).webp({ quality: 90, alphaQuality: 100, effort: 5 }).toFile(output);
console.log(`Prepared ${output}`);
