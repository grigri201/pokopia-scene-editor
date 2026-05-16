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
  const previewInspector = page.getByRole('complementary', { name: 'Preview inspector' });
  const topPreview = previewInspector.getByLabel('Top view preview');
  const previewCell = (coordinate: string) => topPreview.locator(`[data-preview-coordinate="${coordinate}"]`);

  await expect(previewInspector).toBeVisible();
  await expect(page.getByLabel('Dual preview inspector')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Preview current layer' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Preview all visible layers' })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByLabel('Top preview scope')).toHaveText('Current layer preview');
  await expect(page.getByLabel('Top preview layer summary')).toHaveText('L0 0 层 unlocked');
  await expect(page.getByLabel('Top preview item summary')).toHaveText('0 current-layer items');
  await expect(page.getByLabel('Front preview layer summary')).toHaveText('1 visible layer, 0 visible items');
  await expect(topPreview.locator('[data-preview-coordinate]')).toHaveCount(49);
  await expect(topPreview.locator('[data-preview-area="main"]')).toHaveCount(25);
  await expect(topPreview.locator('[data-preview-area="outer"]')).toHaveCount(24);
  await expect(topPreview.locator('[data-preview-main-boundary="true"]')).toHaveCount(16);
  await expect(topPreview.locator('.mini-grid__area').filter({ hasText: 'M' }).first()).toBeVisible();
  await expect(topPreview.locator('.mini-grid__area').filter({ hasText: 'O' }).first()).toBeVisible();
  const previewBoundaryShadow = await topPreview
    .locator('[data-preview-main-boundary="true"]')
    .first()
    .evaluate((element) => getComputedStyle(element).boxShadow);
  expect(previewBoundaryShadow).not.toBe('none');
  const previewBox = await previewInspector.boundingBox();
  expect(previewBox).not.toBeNull();
  expect((previewBox?.y ?? 0) + (previewBox?.height ?? 0)).toBeLessThanOrEqual(720);
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

  await page.getByRole('button', { name: 'New layer' }).click();
  await expect(page.getByLabel('Current building level')).toHaveText('Current L3');
  await expect(page.getByLabel('Building layer feedback')).toHaveText('Created 3 层');
  await expect(page.getByTestId('building-level-row')).toHaveCount(4);
  await expect(page.getByTestId('building-level-row').nth(0)).toHaveAttribute('data-display-id', 'L3');
  await expect(page.getByTestId('building-level-row').nth(0)).toHaveAttribute('data-current', 'true');
  await page.getByLabel('Rename 3 层').fill('屋顶层');
  await page.getByLabel('Rename 3 层').press('Enter');
  await expect(page.getByLabel('L3, 屋顶层, 0 instances, visible, unlocked, current editing layer')).toBeVisible();
  await page.getByRole('button', { name: /Set 0 层 as current building layer/ }).click();
  await expect(page.getByLabel('Current building level')).toHaveText('Current L0');
  const beforeHideBox = await page.getByTestId('scene-canvas').boundingBox();
  const beforeHideCellBox = await page.getByTestId('scene-cell').first().boundingBox();
  await page.getByRole('button', { name: /Hide 0 层/ }).click();
  await expect(page.getByLabel('L0, 0 层, 0 instances, hidden, unlocked, current editing layer')).toBeVisible();
  await expect(page.getByLabel('Cell 1,1, main area, level-0, hidden layer')).toBeVisible();
  const afterHideBox = await page.getByTestId('scene-canvas').boundingBox();
  const afterHideCellBox = await page.getByTestId('scene-cell').first().boundingBox();
  expect(Math.abs((beforeHideBox?.width ?? 0) - (afterHideBox?.width ?? 0))).toBeLessThanOrEqual(1);
  expect(Math.abs((beforeHideCellBox?.width ?? 0) - (afterHideCellBox?.width ?? 0))).toBeLessThanOrEqual(1);
  await page.getByRole('button', { name: /Show 0 层/ }).click();
  await page.getByRole('button', { name: /Lock 0 层/ }).click();
  await expect(page.getByLabel('L0, 0 层, 0 instances, visible, locked, current editing layer')).toBeVisible();
  await expect(page.locator('[data-level-id="level-0"]')).toHaveClass(/level-row--locked/);
  await expect(page.locator('[data-coordinate="1,1"]')).toHaveAttribute('data-editable', 'false');
  await page.getByRole('button', { name: /Unlock 0 层/ }).click();
  await expect(page.locator('[data-coordinate="1,1"]')).toHaveAttribute('data-editable', 'true');

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
  await expect(page.getByLabel('Requires Ditto skill')).toBeChecked();
  await expect(page.getByLabel('Garden Plant asset detail')).toContainText('Default skill: 树叶');
  const assetScene = await readSceneSnapshot(page);
  expect(assetScene.workspaceState.selectedAssetId).toBe('garden-plant');
  expect(assetScene.workspaceState.saveStatus).toBe('dirty');
  await page.getByRole('button', { name: 'Save scene' }).click();
  await expect(page.getByLabel('Save status')).toHaveText('Saved');

  const beforeSearchBox = await page.getByTestId('scene-canvas').boundingBox();
  const beforeSearchCellBox = await page.getByTestId('scene-cell').first().boundingBox();
  const sceneBeforeFilters = await readSceneSnapshot(page);
  await page.evaluate(() => performance.mark('asset-filter-start'));
  await page.getByLabel('Search assets').fill('plant');
  await expect(page.getByLabel('Asset result count')).toHaveText('01 / 06');
  const assetFilterDuration = await measureSinceMark(page, 'asset-filter-start', 'asset-filter-duration');
  expect(assetFilterDuration).toBeLessThanOrEqual(200);
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
  await page.evaluate(() => performance.mark('asset-combined-filter-start'));
  await page.getByRole('button', { name: 'Plant', exact: true }).click();
  await page.getByRole('button', { name: 'Show favorite assets' }).click();
  await page.getByLabel('Skill filter').selectOption('树叶');
  await expect(page.getByLabel('Asset result count')).toHaveText('01 / 06');
  const assetCombinedFilterDuration = await measureSinceMark(
    page,
    'asset-combined-filter-start',
    'asset-combined-filter-duration',
  );
  expect(assetCombinedFilterDuration).toBeLessThanOrEqual(200);
  await page.getByLabel('Search assets').fill('missing asset');
  await expect(page.getByLabel('Asset result count')).toHaveText('00 / 06');
  await expect(page.getByLabel('No matching assets')).toBeVisible();
  await page.getByRole('button', { name: 'Show all' }).click();
  await expect(page.getByLabel('Asset result count')).toHaveText('06 / 06');
  expect(await readSceneSnapshot(page)).toEqual(sceneBeforeFilters);

  await page.locator('[data-coordinate="2,3"]').click();
  await expect(page.locator('[data-coordinate="2,3"]')).toHaveAttribute('data-selected', 'true');
  await expect(page.locator('[data-coordinate="2,3"]')).toHaveAttribute('data-has-instance', 'true');
  await expect(page.locator('[data-coordinate="2,3"]')).toHaveAttribute('data-requires-skill', 'true');
  await expect(page.locator('[data-coordinate="2,3"]')).toContainText('Garden Plant');
  await expect(page.getByLabel('Selected coordinate')).toHaveText('2,3');
  await expect(page.getByLabel('Selected area')).toHaveText('main');
  await expect(page.getByLabel('Selected layer')).toHaveText('0 层');
  await expect(page.getByLabel('Selected occupancy')).toHaveText('Has item');
  await expect(page.getByLabel('Selected asset', { exact: true })).toHaveText('Garden Plant');
  await expect(page.getByLabel('Top preview item summary')).toHaveText('1 current-layer item');
  await expect(page.getByLabel('Top preview selection summary')).toHaveText('2,3 · Garden Plant');
  await expect(page.getByLabel('Front preview layer summary')).toHaveText('1 visible layer, 1 visible item');
  await expect(previewCell('2,3')).toHaveAttribute('data-preview-has-instance', 'true');
  await expect(previewCell('2,3')).toHaveAttribute('data-preview-instance-count', '1');
  await expect(previewCell('2,3')).toHaveAttribute('data-preview-asset-id', 'garden-plant');
  await expect(previewCell('2,3')).toHaveAttribute('data-preview-requires-skill', 'true');
  await expect(previewCell('2,3')).toHaveAttribute('data-preview-skill-marker-label', '树');
  await expect(previewCell('2,3')).toHaveAttribute('aria-label', /Garden Plant, 1 item, skill 树/);
  await expect(page.getByLabel('Save status')).toHaveText('Dirty');
  await page.locator('[data-coordinate="2,3"]').click();
  await expect(page.locator('[data-coordinate="2,3"]')).toHaveAttribute('data-instance-count', '2');
  await expect(page.locator('[data-coordinate="2,3"]')).toContainText('2x');
  await expect(page.getByLabel('Selected asset stack')).toContainText('Garden Plant / Garden Plant');
  await expect(previewCell('2,3')).toHaveAttribute('data-preview-instance-count', '2');
  const stackedScene = await readSceneSnapshot(page);
  expect(stackedScene.tileInstances).toHaveLength(2);
  expect(stackedScene.tileInstances).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ assetId: 'garden-plant', coordinate: { x: 2, y: 3 } }),
      expect.objectContaining({ assetId: 'garden-plant', coordinate: { x: 2, y: 3 } }),
    ]),
  );
  await page.getByLabel('Search assets').fill('wooden-floor');
  await page.getByRole('button', { name: /Wooden Floor.*No\. 001/ }).click();
  await expect(page.getByLabel('Requires Ditto skill')).not.toBeChecked();
  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toContain('Replace the existing item at 2,3');
    await dialog.accept();
  });
  await page.locator('[data-coordinate="2,3"]').click();
  await expect(page.locator('[data-coordinate="2,3"]')).toContainText('Wooden Floor');
  await expect(previewCell('2,3')).toHaveAttribute('data-preview-asset-id', 'wooden-floor');
  await expect(previewCell('2,3')).toHaveAttribute('data-preview-instance-count', '1');
  await expect(previewCell('2,3')).toHaveAttribute('data-preview-requires-skill', 'false');
  await expect(previewCell('2,3')).toHaveAttribute('data-preview-skill-marker-label', '');
  const replacedScene = await readSceneSnapshot(page);
  expect(replacedScene.tileInstances).toHaveLength(1);
  expect(replacedScene.tileInstances[0]).toMatchObject({ assetId: 'wooden-floor', coordinate: { x: 2, y: 3 } });
  const sceneBeforeFailedPlacement = await readSceneSnapshot(page);
  await page.locator('[data-coordinate="0,0"]').click();
  await expect(page.getByLabel('Target placement status')).toContainText('Wooden Floor cannot be placed in outer');
  expect(await readSceneSnapshot(page)).toEqual(sceneBeforeFailedPlacement);

  await page.locator('[data-coordinate="0,0"]').hover();
  await expect(page.getByLabel('Target coordinate')).toHaveText('0,0');
  await expect(page.getByLabel('Target area')).toHaveText('outer');
  await expect(page.getByLabel('Target placeable')).toHaveText('Placeable');
  await expect(page.getByLabel('Target placement status')).toContainText('Wooden Floor cannot be placed in outer');

  await page.locator('[data-coordinate="4,4"]').focus();
  await page.mouse.move(10, 10);
  await expect(page.getByLabel('Target coordinate')).toHaveText('4,4');

  await page.evaluate(() => performance.clearMeasures('scene-selection-duration'));
  await page.locator('[data-coordinate="2,3"]').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByLabel('Target coordinate')).toHaveText('3,3');
  await expect(page.locator('[data-coordinate="3,3"]')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-coordinate="3,3"]')).toContainText('Wooden Floor');
  await expect(previewCell('3,3')).toHaveAttribute('data-preview-asset-id', 'wooden-floor');
  const keyboardScene = await readSceneSnapshot(page);
  expect(keyboardScene.tileInstances).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ assetId: 'wooden-floor', coordinate: { x: 3, y: 3 } }),
    ]),
  );

  await page.getByRole('button', { name: /Set 1 层 as current building layer/ }).click();
  await expect(page.getByLabel('Current building level')).toHaveText('Current L1');
  await expect(page.locator('[data-coordinate="3,3"]')).toHaveAttribute('data-other-layer-instance-count', '1');
  await expect(
    page.getByLabel('Cell 3,3, main area, level-1, placeable, 1 item on other visible layers'),
  ).toBeVisible();
  await page.locator('[data-coordinate="2,3"]').click();
  await expect(page.locator('[data-coordinate="2,3"]')).toContainText('Wooden Floor');
  await expect(page.locator('[data-coordinate="2,3"]')).toHaveAttribute('data-other-layer-instance-count', '1');
  await expect(previewCell('2,3')).toHaveAttribute('data-preview-asset-id', 'wooden-floor');
  const crossLayerPlacementScene = await readSceneSnapshot(page);
  expect(crossLayerPlacementScene.tileInstances).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ assetId: 'wooden-floor', coordinate: { x: 2, y: 3 }, buildingLevelId: 'level-0' }),
      expect.objectContaining({ assetId: 'wooden-floor', coordinate: { x: 2, y: 3 }, buildingLevelId: 'level-1' }),
    ]),
  );
  const movedInstanceBefore = crossLayerPlacementScene.tileInstances.find(
    (instance) =>
      instance.assetId === 'wooden-floor' &&
      instance.buildingLevelId === 'level-1' &&
      instance.coordinate?.x === 2 &&
      instance.coordinate.y === 3,
  );
  expect(movedInstanceBefore?.instanceId).toBeTruthy();
  await page.getByRole('button', { name: 'Preview all visible layers' }).click();
  await expect(page.getByLabel('Top preview scope')).toHaveText('All visible layers preview');
  await expect(page.getByLabel('Top preview item summary')).toHaveText('3 visible items across 4 layers');
  await expect(page.getByLabel('Front preview layer summary')).toHaveText('4 visible layers, 3 visible items');
  await expect(previewCell('2,3')).toHaveAttribute('data-preview-instance-count', '2');
  await expect(previewCell('2,3')).toHaveAttribute('data-preview-layer-count', '2');
  await expect(previewCell('2,3')).toHaveAttribute('data-preview-layer-stack', 'L0,L1');
  await expect(previewCell('2,3')).toHaveAttribute(
    'data-preview-asset-stack',
    'L0 unlocked Wooden Floor → L1 unlocked Wooden Floor',
  );
  await page.getByRole('button', { name: /Hide 1 层/ }).click();
  await expect(page.getByLabel('L1, 1 层, 1 instances, hidden, unlocked, current editing layer')).toBeVisible();
  await expect(page.getByLabel('Top preview item summary')).toHaveText('2 visible items across 3 layers');
  await expect(page.getByLabel('Front preview layer summary')).toHaveText('3 visible layers, 2 visible items');
  await expect(previewCell('2,3')).toHaveAttribute('data-preview-instance-count', '1');
  await expect(previewCell('2,3')).toHaveAttribute('data-preview-layer-stack', 'L0');
  await expect(previewCell('2,3')).toHaveAttribute('data-preview-asset-stack', 'L0 unlocked Wooden Floor');
  await page.getByRole('button', { name: /Show 1 层/ }).click();
  await expect(page.getByLabel('L1, 1 层, 1 instances, visible, unlocked, current editing layer')).toBeVisible();
  await expect(previewCell('2,3')).toHaveAttribute('data-preview-instance-count', '2');
  await page.getByRole('button', { name: /Lock 1 层/ }).click();
  await expect(page.getByLabel('L1, 1 层, 1 instances, visible, locked, current editing layer')).toBeVisible();
  await expect(previewCell('2,3')).toHaveAttribute('data-preview-locked-layer-count', '1');
  await expect(previewCell('2,3')).toHaveAttribute(
    'data-preview-asset-stack',
    'L0 unlocked Wooden Floor → L1 locked Wooden Floor',
  );
  await expect(
    page.getByRole('listitem', { name: 'L1 1 层, 1 item, visible, locked, active' }),
  ).toBeVisible();
  await page.getByRole('button', { name: /Unlock 1 层/ }).click();
  await expect(previewCell('2,3')).toHaveAttribute('data-preview-locked-layer-count', '0');
  await page.getByRole('button', { name: 'Preview current layer' }).click();
  await page.locator('[data-coordinate="2,3"]').click();
  await expect(page.getByLabel('Top preview scope')).toHaveText('Current layer preview');
  await expect(page.getByLabel('Top preview item summary')).toHaveText('1 current-layer item');
  await expect(page.getByLabel('Front preview layer summary')).toHaveText('1 visible layer, 1 visible item');
  await expect(previewCell('2,3')).toHaveAttribute('data-preview-layer-stack', 'L1');
  await expect(previewCell('2,3')).toHaveAttribute('data-preview-asset-stack', 'L1 unlocked Wooden Floor');
  await page.getByLabel('Move target layer').selectOption('level-0');
  await expect(page.getByLabel('Move target preview')).toContainText('Move blocked by 1 item on 0 层');
  await page.getByLabel('Move instance X').fill('5');
  await page.getByLabel('Move instance Y').fill('5');
  await expect(page.getByLabel('Move target preview')).toContainText('Move target is clear on 0 层');
  await page.getByRole('button', { name: 'Move' }).click();
  await expect(page.getByLabel('Current building level')).toHaveText('Current L0');
  await expect(page.getByLabel('Selected coordinate')).toHaveText('5,5');
  await expect(page.getByLabel('Selected layer')).toHaveText('0 层');
  await expect(page.locator('[data-coordinate="5,5"]')).toContainText('Wooden Floor');
  await expect(previewCell('5,5')).toHaveAttribute('data-preview-asset-id', 'wooden-floor');
  const crossLayerMoveScene = await readSceneSnapshot(page);
  const movedInstanceAfter = crossLayerMoveScene.tileInstances.filter(
    (instance) => instance.instanceId === movedInstanceBefore?.instanceId,
  );
  expect(crossLayerMoveScene.tileInstances).toHaveLength(crossLayerPlacementScene.tileInstances.length);
  expect(movedInstanceAfter).toHaveLength(1);
  expect(movedInstanceAfter[0]).toMatchObject({
    assetId: 'wooden-floor',
    coordinate: { x: 5, y: 5 },
    buildingLevelId: 'level-0',
  });
  expect(
    crossLayerMoveScene.tileInstances.some(
      (instance) =>
        instance.instanceId === movedInstanceBefore?.instanceId &&
        instance.buildingLevelId === 'level-1' &&
        instance.coordinate?.x === 2 &&
        instance.coordinate.y === 3,
    ),
  ).toBe(false);

  await page.getByLabel('Search assets').fill('roof-tile');
  await page.getByRole('button', { name: /Roof Tile.*No\. 068/ }).click();
  await page.locator('[data-coordinate="4,4"]').click();
  await expect(page.getByLabel('Selected instance', { exact: true })).toHaveText('Roof Tile');
  await expect(previewCell('4,4')).toHaveAttribute('data-preview-asset-id', 'roof-tile');
  await expect(previewCell('4,4')).toHaveAttribute('data-preview-requires-skill', 'true');
  await expect(previewCell('4,4')).toHaveAttribute('data-preview-skill-marker-label', '耕');
  await page.getByLabel('Instance rotation', { exact: true }).selectOption('90');
  await expect(page.locator('[data-coordinate="4,4"]')).toHaveAttribute('data-rotation', '90');
  await expect(page.locator('[data-coordinate="4,4"]')).toContainText('90 deg');
  await page.getByLabel('Instance dye color', { exact: true }).fill('#bb6bd9');
  await expect(page.locator('[data-coordinate="4,4"]')).toHaveAttribute('data-dye-color', '#bb6bd9');
  await page.getByLabel('Instance note', { exact: true }).fill('<script>alert(1)</script><img src=x onerror=alert(1)>');
  await page.getByRole('button', { name: 'Save note' }).click();
  await expect(page.getByLabel('Selected instance note')).toHaveText('<script>alert(1)</script><img src=x onerror=alert(1)>');
  await expect(page.getByLabel('Instance requires skill')).toBeChecked();
  await page.getByLabel('Instance skill type', { exact: true }).selectOption('储水');
  await page.getByLabel('Instance skill note', { exact: true }).fill('<b>store water</b>');
  await page.getByRole('button', { name: 'Save skill' }).click();
  await expect(page.getByLabel('Selected instance skill type')).toHaveText('储水');
  await expect(page.getByLabel('Selected instance skill note')).toHaveText('<b>store water</b>');
  await expect(previewCell('4,4')).toHaveAttribute('data-preview-skill-marker-label', '水');
  await expect(previewCell('4,4')).toHaveAttribute('aria-label', /Roof Tile, 1 item, skill 水/);
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByLabel('Selected instance skill type')).toHaveText('耕地');
  await expect(page.getByLabel('Selected instance skill note')).toHaveText('No skill note');
  await expect(previewCell('4,4')).toHaveAttribute('data-preview-skill-marker-label', '耕');
  await page.getByRole('button', { name: 'Redo' }).click();
  await expect(page.getByLabel('Selected instance skill type')).toHaveText('储水');
  await expect(page.getByLabel('Selected instance skill note')).toHaveText('<b>store water</b>');
  await expect(previewCell('4,4')).toHaveAttribute('data-preview-skill-marker-label', '水');
  expect(
    await page.locator('.instance-editor').evaluate((editor) => editor.scrollWidth <= editor.clientWidth),
  ).toBe(true);
  await page.getByLabel('Move instance X').fill('5');
  await page.getByLabel('Move instance Y').fill('4');
  await page.getByRole('button', { name: 'Move' }).click();
  await expect(page.getByLabel('Selected coordinate')).toHaveText('5,4');
  await expect(page.locator('[data-coordinate="5,4"]')).toContainText('Roof Tile');
  await expect(previewCell('4,4')).toHaveAttribute('data-preview-has-instance', 'false');
  await expect(previewCell('5,4')).toHaveAttribute('data-preview-asset-id', 'roof-tile');
  await expect(previewCell('5,4')).toHaveAttribute('data-preview-skill-marker-label', '水');
  const editedScene = await readSceneSnapshot(page);
  expect(editedScene.tileInstances).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        assetId: 'roof-tile',
        coordinate: { x: 5, y: 4 },
        rotationDegrees: 90,
        dyeColor: '#bb6bd9',
        requiresSkill: true,
        skillType: '储水',
        skillNote: '<b>store water</b>',
        note: '<script>alert(1)</script><img src=x onerror=alert(1)>',
      }),
    ]),
  );
  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toContain('Delete the selected asset instance');
    await dialog.accept();
  });
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.locator('[data-coordinate="5,4"]')).not.toContainText('Roof Tile');
  await expect(previewCell('5,4')).toHaveAttribute('data-preview-has-instance', 'false');
  await expect(previewCell('5,4')).toHaveAttribute('data-preview-asset-id', '');
  await expect(previewCell('5,4')).toHaveAttribute('data-preview-requires-skill', 'false');
  const deletedScene = await readSceneSnapshot(page);
  expect(deletedScene.tileInstances.some((instance) => (instance as { assetId?: string }).assetId === 'roof-tile')).toBe(
    false,
  );

  const sceneBeforeLayerCopy = await readSceneSnapshot(page);
  await page.getByRole('button', { name: /Copy 0 层/ }).click();
  await expect(page.getByLabel('Current building level')).toHaveText('Current L4');
  await expect(page.getByLabel('Building layer feedback')).toHaveText('Copied 0 层');
  await expect(page.getByLabel('L4, 0 层 copy, 3 instances, visible, unlocked, current editing layer')).toBeVisible();
  await expect(page.locator('[data-coordinate="2,3"]')).toContainText('Wooden Floor');
  const copiedLayerScene = await readSceneSnapshot(page);
  expect(copiedLayerScene.buildingLevels.map((level) => level.id)).toContain('level-4');
  expect(copiedLayerScene.workspaceState.currentBuildingLevelId).toBe('level-4');
  expect(copiedLayerScene.tileInstances).toHaveLength(sceneBeforeLayerCopy.tileInstances.length * 2);
  expect(
    copiedLayerScene.tileInstances.filter((instance) => instance.buildingLevelId === 'level-4'),
  ).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ assetId: 'wooden-floor', coordinate: { x: 2, y: 3 } }),
      expect.objectContaining({ assetId: 'wooden-floor', coordinate: { x: 3, y: 3 } }),
      expect.objectContaining({ assetId: 'wooden-floor', coordinate: { x: 5, y: 5 } }),
    ]),
  );

  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toContain('Delete building layer "0 层 copy"');
    expect(dialog.message()).toContain('3 items');
    expect(dialog.message()).toContain('removes the layer and all item instances');
    expect(dialog.message()).toContain('OK to confirm or Cancel');
    await dialog.dismiss();
  });
  await page.getByRole('button', { name: /Delete 0 层 copy/ }).click();
  await expect(page.getByLabel('Building layer feedback')).toContainText('Canceled; scene unchanged');
  expect(await readSceneSnapshot(page)).toEqual(copiedLayerScene);

  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toContain('Delete building layer "0 层 copy"');
    await dialog.accept();
  });
  await page.getByRole('button', { name: /Delete 0 层 copy/ }).click();
  await expect(page.getByLabel('Current building level')).toHaveText('Current L3');
  await expect(page.getByLabel('Building layer feedback')).toHaveText('Deleted 0 层 copy');
  const sceneAfterLayerDelete = await readSceneSnapshot(page);
  expect(sceneAfterLayerDelete.buildingLevels.map((level) => level.id)).not.toContain('level-4');
  expect(sceneAfterLayerDelete.tileInstances).toHaveLength(sceneBeforeLayerCopy.tileInstances.length);
  expect(sceneAfterLayerDelete.tileInstances.every((instance) => instance.buildingLevelId !== 'level-4')).toBe(true);

  const sceneBeforeEmptyDeleteCancel = await readSceneSnapshot(page);
  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toContain('Delete building layer "屋顶层"');
    expect(dialog.message()).toContain('0 items');
    await dialog.dismiss();
  });
  await page.getByRole('button', { name: /Delete 屋顶层/ }).click();
  await expect(page.getByLabel('Building layer feedback')).toContainText('Canceled; scene unchanged');
  expect(await readSceneSnapshot(page)).toEqual(sceneBeforeEmptyDeleteCancel);

  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toContain('Delete building layer "屋顶层"');
    expect(dialog.message()).toContain('0 items');
    await dialog.accept();
  });
  await page.getByRole('button', { name: /Delete 屋顶层/ }).click();
  await expect(page.getByLabel('Current building level')).toHaveText('Current L2');
  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toContain('Delete building layer "2 层"');
    await dialog.accept();
  });
  await page.getByRole('button', { name: /Delete 2 层/ }).click();
  await expect(page.getByLabel('Current building level')).toHaveText('Current L1');
  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toContain('Delete building layer "1 层"');
    await dialog.accept();
  });
  await page.getByRole('button', { name: /Delete 1 层/ }).click();
  await expect(page.getByLabel('Current building level')).toHaveText('Current L0');
  const lastLayerScene = await readSceneSnapshot(page);
  await page.getByRole('button', { name: /Delete 0 层/ }).click();
  await expect(page.getByLabel('Building layer feedback')).toContainText('Cannot delete the last building layer');
  expect(await readSceneSnapshot(page)).toEqual(lastLayerScene);
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
  await expect(page.getByLabel('L0, 0 层, 0 instances, visible, unlocked, viewing layer')).toBeVisible();
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
  await expect(page.getByRole('button', { name: 'New layer' })).toBeDisabled();
  await expect(page.getByLabel('Rename 0 层')).toBeDisabled();
  await expect(page.getByRole('button', { name: /Hide 0 层/ })).toBeDisabled();
  await expect(page.getByRole('button', { name: /Lock 0 层/ })).toBeDisabled();
  await expect(page.getByRole('button', { name: /Copy 0 层/ })).toBeDisabled();
  await expect(page.getByRole('button', { name: /Delete 0 层/ })).toBeDisabled();
  await page.getByRole('button', { name: /View 1 层 as viewing layer/ }).click();
  await expect(page.getByLabel('Current building level')).toHaveText('Current L1');
  await expect(page.getByLabel('L1, 1 层, 0 instances, visible, unlocked, viewing layer')).toBeVisible();
  await expect(page.getByLabel('Cell 2,3, main area, level-1, read-only')).toBeVisible();
  expect(await readSceneSnapshot(page)).toEqual(sceneBefore);
  await expect(page.getByRole('button', { name: 'Preview current layer' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Preview all visible layers' })).toBeEnabled();
  await page.getByRole('button', { name: 'Preview all visible layers' }).click();
  await expect(page.getByLabel('Top preview scope')).toHaveText('All visible layers preview');
  await page.getByLabel('Top preview view controls').scrollIntoViewIfNeeded();
  await page.getByRole('button', { name: 'Top preview cell 2,3, main, empty' }).click();
  await page.getByRole('button', { name: 'Zoom in preview' }).click();
  await page.getByRole('button', { name: 'Pan preview right' }).click();
  await expect(page.getByLabel('Top preview local focus')).toHaveText('2,3');
  await expect(page.getByLabel('Top preview view state')).toHaveText('125%, pan 4,0');
  await expect(page.getByLabel('Save status')).toHaveText('Read-only · Saved');
  await expect(page.getByRole('button', { name: 'Undo' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Redo' })).toBeDisabled();
  expect(await readSceneSnapshot(page)).toEqual(sceneBefore);
  await page.getByRole('button', { name: /View 0 层 as viewing layer/ }).click();
  await expect(page.getByLabel('Current building level')).toHaveText('Current L0');
  await page.getByRole('button', { name: 'New layer' }).evaluate((button) => {
    (button as HTMLButtonElement).click();
  });
  await page.getByRole('button', { name: /Hide 0 层/ }).evaluate((button) => {
    (button as HTMLButtonElement).click();
  });
  await page.getByRole('button', { name: /Lock 0 层/ }).evaluate((button) => {
    (button as HTMLButtonElement).click();
  });
  await page.getByRole('button', { name: /Copy 0 层/ }).evaluate((button) => {
    (button as HTMLButtonElement).click();
  });
  await page.getByRole('button', { name: /Delete 0 层/ }).evaluate((button) => {
    (button as HTMLButtonElement).click();
  });
  expect(await readSceneSnapshot(page)).toEqual(sceneBefore);
  await page.getByLabel('Cell 2,3, main area, level-0, read-only').focus();
  await page.keyboard.press('Enter');
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
  await page.getByRole('button', { name: 'View Wooden Floor details' }).click();
  await expect(page.getByLabel('Wooden Floor asset detail')).toContainText('wooden-floor');
  expect(await readSceneSnapshot(page)).toEqual(sceneBefore);
  await page.getByRole('button', { name: /Wooden Floor.*No\. 001/ }).click();
  await expect(page.getByLabel('Current placement asset')).toContainText('None');
  await expect(page.getByLabel('Wooden Floor asset detail')).toContainText('No. 001');
  expect(await readSceneSnapshot(page)).toEqual(sceneBefore);
  await page.getByLabel('Search assets').fill('wall');
  await expect(page.getByLabel('Asset result count')).toHaveText('02 / 06');
  await page.getByRole('button', { name: 'Wall', exact: true }).click();
  await page.getByRole('button', { name: 'Outer', exact: true }).click();
  await page.getByLabel('Skill filter').selectOption('储水');
  await expect(page.getByLabel('No matching assets')).toBeVisible();
  await page.getByRole('button', { name: 'Show all' }).click();
  await expect(page.getByLabel('Asset result count')).toHaveText('06 / 06');
  expect(await readSceneSnapshot(page)).toEqual(sceneBefore);
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
  await page.getByRole('button', { name: /Garden Plant.*No\. 014/ }).click();
  await expect(page.getByLabel('Current placement asset')).toContainText('Garden Plant');
  await page.locator('[data-coordinate="4,4"]').click();
  await expect(page.getByLabel('Selected instance', { exact: true })).toHaveText('Garden Plant');
  const selectedAssetDesktopScene = await readSceneSnapshot(page);
  expect(selectedAssetDesktopScene.workspaceState.selectedAssetId).toBe('garden-plant');
  expect(selectedAssetDesktopScene.workspaceState.selectedCoordinate).toEqual({ x: 4, y: 4 });
  expect(selectedAssetDesktopScene.tileInstances).toHaveLength(1);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByLabel('Interaction mode')).toHaveText('Mobile read-only mode');
  await expect(page.getByLabel('Selected coordinate')).toHaveText('4,4');
  await expect(page.getByLabel('Selected instance', { exact: true })).toHaveText('Garden Plant');
  await expect(page.getByRole('button', { name: 'Delete', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Move' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Save note' })).toBeDisabled();
  await page.getByRole('button', { name: 'Delete', exact: true }).evaluate((button) => {
    (button as HTMLButtonElement).click();
  });
  await page.getByRole('button', { name: 'Move' }).evaluate((button) => {
    (button as HTMLButtonElement).click();
  });
  await page.getByRole('button', { name: 'Save note' }).evaluate((button) => {
    (button as HTMLButtonElement).click();
  });
  expect(await readSceneSnapshot(page)).toEqual(selectedAssetDesktopScene);
  await page.locator('[data-coordinate="2,3"]').click();
  await expect(page.getByLabel('Selected coordinate')).toHaveText('2,3');
  await page.locator('[data-coordinate="2,3"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Selected coordinate')).toHaveText('2,3');
  expect(await readSceneSnapshot(page)).toEqual(selectedAssetDesktopScene);
});

interface SceneSnapshot {
  workspaceState: {
    selectedCoordinate: { x: number; y: number } | null;
    selectedAssetId: string | null;
    saveStatus: string;
    currentBuildingLevelId: string;
  };
  tileInstances: Array<{
    instanceId?: string;
    assetId?: string;
    buildingLevelId: string;
    coordinate?: { x: number; y: number };
  }>;
  buildingLevels: Array<{
    id: string;
    levelNumber: number;
    name: string;
  }>;
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

async function measureSinceMark(page: Page, startMark: string, measureName: string): Promise<number> {
  return page.evaluate(
    ([start, measure]) => {
      performance.mark(`${measure}-end`);
      performance.clearMeasures(measure);
      performance.measure(measure, start, `${measure}-end`);
      const duration = performance.getEntriesByName(measure).at(-1)?.duration ?? Number.POSITIVE_INFINITY;
      performance.clearMarks(start);
      performance.clearMarks(`${measure}-end`);

      return duration;
    },
    [startMark, measureName],
  );
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
