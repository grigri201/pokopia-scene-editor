import { expect, test, type Page } from '@playwright/test';

test('renders the Open Design workbench as the first screen', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');

  await expect(page.getByLabel('Pokopia scene editor workbench')).toBeVisible();
  expect(await getShellTransitionDuration(page)).toBe('0s');
  await expect(page.getByLabel('Pokemon scene controls')).toBeVisible();
  await expect(page.getByLabel('Current Pokemon')).toHaveValue('ditto');
  await expect(page.getByLabel('Scene Name')).toHaveValue('Ditto 5x5 布景草稿');
  await expect(page.getByLabel('Save status')).toHaveText('Saved');
  const shellThemeBefore = await getShellTheme(page);
  const semanticColorsBefore = await getSemanticColors(page);
  expect(shellThemeBefore.pokemonBackground).toBe('#e6d1df');
  expect(shellThemeBefore.pokemonAccent).toBe('#7d4a74');
  await expect(page.getByRole('complementary', { name: 'Building level panel' })).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Asset picker' })).toBeVisible();
  await expect(page.getByLabel('Asset result count')).toHaveText('06 / 06');
  await expect(page.getByLabel('Current placement asset')).toContainText('None');
  await expect(page.locator('[data-asset-id="wooden-floor"] .asset-thumb')).toBeVisible();
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

  await page.getByLabel('Current Pokemon').fill('eevee');
  await expect(page.getByLabel('Current Pokemon')).toHaveValue('eevee');
  await expect(page.getByLabel('Save status')).toHaveText('Dirty');
  expect(await getShellTheme(page)).toMatchObject({
    pokemonBackground: '#d8c3a4',
    pokemonAccent: '#855f37',
  });
  expect(await getSemanticColors(page)).toEqual(semanticColorsBefore);
  await page.getByLabel('Scene Name').fill('Garden 5x5 Layout');
  await expect(page.getByLabel('Save status')).toHaveText('Dirty');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByLabel('Interaction mode')).toHaveText('Mobile read-only mode');
  await expect(page.getByLabel('Save status')).toHaveText('Read-only · Dirty');
  await page.setViewportSize({ width: 1280, height: 720 });
  await expect(page.getByLabel('Interaction mode')).toHaveText('Desktop edit mode');
  await expect(page.getByLabel('Save status')).toHaveText('Dirty');
  await page.getByRole('button', { name: 'Save scene' }).click();
  await expect(page.getByLabel('Save status')).toHaveText('Saved');
  const sceneBeforeDetail = await readSceneSnapshot(page);
  await page.getByRole('button', { name: 'View Garden Plant details' }).click();
  await expect(page.getByLabel('Garden Plant asset detail')).toContainText('garden-plant');
  await expect(page.getByAltText('Garden plant thumbnail')).toBeVisible();
  expect(await readSceneSnapshot(page)).toEqual(sceneBeforeDetail);
  await page.getByRole('button', { name: /Garden Plant.*No\. 014/ }).click();
  await expect(page.getByLabel('Current placement asset')).toContainText('Garden Plant');
  await expect(page.getByLabel('Current placement asset')).toContainText('Ready to place');
  await expect(page.getByLabel('Garden Plant asset detail')).toContainText('Default skill: leaf');
  const assetScene = await readSceneSnapshot(page);
  expect(assetScene.workspaceState.selectedAssetId).toBe('garden-plant');
  expect(assetScene.workspaceState.saveStatus).toBe('dirty');
  await page.getByRole('button', { name: 'Save scene' }).click();
  await expect(page.getByLabel('Save status')).toHaveText('Saved');

  const beforeSearchBox = await page.getByTestId('scene-canvas').boundingBox();
  const beforeSearchCellBox = await page.getByTestId('scene-cell').first().boundingBox();
  await page.getByLabel('Search assets').fill('plant');
  await expect(page.getByLabel('Asset result count')).toHaveText('01 / 06');
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
  await expect(page.getByLabel('Save status')).toHaveText('Read-only · Saved');
  await expect(page.getByLabel('Current Pokemon')).toBeDisabled();
  await expect(page.getByLabel('Scene Name')).toHaveAttribute('readonly', '');
  await expect(page.getByRole('button', { name: 'Toggle grid' })).toBeDisabled();
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
  await expect(page.getByRole('button', { name: /Wooden Floor.*No\. 001/ })).toBeEnabled();
  await expect(page.getByTestId('scene-cell')).toHaveCount(49);
  await expect(page.getByLabel('Cell 0,0, outer area, level-0, read-only')).toBeVisible();
  await expect(page.locator('[data-placeable="true"]')).toHaveCount(49);
  await expect(page.locator('[data-editable="false"]')).toHaveCount(49);

  const sceneBefore = await readSceneSnapshot(page);
  expect(sceneBefore.workspaceState.saveStatus).toBe('saved');
  expect(sceneBefore.workspaceState.selectedCoordinate).toBeNull();
  expect(sceneBefore.workspaceState.selectedAssetId).toBeNull();
  await page.getByRole('button', { name: 'View Wooden Floor details' }).click();
  await expect(page.getByLabel('Wooden Floor asset detail')).toContainText('wooden-floor');
  expect(await readSceneSnapshot(page)).toEqual(sceneBefore);
  await page.getByRole('button', { name: /Wooden Floor.*No\. 001/ }).click();
  await expect(page.getByLabel('Current placement asset')).toContainText('Wooden Floor');
  await expect(page.getByLabel('Current placement asset')).toContainText('View only details');
  await expect(page.getByLabel('Wooden Floor asset detail')).toContainText('No. 001');
  expect(await readSceneSnapshot(page)).toEqual(sceneBefore);
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
  await page.getByRole('button', { name: 'Save scene' }).evaluate((button) => {
    (button as HTMLButtonElement).click();
  });
  await page.getByRole('button', { name: 'Toggle grid' }).evaluate((button) => {
    (button as HTMLButtonElement).click();
  });
  await expect(page.getByLabel('Save status')).toHaveText('Read-only · Saved');
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
    selectedAssetId: string | null;
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

