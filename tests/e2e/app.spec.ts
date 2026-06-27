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
  await expect(page.getByText(/0 (de|of) 72/)).toBeVisible();
});

test('mobile navigation has no horizontal page overflow', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile');
  await page.getByRole('button', { name: /Terceros|Thirds/ }).click();
  await expect(page.getByRole('heading', { name: /Mejores terceros|Best thirds/ })).toBeVisible();
  await page.getByRole('button', { name: /Cuadro|Bracket/ }).click();
  await expect(page.getByText(/Completa los 72 partidos|Complete all 72/)).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
