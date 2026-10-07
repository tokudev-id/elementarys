import { expect, type Page } from "@playwright/test";
export const mobileViewports = [
  { name: "360 portrait", width: 360, height: 800 },
  { name: "360 landscape", width: 800, height: 360 },
  { name: "768 portrait", width: 768, height: 1024 },
  { name: "768 landscape", width: 1024, height: 768 },
  { name: "1024 portrait", width: 1024, height: 1366 },
  { name: "1024 landscape", width: 1366, height: 1024 },
];
export async function expectNoPageOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
}
export async function expectTouchTarget(page: Page, selector: string) {
  for (const locator of await page.locator(selector).all()) {
    if (!(await locator.isVisible())) continue;
    const box = await locator.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }
}
