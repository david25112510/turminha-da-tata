import { expect, test } from "@playwright/test";

const viewports = [
  { width: 320, height: 844 },
  { width: 360, height: 844 },
  { width: 375, height: 844 },
  { width: 390, height: 844 },
  { width: 393, height: 852 },
  { width: 414, height: 896 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
];

for (const viewport of viewports) {
  test(`home e matrícula não têm overflow em ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    for (const path of ["/", "/matricula"]) {
      await page.goto(path);
      const dimensions = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        content: document.documentElement.scrollWidth,
      }));
      expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
    }
  });
}
