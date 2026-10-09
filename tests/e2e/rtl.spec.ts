import { expect, test } from "@playwright/test";
import { login } from "./helpers";

// 16.2 #4 — switching the UI to Arabic flips the document to RTL and moves the
// sidebar to the right.
test("Arabic locale sets dir=rtl and the sidebar moves right", async ({
  page,
}) => {
  await login(page);
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");

  await page.getByRole("button", { name: "العربية" }).click();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");

  const sidebar = page.locator("aside").first();
  await expect(sidebar).toBeVisible();
  const box = await sidebar.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  // In RTL the sidebar sits on the right half of the viewport.
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeGreaterThan(
    (viewport?.width ?? 0) * 0.6,
  );
  expect(box?.x ?? 0).toBeGreaterThan((viewport?.width ?? 0) / 2);
});