async function getShellTheme(page: Page): Promise<{
  pokemonBackground: string;
  pokemonBackgroundInk: string;
  pokemonAccent: string;
}> {
  return page.getByLabel('Pokopia scene editor workbench').evaluate((element) => {
    const styles = getComputedStyle(element);
    return {
      pokemonBackground: styles.getPropertyValue('--pokemon-background').trim(),
      pokemonBackgroundInk: styles.getPropertyValue('--pokemon-background-ink').trim(),
      pokemonAccent: styles.getPropertyValue('--pokemon-accent').trim(),
    };
  });
}

async function getShellTransitionDuration(page: Page): Promise<string> {
  return page.getByLabel('Pokopia scene editor workbench').evaluate((element) =>
    getComputedStyle(element).transitionDuration,
  );
}

async function getSemanticColors(page: Page): Promise<{
  mainArea: string;
  outerArea: string;
  selectedCell: string;
  hoverCell: string;
  lockedLayer: string;
  skillMarker: string;
  error: string;
}> {
  return page.getByLabel('Pokopia scene editor workbench').evaluate((element) => {
    const styles = getComputedStyle(element);
    return {
      mainArea: styles.getPropertyValue('--color-main-area').trim(),
      outerArea: styles.getPropertyValue('--color-outer-area').trim(),
      selectedCell: styles.getPropertyValue('--color-selected-cell').trim(),
      hoverCell: styles.getPropertyValue('--color-hover-cell').trim(),
      lockedLayer: styles.getPropertyValue('--color-locked-layer').trim(),
      skillMarker: styles.getPropertyValue('--color-skill-marker').trim(),
      error: styles.getPropertyValue('--color-error').trim(),
    };
  });
}
