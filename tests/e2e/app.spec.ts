import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('desktop shows the three operational panels', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  await expect(page.getByRole('heading', { name: /Grupos|Groups/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Mejores terceros|Best thirds/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Eliminatorias|Knockout/ })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: /Partidos restantes|Remaining group stage matches/ })
  ).toBeVisible();
});

test('mobile navigation has no horizontal page overflow', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile');
  await page.getByRole('button', { name: /Terceros|Thirds/ }).click();
  await expect(page.getByRole('heading', { name: /Mejores terceros|Best thirds/ })).toBeVisible();
  await page.getByRole('button', { name: /Cuadro|Bracket/ }).click();
  await expect(page.getByText(/Opción \d+|Option \d+/)).toBeVisible();
  await expect(page.getByRole('button', { name: /M73/ })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test('official sync restores every still-possible combination', async ({ page }) => {
  await page.getByTestId('open-combinations').click();
  await expect(page.getByText(/8 (de|of) 495/)).toBeVisible();

  await page.getByTestId('combination-group-A').click();
  await page.getByTestId('combinations-sync-official').click();

  await expect(page.getByTestId('combinations-only-possible')).toBeChecked();
  await expect(page.getByTestId('combination-row')).toHaveCount(8);
  await expect(page.locator('[data-current-official="true"]')).toHaveCount(1);

  for (const letter of ['B', 'D', 'E', 'F', 'I']) {
    await expect(page.getByTestId(`combination-group-${letter}`)).toHaveClass(/bg-emerald-600/);
  }
  await expect(page.getByTestId('combination-group-A')).not.toHaveClass(/bg-emerald-600/);
});
