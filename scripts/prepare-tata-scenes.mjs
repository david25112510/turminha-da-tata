import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const sourceRoot = "C:/Users/David-Souza/.codex/generated_images/01a04fe8-cc05-7ba3-a3e1-ab89ecd2f1b5";
const outputRoot = "public/images/tata/scenes";
const scenes = {
  welcome: "exec-b549047d-2964-4674-b937-3a05e66070d3.png",
  login: "exec-6e710c0d-4f6c-4885-a8f0-d85faa1bc3e4.png",
  security: "exec-bd624f49-7a4c-413c-990e-10c4e8169875.png",
  enrollment: "exec-b3fe9d69-4020-4527-b642-21f62b7bc0ae.png",
  "guide-left": "exec-9f508c9a-432a-4e07-ae70-11dbeb31f13a.png",
  "guide-right": "exec-89fc61a2-0d00-45a4-a042-22e6f6eb488a.png",
  thinking: "exec-a8af426a-266f-4b33-8a3f-f64b9c4cd19a.png",
  success: "exec-ba2f0e3d-8ce9-43bd-8514-6fb313b153c7.png",
  celebration: "exec-691d09fd-3211-4094-9d19-3ce7a094a773.png",
  empty: "exec-8502d2ef-9ec9-45bf-a0b2-a1550b28cb3c.png",
  error: "exec-4c32b678-8ef2-415e-baa9-85e4efe5b7ae.png",
  parents: "exec-8104e2cd-3331-4021-afe5-13fa3cdfcff2.png",
  caregiver: "exec-31dd948a-1daa-4548-b6c8-d08a3de9bbec.png",
  sleeping: "exec-7d9bc897-0013-4dad-a66a-8a288c7cdea4.png",
  photo: "exec-05715766-e45b-43ea-ad5d-9bcb0b59bd1d.png",
  "loading-heart": "exec-f0cc83c6-9ea7-4619-849e-6568eff8eec3.png",
};

await mkdir(outputRoot, { recursive: true });
await Promise.all(Object.entries(scenes).map(async ([scene, source]) => {
  let pipeline = sharp(path.join(sourceRoot, source));
  if (scene === "loading-heart") {
    const { data, info } = await pipeline.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
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
    for (let pixel = 0; pixel < count; pixel++) {
      const x = pixel % info.width, y = Math.floor(pixel / info.width);
      const protectsLogo = x > info.width * .3 && x < info.width * .7 && y > info.height * .55 && y < info.height * .75;
      if (background[pixel] || (isGreen(pixel) && !protectsLogo)) data[pixel * 4 + 3] = 0;
    }
    pipeline = sharp(data, { raw: info });
  }
  return pipeline
    .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 86, alphaQuality: 100, effort: 5 })
    .toFile(path.join(outputRoot, `tata-${scene}.webp`));
}));

console.log(`Prepared ${Object.keys(scenes).length} Tatá scenes.`);
