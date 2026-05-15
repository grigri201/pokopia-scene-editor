import { expect, test, type Page } from '@playwright/test';

test('renders the Open Design workbench as the first screen', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');

  await expect(page.getByLabel('Pokopia scene editor workbench')).toBeVisible();
  await expect(page.getByLabel('Pokemon scene controls')).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Building level panel' })).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Asset picker' })).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Preview inspector' })).toBeVisible();
  await expect(page.getByLabel('Current building level')).toHaveText('Current L0');
  await expect(page.getByTestId('building-level-row')).toHaveCount(3);
  await expect(page.getByTestId('building-level-row').nth(0)).toHaveAttribute('data-display-id', 'L2');
  await expect(page.getByTestId('building-level-row').nth(1)).toHaveAttribute('data-display-id', 'L1');
  await expect(page.getByTestId('building-level-row').nth(2)).toHaveAttribute('data-display-id', 'L0');
  await expect(page.getByTestId('building-level-row').nth(2)).toHaveAttribute('data-current', 'true');
  await expect(page.getByLabel('L0, 0 层, 0 instances, visible, unlocked, current editing layer')).toBeVisible();
  await expect(page.getByTestId('scene-cell')).toHaveCount(49);
  await expect(page.getByLabel('Cell 0,0, outer area, level-0, placeable')).toBeVisible();
  await expect(page.getByLabel('Cell 1,1, main area, level-0, placeable')).toBeVisible();
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

  await page.locator('[data-coordinate="2,3"]').click();
  await expect(page.locator('[data-coordinate="2,3"]')).toHaveAttribute('data-selected', 'true');
  await expect(page.getByLabel('Selected coordinate')).toHaveText('2,3');
  await expect(page.getByLabel('Selected area')).toHaveText('main');
  await expect(page.getByLabel('Selected layer')).toHaveText('0 层');
  await expect(page.getByLabel('Selected occupancy')).toHaveText('Empty cell');

  await page.locator('[data-coordinate="0,0"]').hover();
  await expect(page.getByLabel('Target coordinate')).toHaveText('0,0');
  await expect(page.getByLabel('Target area')).toHaveText('outer');
  await expect(page.getByLabel('Target placeable')).toHaveText('Placeable');

  await page.locator('[data-coordinate="4,4"]').focus();
  await page.mouse.move(10, 10);
  await expect(page.getByLabel('Target coordinate')).toHaveText('4,4');

  await page.evaluate(() => performance.clearMeasures('scene-selection-duration'));
  await page.locator('[data-coordinate="2,3"]').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByLabel('Selected coordinate')).toHaveText('3,3');
  await expect(page.locator('[data-coordinate="3,3"]')).toBeFocused();
  await page.waitForFunction(() => performance.getEntriesByName('scene-selection-duration').length > 0);
  const selectionDuration = await page.evaluate(() => {
    const entries = performance.getEntriesByName('scene-selection-duration');
    return entries.at(-1)?.duration ?? Number.POSITIVE_INFINITY;
  });
  expect(selectionDuration).toBeLessThanOrEqual(100);
});

test('switches scaffold controls to read-only below the mobile breakpoint', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  await expect(page.getByLabel('Interaction mode')).toHaveText('Mobile read-only mode');
  await expect(page.getByLabel('Save status')).toHaveText('Read-only');
  await expect(page.getByLabel('Current Pokemon')).toBeDisabled();
  await expect(page.getByLabel('Scene Name')).toHaveAttribute('readonly', '');
  await expect(page.getByLabel('Current building level')).toHaveText('Current L0');
  await expect(page.getByTestId('building-level-row')).toHaveCount(3);
  await expect(page.getByLabel('L2, 2 层, 0 instances, visible, unlocked')).toBeVisible();
  await expect(page.getByLabel('L0, 0 层, 0 instances, visible, unlocked, current editing layer')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(
    true,
  );
  expect(
    await page.getByTestId('building-level-row').evaluateAll((rows) =>
      rows.every((row) => row.scrollWidth <= row.clientWidth),
    ),
  ).toBe(true);
  expect(
    await page.locator('.level-actions button').evaluateAll((buttons) =>
      buttons.every((button) => button.scrollWidth <= button.clientWidth),
    ),
  ).toBe(true);
  await expect(page.getByRole('button', { name: 'Wooden Floor' })).toBeDisabled();
  await expect(page.getByTestId('scene-cell')).toHaveCount(49);
  await expect(page.getByLabel('Cell 0,0, outer area, level-0, read-only')).toBeVisible();
  await expect(page.locator('[data-placeable="true"]')).toHaveCount(49);
  await expect(page.locator('[data-editable="false"]')).toHaveCount(49);

  const sceneBefore = await readSceneSnapshot(page);
  expect(sceneBefore.workspaceState.saveStatus).toBe('saved');
  expect(sceneBefore.workspaceState.selectedCoordinate).toBeNull();
  await page.locator('[data-coordinate="2,3"]').click();
  await expect(page.getByLabel('Selected coordinate')).toHaveText('2,3');
  await expect(page.getByLabel('Selected area')).toHaveText('main');
  await expect(page.getByLabel('Selected layer')).toHaveText('0 层');
  expect(
    await page.locator('.selection-card').evaluateAll((cards) =>
      cards.every((card) => card.scrollWidth <= card.clientWidth),
    ),
  ).toBe(true);
  await page.keyboard.press('ArrowRight');
  await expect(page.getByLabel('Selected coordinate')).toHaveText('3,3');
  await page.keyboard.press('Delete');
  await page.keyboard.press('ControlOrMeta+S');
  await expect(page.getByLabel('Save status')).toHaveText('Read-only');
  const sceneAfter = await readSceneSnapshot(page);
  expect(sceneAfter).toEqual(sceneBefore);
  expect(sceneAfter.workspaceState.saveStatus).toBe('saved');

  await page.setViewportSize({ width: 1280, height: 720 });
  await expect(page.getByLabel('Interaction mode')).toHaveText('Desktop edit mode');
  await page.locator('[data-coordinate="4,4"]').click();
  await expect(page.getByLabel('Selected coordinate')).toHaveText('4,4');
  const desktopScene = await readSceneSnapshot(page);
  expect(desktopScene.workspaceState.selectedCoordinate).toEqual({ x: 4, y: 4 });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByLabel('Interaction mode')).toHaveText('Mobile read-only mode');
  await expect(page.getByLabel('Selected coordinate')).toHaveText('4,4');
});

interface SceneSnapshot {
  workspaceState: {
    selectedCoordinate: { x: number; y: number } | null;
    saveStatus: string;
  };
  tileInstances: unknown[];
  buildingLevels: unknown[];
}

async function readSceneSnapshot(page: Page): Promise<SceneSnapshot> {
  const snapshotText = await page.evaluate(() => {
    const testWindow = window as unknown as { __pokopiaSceneSnapshot?: () => string };
    if (!testWindow.__pokopiaSceneSnapshot) {
      throw new Error('Missing scene snapshot helper.');
    }

    return testWindow.__pokopiaSceneSnapshot();
  });
  expect(snapshotText).not.toBe('');
  const snapshot = JSON.parse(snapshotText) as SceneSnapshot;
  expect(snapshot.workspaceState).toBeTruthy();
  expect(Array.isArray(snapshot.tileInstances)).toBe(true);
  expect(Array.isArray(snapshot.buildingLevels)).toBe(true);

  return snapshot;
}
