import { test, expect } from "./fixtures";
import { mobileViewports, expectNoPageOverflow, expectTouchTarget } from "./helpers/mobile";
for (const viewport of mobileViewports) {
  test(`komponen: ${viewport.name}`, async ({ browser }) => {
    const context = await browser.newContext({
      baseURL: test.info().project.use.baseURL,
      viewport,
      hasTouch: true,
    });
    const page = await context.newPage();
    await page.goto("/component-preview");
    await expectNoPageOverflow(page);
    await expectTouchTarget(page, ".status-choices span, button");
    expect(
      await page
        .getByRole("button", { name: "Buka dialog", exact: true })
        .evaluate((element) =>
          getComputedStyle(element).getPropertyValue("-webkit-tap-highlight-color"),
        ),
    ).toBe("rgba(0, 0, 0, 0)");
    await page.screenshot({
      path: `test-results/components-${viewport.name.replaceAll(" ", "-")}.png`,
      fullPage: true,
    });
    await page.getByText("S Sakit", { exact: true }).tap();
    await expect(page.getByRole("radio", { name: "S Sakit" })).toBeChecked();
    await page.setViewportSize({ width: viewport.height, height: viewport.width });
    await expect(page.getByRole("radio", { name: "S Sakit" })).toBeChecked();
    await expectNoPageOverflow(page);
    await page.getByRole("button", { name: "Buka bottom sheet" }).tap();
    await expect(page.getByRole("dialog")).toBeVisible();
    const dialogBox = await page.getByRole("dialog").boundingBox();
    const dialogViewport = page.viewportSize()!;
    expect(dialogBox!.x).toBeGreaterThanOrEqual(0);
    expect(dialogBox!.y).toBeGreaterThanOrEqual(0);
    expect(dialogBox!.x + dialogBox!.width).toBeLessThanOrEqual(dialogViewport.width);
    expect(dialogBox!.y + dialogBox!.height).toBeLessThanOrEqual(dialogViewport.height);
    await page.getByRole("button", { name: "Konfirmasi", exact: true }).tap();
    await expect(page.getByLabel("Nama contoh", { exact: true })).toBeFocused();
    await expect(page.getByText("Isi nama sebelum mengonfirmasi.")).toBeVisible();
    await page.getByLabel("Nama contoh", { exact: true }).fill("Isian sintetis");
    await page.setViewportSize({ width: 360, height: 340 });
    await expect
      .poll(async () => {
        const dialog = await page.getByRole("dialog").boundingBox();
        return dialog!.y + dialog!.height;
      })
      .toBeLessThanOrEqual(340);
    await expect(page.getByRole("button", { name: "Konfirmasi", exact: true })).toBeInViewport();
    await page.getByLabel("Catatan contoh", { exact: true }).focus();
    await expect(page.getByLabel("Catatan contoh", { exact: true })).toBeInViewport();
    await page.screenshot({
      path: `test-results/keyboard-resize-${viewport.name.replaceAll(" ", "-")}.png`,
    });
    await page.getByRole("button", { name: "Konfirmasi", exact: true }).tap();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Buka bottom sheet" })).toBeFocused();
    await expect(page.getByText("Isian contoh dikonfirmasi.")).toBeVisible();
    await context.close();
  });
}
test("dialog keyboard focus and Escape", async ({ page }) => {
  await page.goto("/component-preview");
  const trigger = page.getByRole("button", { name: "Buka dialog", exact: true });
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Tutup Konfirmasi isian contoh" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(page.getByRole("button", { name: "Konfirmasi", exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Tutup Konfirmasi isian contoh" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await page.getByRole("radio", { name: "H Hadir" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("radio", { name: "S Sakit" })).toBeChecked();
  const outline = await page
    .locator(".status-choices input:checked + span")
    .evaluate((el) => getComputedStyle(el).outlineWidth);
  expect(outline).toBe("2px");
});
