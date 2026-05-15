import { expect, test } from '@playwright/test';

test('renders the Open Design workbench as the first screen', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');

  await expect(page.getByLabel('Pokopia scene editor workbench')).toBeVisible();
  await expect(page.getByLabel('Pokemon scene controls')).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Building level panel' })).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Asset picker' })).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Preview inspector' })).toBeVisible();
  await expect(page.getByTestId('scene-cell')).toHaveCount(49);
  await expect(page.getByLabel('Cell 0,0, outer area, layer 0, placeable')).toBeVisible();
  await expect(page.getByLabel('Cell 1,1, main area, layer 0, placeable')).toBeVisible();
  await expect(page.locator('[data-area="main"]')).toHaveCount(25);
  await expect(page.locator('[data-area="outer"]')).toHaveCount(24);
  await expect(page.locator('[data-main-boundary="true"]')).toHaveCount(16);
  await expect(page.locator('[data-placeable="true"]')).toHaveCount(49);
  await expect(page.locator('[data-editable="true"]')).toHaveCount(49);

  const mainBoundaryShadow = await page
    .locator('[data-main-boundary="true"]')
    .first()
    .evaluate((element) => getComputedStyle(element).boxShadow);
  const outerBorderStyle = await page
    .locator('[data-area="outer"]')
    .first()
    .evaluate((element) => getComputedStyle(element).borderStyle);
  await expect(page.locator('[data-area="main"]').first().locator('.cell-area')).toHaveText('main');
  await expect(page.locator('[data-area="outer"]').first().locator('.cell-area')).toHaveText('outer');
  expect(mainBoundaryShadow).not.toBe('none');
  expect(outerBorderStyle).toBe('dashed');

  const canvasBox = await page.getByTestId('scene-canvas').boundingBox();
  const firstCellBox = await page.getByTestId('scene-cell').first().boundingBox();
  expect(canvasBox).not.toBeNull();
  expect(firstCellBox).not.toBeNull();
  expect(Math.abs((canvasBox?.width ?? 0) - (canvasBox?.height ?? 0))).toBeLessThanOrEqual(1);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
  ).toBe(true);

  const beforeSearchBox = await page.getByTestId('scene-canvas').boundingBox();
  const beforeSearchCellBox = await page.getByTestId('scene-cell').first().boundingBox();
  await page.getByLabel('Search assets').fill('plant');
  const afterSearchBox = await page.getByTestId('scene-canvas').boundingBox();
  const afterSearchCellBox = await page.getByTestId('scene-cell').first().boundingBox();
  expect(Math.abs((beforeSearchBox?.width ?? 0) - (afterSearchBox?.width ?? 0))).toBeLessThanOrEqual(
    1,
  );
  expect(
    Math.abs((beforeSearchBox?.height ?? 0) - (afterSearchBox?.height ?? 0)),
  ).toBeLessThanOrEqual(1);
  expect(
    Math.abs((beforeSearchCellBox?.width ?? 0) - (afterSearchCellBox?.width ?? 0)),
  ).toBeLessThanOrEqual(1);
  expect(
    Math.abs((beforeSearchCellBox?.height ?? 0) - (afterSearchCellBox?.height ?? 0)),
  ).toBeLessThanOrEqual(1);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
  ).toBe(true);
});

test('switches scaffold controls to read-only below the mobile breakpoint', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  await expect(page.getByLabel('Interaction mode')).toHaveText('Mobile read-only mode');
  await expect(page.getByLabel('Save status')).toHaveText('Read-only');
  await expect(page.getByLabel('Current Pokemon')).toBeDisabled();
  await expect(page.getByLabel('Scene Name')).toHaveAttribute('readonly', '');
  await expect(page.getByRole('button', { name: 'Wooden Floor' })).toBeDisabled();
  await expect(page.getByTestId('scene-cell')).toHaveCount(49);
  await expect(page.getByLabel('Cell 0,0, outer area, layer 0, read-only')).toBeVisible();
  await expect(page.locator('[data-placeable="true"]')).toHaveCount(49);
  await expect(page.locator('[data-editable="false"]')).toHaveCount(49);
});
