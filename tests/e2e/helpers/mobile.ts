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
  const boxes = await page.locator(selector).evaluateAll((elements) =>
    elements
      .filter(
        (element) =>
          element.getClientRects().length > 0 && getComputedStyle(element).visibility !== "hidden",
      )
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          width: rect.width,
          height: rect.height,
          label:
            element.getAttribute("aria-label") ??
            element.textContent?.trim().slice(0, 80) ??
            element.tagName,
        };
      }),
  );
  for (const box of boxes) {
    expect(box.width, box.label).toBeGreaterThanOrEqual(44);
    expect(box.height, box.label).toBeGreaterThanOrEqual(44);
  }
}
