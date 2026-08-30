import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const sourceRoot = "C:/Users/David-Souza/.codex/generated_images/01a04fe8-cc05-7ba3-a3e1-ab89ecd2f1b5";
const outputRoot = "public/images/tata/scenes";
const scenes = {
  welcome: "exec-4abd8c9c-eeda-4938-8b58-4292f3f8b575.png",
  login: "exec-267b77cd-d4b7-4c3b-93f0-ea644ee4db4c.png",
  security: "exec-c9356637-1c2d-4b9d-b7d4-ad32d88c850c.png",
  enrollment: "exec-ab141e1f-a1d9-4426-bfb6-3d4e07b66d14.png",
  "guide-left": "exec-4f29c0a6-6ef5-4aac-87ba-d6a4c2797402.png",
  "guide-right": "exec-deef9391-f5b8-405a-89b6-b34f031c2fbc.png",
  thinking: "exec-b3309e32-99e9-4e81-80c9-aef6534ef86c.png",
  success: "exec-17d2f1ba-a65c-4c1b-b43e-4be693b02983.png",
  celebration: "exec-514866cc-bff8-4585-ba93-d673ea905c3f.png",
  empty: "exec-493e083a-436b-4f8f-937a-e8faddd714de.png",
  error: "exec-505c33a6-8da5-498f-9218-8a7d2124bc04.png",
  parents: "exec-2da227ad-f66f-4c68-acd8-22f11656fa82.png",
  caregiver: "exec-27a74546-2758-4b04-b509-47b21153f681.png",
  sleeping: "exec-72f6cdcd-2e5a-4f6c-bf06-8c2e12e87674.png",
  photo: "exec-6a017a6c-028d-47aa-b94b-743173d7c843.png",
  "loading-heart": "exec-f0cc83c6-9ea7-4619-849e-6568eff8eec3.png",
};

await mkdir(outputRoot, { recursive: true });
await Promise.all(Object.entries(scenes).map(async ([scene, source]) => {
  let pipeline = sharp(path.join(sourceRoot, source));
  {
    const { data, info } = await pipeline.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const count = info.width * info.height;
    const background = new Uint8Array(count);
    const queue = new Int32Array(count);
    let head = 0, tail = 0;
    const isGreen = (pixel) => {
      const offset = pixel * 4, r = data[offset], g = data[offset + 1], b = data[offset + 2];
      return g > 70 && g - Math.max(r, b) > 18 && g > r * 1.1 && g > b * 1.1;
    };
    const isStrongGreen = (pixel) => {
      const offset = pixel * 4, r = data[offset], g = data[offset + 1], b = data[offset + 2];
      return g > 150 && g - Math.max(r, b) > 80 && g > r * 1.5 && g > b * 1.5;
    };
    const add = (pixel) => { if (!background[pixel] && isGreen(pixel)) { background[pixel] = 1; queue[tail++] = pixel; } };
    for (let x = 0; x < info.width; x++) { add(x); add((info.height - 1) * info.width + x); }
    for (let y = 0; y < info.height; y++) { add(y * info.width); add(y * info.width + info.width - 1); }
    while (head < tail) {
      const pixel = queue[head++], x = pixel % info.width, y = Math.floor(pixel / info.width);
      if (x) add(pixel - 1); if (x + 1 < info.width) add(pixel + 1);
      if (y) add(pixel - info.width); if (y + 1 < info.height) add(pixel + info.width);
    }
    for (let pixel = 0; pixel < count; pixel++) {
      if (background[pixel] || isStrongGreen(pixel)) data[pixel * 4 + 3] = 0;
    }
    pipeline = sharp(data, { raw: info });
  }
  return pipeline
    .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 86, alphaQuality: 100, effort: 5 })
    .toFile(path.join(outputRoot, `tata-${scene}.webp`));
}));

console.log(`Prepared ${Object.keys(scenes).length} Tatá scenes.`);
