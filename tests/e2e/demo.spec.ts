// Dossier - Demo E2E Test Suite
// https://github.com/red-shadows-rs/dossier

import { expect, test } from "@playwright/test";

test("clicking Try Live Demo on login page authenticates and renders demo banner", async ({
  page,
}) => {
  await page.goto("/login");
  const demoBtn = page.getByRole("button", { name: "Try Live Demo" });
  await expect(demoBtn).toBeVisible();
  await demoBtn.click();

  await expect(page).toHaveURL(/\/$/);

  const banner = page.getByText("Demo Mode");
  await expect(banner).toBeVisible();

  const resetBtn = page.getByRole("button", { name: "Reset Demo Data" });
  await expect(resetBtn).toBeVisible();
  await resetBtn.click();

  await expect(
    page.getByText("Demo data has been restored to default state."),
  ).toBeVisible();
});
