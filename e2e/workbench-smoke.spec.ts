import { expect, test } from '@playwright/test';

test('renders the Open Design workbench as the first screen', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByLabel('Pokopia scene editor workbench')).toBeVisible();
  await expect(page.getByLabel('Pokemon scene controls')).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Building level panel' })).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Asset picker' })).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Preview inspector' })).toBeVisible();
  await expect(page.getByTestId('scene-cell')).toHaveCount(49);
  await expect(page.getByLabel('Cell 0,0, outer area, layer 0')).toBeVisible();
  await expect(page.getByLabel('Cell 1,1, main area, layer 0')).toBeVisible();
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
});
