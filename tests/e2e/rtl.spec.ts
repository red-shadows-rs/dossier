// Dossier - Rtl E2E Test Suite
// https://github.com/red-shadows-rs/dossier

import { expect, test } from "@playwright/test";
import { login } from "./helpers";

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
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeGreaterThan(
    (viewport?.width ?? 0) * 0.6,
  );
  expect(box?.x ?? 0).toBeGreaterThan((viewport?.width ?? 0) / 2);
});
