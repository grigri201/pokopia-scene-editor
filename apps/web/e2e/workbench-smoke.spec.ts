import { readFile } from 'node:fs/promises';
import { expect, test, type Locator, type Page, type Route } from '@playwright/test';
import {
  createDefaultSceneDocument,
  defaultSceneDimensions,
  encodeSceneDocumentString,
  legacySceneDimensions,
} from '@pokopia-scene-editor/scene-core';

const autosavedSceneStorageKey = 'pokopia.sceneDocument.autosave.v1';
const savedSceneStorageKey = 'pokopia.sceneDocument.v1';
const uiPreferencesStorageKey = 'pokopia.uiPreferences.v1';
const densePreviewAssetIds = ['wooden-fencing', 'leafy-plant', 'stepping-stones', 'ditto-doll', 'stone-brick-wall', 'brick-roof-decoration'];
const densePreviewSkillTypes = ['树叶', '耕地', '储水'];
const defaultSceneSize = defaultSceneDimensions.sceneSize;
const defaultCanvasSize = defaultSceneDimensions.canvasSize;
const defaultOuterPadding = defaultSceneDimensions.outerPadding;
const defaultCanvasCellCount = getCanvasCellCount(defaultCanvasSize);
const defaultMaxCoordinate = getMaxCoordinate(defaultCanvasSize);
const legacyMaxCoordinate = getMaxCoordinate(legacySceneDimensions.canvasSize);
const responsiveReleaseViewports = [
  { width: 1440, height: 900 },
  { width: 1280, height: 720 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
] as const;

test('renders the Open Design workbench as the first screen', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');

  await expect(page.getByRole('dialog', { name: '快速说明' })).toBeVisible();
  await expect(page.locator('.help-guide-spotlight')).toHaveCount(4);
  await expect(page.locator('.help-guide-arrow')).toHaveCount(4);
  await expect(page.getByRole('dialog', { name: '快速说明' })).toContainText('这里可以新增层和选中层');
  await expect(page.getByRole('dialog', { name: '快速说明' })).toContainText('可以勾选只显示宝可梦喜欢的素材');
  await expect(page.getByRole('dialog', { name: '快速说明' })).toContainText('单击选中素材');
  await expect(page.getByRole('dialog', { name: '快速说明' })).toContainText('这里可以修改布景和选择当前宝可梦');
  await expect(page.getByRole('button', { name: '下一步' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '关闭说明' })).toHaveCount(0);
  await page.getByRole('button', { name: '明白了！' }).click();
  await expect(page.getByRole('dialog', { name: '快速说明' })).toHaveCount(0);
  expect(JSON.parse((await page.evaluate((key) => window.localStorage.getItem(key), uiPreferencesStorageKey)) ?? '{}')).toMatchObject({
    helpOverlayDismissed: true,
  });

  await expect(page.getByLabel('Pokopia scene editor workbench')).toBeVisible();
  expect(await getShellTransitionDuration(page)).toBe('0s');
  await expect(page.getByLabel('Pokemon scene controls')).toBeVisible();
  await expect(page.getByLabel('Current Pokemon')).toHaveValue('百变怪');
  await expect(page.getByLabel('布景')).toHaveValue('15x15 布景');
  await expect(page.getByLabel('宽度')).toHaveValue('17');
  await expect(page.getByLabel('高度')).toHaveValue('17');
  await expect(page.getByRole('complementary', { name: 'Asset picker' })).toBeVisible();
  await expect(page.locator('.asset-row')).toHaveCount(10);
  await expect(page.locator('[data-asset-id="pecha-berry"]')).toContainText('桃桃果');
  await expect(page.locator('[data-asset-id="pecha-berry"]')).toContainText('食物');
  await expect(page.getByLabel('Asset page status')).toHaveText('1 / 117');
  await expect(page.getByText('Showing first')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Show more' })).toHaveCount(0);
  await expect(page.getByRole('complementary', { name: '检查器预览' })).toHaveCount(0);
  await expect(page.getByLabel('俯视图预览')).toHaveCount(0);
  await expect(page.getByLabel('正视图预览')).toHaveCount(0);
  await expect(page.getByTestId('scene-cell')).toHaveCount(defaultCanvasCellCount);
  await expect(page.getByLabel('Cell 3,2, main area, level-0, placeable')).toBeVisible();
  await expect(page.getByLabel('Save status')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Save scene' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '下载预览' })).toBeVisible();
  await expect(page.getByRole('button', { name: '重置' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Undo' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Redo' })).toHaveCount(0);
  await expect.poll(() => getSelectionEmptyPromptHeightRatio(page)).toBeCloseTo(1, 1);
  await expect.poll(() => getSelectionEmptySilhouetteHeightRatio(page)).toBeCloseTo(0.8, 1);
  await expect.poll(() => getSelectionEmptyTextHeightRatio(page)).toBeCloseTo(1, 1);
  await expect(page.getByRole('button', { name: 'Show preview grid' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Show preview main boundary' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Show preview skill markers' })).toHaveCount(0);
  await expect
    .poll(async () =>
      Promise.all([
        getCellBorderStyle(page, '0,0'),
        getCellBorderStyle(page, '1,1'),
        getCellBorderStyle(page, '2,2'),
      ]),
    )
    .toEqual([
      { color: 'rgba(35, 31, 26, 0.22)', style: 'dashed', width: '1px' },
      { color: 'rgba(35, 31, 26, 0.22)', style: 'dashed', width: '1px' },
      { color: 'rgba(35, 31, 26, 0.22)', style: 'dashed', width: '1px' },
    ]);

  const snapshot = await readSceneSnapshot(page);
  expect(snapshot.sceneName).toBe('15x15 布景');
  expect(snapshot.buildingLevels).toEqual([{ id: 'level-0', levelNumber: 0, name: '1层', notes: [] }]);
  expect(snapshot.tileInstances).toEqual([]);
  expect(snapshot.workspaceState).toMatchObject({
    currentBuildingLevelId: 'level-0',
    selectedAssetId: null,
    selectedCoordinate: null,
  });
  expectScenePayloadHasNoLegacyFields(snapshot);

  const cell = page.getByLabel('Cell 2,3, main area, level-0, placeable');
  await cell.click();
  await expect(cell).toHaveAttribute('aria-selected', 'true');
  await expect
    .poll(async () => (await readSceneSnapshot(page)).workspaceState as Record<string, unknown>)
    .toMatchObject({ selectedCoordinate: { x: 2, y: 3 } });
  await cell.click();
  await expect(cell).toHaveAttribute('aria-selected', 'false');
  await expect
    .poll(async () => (await readSceneSnapshot(page)).workspaceState as Record<string, unknown>)
    .toMatchObject({ selectedCoordinate: null });
});

test('hides the help guide below 1280px while keeping edit mode', async ({ page }) => {
  await page.setViewportSize({ width: 1279, height: 720 });
  await page.goto('/');

  await expect(page.getByRole('dialog', { name: '快速说明' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '打开说明' })).toHaveCount(0);
  expect(await page.evaluate((key) => window.localStorage.getItem(key), uiPreferencesStorageKey)).toBeNull();
  await expect(page.getByLabel('Interaction mode')).toHaveText('Desktop edit mode');
  await expect(page.getByLabel('Pokemon scene controls')).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Asset picker' })).toBeVisible();
});

test('resizes the editable canvas from scene controls', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await dismissHelpOverlayIfVisible(page);

  await page.getByLabel('宽度').selectOption('12');
  await page.getByLabel('高度').selectOption('10');

  await expect(page.getByTestId('scene-cell')).toHaveCount(120);
  await expect(page.getByLabel('Cell 11,9, outer area, level-0, placeable')).toBeVisible();
  await expect(page.getByLabel(`Cell ${defaultMaxCoordinate.x},${defaultMaxCoordinate.y}, outer area, level-0, placeable`)).toHaveCount(0);
  await expectSceneCellsToBeSquare(page, ['0,0', '5,5', '11,9']);
  await expect.poll(() => readSceneSnapshot(page)).toMatchObject({
    sceneSize: { width: 10, height: 8 },
    canvasSize: { width: 12, height: 10 },
    outerPadding: 1,
  });

  await page.getByLabel('宽度').selectOption('6');
  await page.getByLabel('高度').selectOption('17');

  await expect(page.getByTestId('scene-cell')).toHaveCount(102);
  await expect(page.getByLabel('Cell 5,16, outer area, level-0, placeable')).toBeVisible();
  await expectSceneCellsToBeSquare(page, ['0,0', '2,8', '5,16']);
  await expect.poll(() => readSceneSnapshot(page)).toMatchObject({
    sceneSize: { width: 4, height: 15 },
    canvasSize: { width: 6, height: 17 },
    outerPadding: 1,
  });
});

test('switches the workbench to English without writing locale into SceneDocument', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await dismissHelpOverlayIfVisible(page);

  await page.getByLabel('语言').selectOption('en-US');

  await expect(page.getByRole('button', { name: 'Download Preview' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reset' })).toBeVisible();
  await expect(page.getByLabel('Scene name')).toHaveValue('15x15 布景');
  await expect(page.getByLabel('Current Pokemon')).toHaveValue('Ditto');
  await expect(page.locator('[data-asset-id="pecha-berry"]')).toContainText('Pecha Berry');
  await expect(page.locator('[data-asset-id="pecha-berry"]')).toContainText('Food');
  expect(await page.evaluate((key) => window.localStorage.getItem(key), autosavedSceneStorageKey)).toBeNull();
  expect(await page.evaluate((key) => window.localStorage.getItem(key), savedSceneStorageKey)).toBeNull();

  const rawPreferences = await page.evaluate((key) => window.localStorage.getItem(key), uiPreferencesStorageKey);
  expect(rawPreferences).not.toBeNull();
  expect(JSON.parse(rawPreferences ?? '{}')).toMatchObject({ locale: 'en-US' });

  await page.getByLabel('Scene name').fill('English Smoke');
  const autosavedPayload = await waitForStoredPayload(page, autosavedSceneStorageKey);
  expect(autosavedPayload.sceneName).toBe('English Smoke');
  expect(JSON.stringify(autosavedPayload)).not.toContain('"locale"');
  expect(JSON.stringify(autosavedPayload)).not.toContain('"language"');
  expectScenePayloadHasNoLegacyFields(autosavedPayload);

  await page.getByRole('button', { name: 'Download Preview' }).click();

  await expect(page.getByRole('dialog', { name: 'Download preview' })).toBeVisible();
  await expect(page.getByLabel('Overall material list')).toContainText('No materials placed');
  await expect(page.getByLabel('L1 material list')).toContainText('No materials on this layer');
  await expect(page.getByLabel('4,4: Empty layer', { exact: true })).toBeVisible();
  const exportText = await page.locator('.export-preview').innerText();
  expect(exportText).not.toMatch(/[\u4e00-\u9fff]/);
});

test('autosaves SceneDocument v1 without UI-only state or manual save entrypoints', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await dismissHelpOverlayIfVisible(page);

  await page.getByLabel('布景').fill('Smoke Payload Boundary');
  const autosavedPayload = await waitForStoredPayload(page, autosavedSceneStorageKey);
  expect(autosavedPayload.sceneName).toBe('Smoke Payload Boundary');
  expectScenePayloadHasNoLegacyFields(autosavedPayload);
  await expect(page.getByRole('button', { name: 'Save scene' })).toHaveCount(0);
  expect(await page.evaluate((key) => window.localStorage.getItem(key), savedSceneStorageKey)).toBeNull();
});

test('restores autosaved SceneDocument v1 on desktop startup', async ({ page }) => {
  await page.addInitScript(({ key, scene }) => {
    window.localStorage.setItem(key, JSON.stringify(scene));
  }, { key: autosavedSceneStorageKey, scene: createRestoredScene() });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await dismissHelpOverlayIfVisible(page);

  await expect(page.getByLabel('布景')).toHaveValue('Restored Smoke Layout');

  const snapshot = await readSceneSnapshot(page);
  expect(snapshot).toMatchObject({
    sceneId: 'scene-restored-smoke',
    sceneName: 'Restored Smoke Layout',
    workspaceState: {
      currentBuildingLevelId: 'level-1',
      selectedAssetId: 'leafy-plant',
      selectedCoordinate: { x: 4, y: 4 },
    },
  });
  expectScenePayloadHasNoLegacyFields(snapshot);
  expect(await page.evaluate((key) => window.localStorage.getItem(key), savedSceneStorageKey)).toBeNull();
});

test('previews and downloads an image export without mutating scene storage', async ({ page }) => {
  await page.addInitScript((scene) => {
    (window as unknown as { __pokopiaInitialSceneSnapshot?: unknown }).__pokopiaInitialSceneSnapshot = scene;
  }, createExportPreviewScene());
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await dismissHelpOverlayIfVisible(page);
  const beforeUiPreferences = await page.evaluate((key) => window.localStorage.getItem(key), uiPreferencesStorageKey);

  const beforeSnapshot = JSON.stringify(await readSceneSnapshot(page));
  await page.getByRole('button', { name: '下载预览' }).click();

  await expect(page.getByRole('dialog', { name: '下载预览' })).toBeVisible();
  const preview = page.locator('.export-preview');
  await expect
    .poll(async () => preview.evaluate((element) => Math.round(element.getBoundingClientRect().width)))
    .toBe(590);
  await expect(page.locator('.export-preview__pokemon-rail')).toHaveCount(0);
  const pokemonTitleImage = page.getByLabel('皮卡丘导出预览宝可梦图片');
  await expect(pokemonTitleImage.locator('img[alt="皮卡丘宝可梦图片"]')).toBeVisible();
  await expect(pokemonTitleImage.locator('img')).toHaveAttribute('src', /213-pikachu\.png/);
  await expect
    .poll(async () => {
      const [previewBox, headerBox, imageBox] = await Promise.all([
        preview.boundingBox(),
        page.locator('.export-preview__header').boundingBox(),
        pokemonTitleImage.boundingBox(),
      ]);
      return {
        staysInsideHeader: (imageBox?.y ?? 0) >= (headerBox?.y ?? 0) && (imageBox?.y ?? 0) + (imageBox?.height ?? 0) <= (headerBox?.y ?? 0) + (headerBox?.height ?? 0) + 1,
        smallerThanPreviewBody: (imageBox?.height ?? 0) < (previewBox?.height ?? 0) / 3,
      };
    })
    .toEqual({ staysInsideHeader: true, smallerThanPreviewBody: true });
  await expect
    .poll(async () => {
      const [imageBox, titleBox] = await Promise.all([
        pokemonTitleImage.boundingBox(),
        page.getByRole('heading', { name: 'Restored Smoke Layout' }).boundingBox(),
      ]);
      return (imageBox?.x ?? 0) < (titleBox?.x ?? 0);
    })
    .toBe(true);
  await expect(page.locator('.export-preview__body > :first-child')).toHaveAttribute('aria-label', '整体使用素材清单');
  await expect(page.locator('.export-preview__layers > .export-layer').first()).toContainText('L1 · 1层');
  await expect(page.locator('.export-preview__layers')).not.toContainText('placed items');
  await expect(page.getByLabel('整体使用素材清单')).toContainText('大叶子的植栽');
  await expect(page.getByLabel('整体使用素材清单')).toContainText('树叶');
  await expect(page.getByLabel('整体使用素材清单')).toContainText('储水');
  await expect(page.getByLabel('整体使用素材清单')).not.toContainText('No.');
  await expect(page.getByLabel('整体使用素材清单').locator('img[alt="大叶子的植栽缩略图"]')).toBeVisible();
  await expect(page.getByLabel('整体使用素材清单').locator('img[alt="储水技能图标"]')).toBeVisible();
  await expect(page.getByLabel('整体技能数量')).toHaveCount(0);
  const overallMaterialItems = page.getByLabel('整体使用素材清单').locator('.export-material-list--with-thumbs > li');
  await expect(overallMaterialItems).toHaveCount(8);
  expect(
    new Set(
      await overallMaterialItems.evaluateAll((items) =>
        items.map((item) => getComputedStyle(item).borderTopColor),
      ),
    ).size,
  ).toBe(1);
  await expect
    .poll(async () =>
      overallMaterialItems.first().evaluate((item) => {
        const thumbnailBottom = item.querySelector('.export-material-list__thumb')?.getBoundingClientRect().bottom ?? 0;
        const textTop = item.querySelector('.export-material-list__row')?.getBoundingClientRect().top ?? 0;
        return textTop - thumbnailBottom;
      }),
    )
    .toBeGreaterThan(0);
  await expect(page.getByLabel('L2 17x17 图形')).toBeVisible();
  const layerGrid = page.getByLabel('L2 17x17 图形');
  await layerGrid.scrollIntoViewIfNeeded();
  await expect
    .poll(async () =>
      layerGrid.locator('.export-layer-cell').first().evaluate((cell) => {
        const box = cell.getBoundingClientRect();
        return Math.round(Math.abs(box.width - box.height));
      }),
    )
    .toBe(0);
  const leafyExportCell = page.getByLabel('4,4: 大叶子的植栽');
  await leafyExportCell.scrollIntoViewIfNeeded();
  await expect(leafyExportCell.locator('img[title="大叶子的植栽"]')).toBeVisible();
  await expect(leafyExportCell).not.toContainText('绿叶');
  await expect
    .poll(async () =>
      leafyExportCell.evaluate((cell) => {
        const emptyMainCell = cell.parentElement?.querySelector<HTMLElement>('[aria-label="3,3: 空层"]');
        return emptyMainCell
          ? getComputedStyle(cell).borderRightColor === getComputedStyle(emptyMainCell).borderRightColor
          : false;
      }),
    )
    .toBe(true);
  const exportSkillCell = page.getByLabel('2,5: 储水技能');
  await exportSkillCell.scrollIntoViewIfNeeded();
  await expect(exportSkillCell.locator('img[title="储水技能"]')).toBeVisible();
  await expect
    .poll(async () =>
      exportSkillCell.evaluate((cell) => {
        const image = cell.querySelector('img');
        if (!image) {
          return false;
        }

        const cellBox = cell.getBoundingClientRect();
        const imageBox = image.getBoundingClientRect();
        return (
          imageBox.width <= cellBox.width &&
          imageBox.height <= cellBox.height &&
          imageBox.left >= cellBox.left &&
          imageBox.right <= cellBox.right &&
          imageBox.top >= cellBox.top &&
          imageBox.bottom <= cellBox.bottom
        );
      }),
    )
    .toBe(true);
  await expect(page.getByLabel('L2 使用素材清单')).toContainText('大叶子的植栽');
  await expect(page.getByLabel('L2 使用素材清单')).toContainText('树叶');
  await expect(page.getByLabel('L2 使用素材清单')).toContainText('储水');
  await expect(page.getByLabel('L2 使用素材清单')).not.toContainText('No.');
  await expect(page.getByLabel('L2 使用素材清单')).not.toContainText('restore smoke');
  await expect(page.getByLabel('L2 使用素材清单').locator('img[alt="大叶子的植栽缩略图"]')).toBeVisible();
  const layerWaterSkillIcon = page.getByLabel('L2 使用素材清单').locator('img[alt="储水技能图标"]');
  await expect(layerWaterSkillIcon).toBeVisible();
  await expect
    .poll(async () =>
      layerWaterSkillIcon.evaluate((image) => {
        const thumb = image.closest('.export-material-list__thumb');
        if (!thumb) {
          return false;
        }

        const thumbBox = thumb.getBoundingClientRect();
        const imageBox = image.getBoundingClientRect();
        return Math.min(
          imageBox.left - thumbBox.left,
          imageBox.top - thumbBox.top,
          thumbBox.right - imageBox.right,
          thumbBox.bottom - imageBox.bottom,
        ) >= 4;
      }),
    )
    .toBe(true);
  await expect(page.getByLabel('L2 技能数量')).toHaveCount(0);
  const layerMaterialItems = page.getByLabel('L2 使用素材清单').locator('.export-material-list--with-thumbs > li');
  await expect(layerMaterialItems).toHaveCount(8);
  await expect
    .poll(async () =>
      layerMaterialItems.first().evaluate((item) => {
        const thumbnailBottom = item.querySelector('.export-material-list__thumb')?.getBoundingClientRect().bottom ?? 0;
        const textTop = item.querySelector('.export-material-list__row')?.getBoundingClientRect().top ?? 0;
        return textTop - thumbnailBottom;
      }),
    )
    .toBeGreaterThan(1);
  await expect
    .poll(async () =>
      layerMaterialItems.evaluateAll((items) => {
        const firstFourTops = items.slice(0, 4).map((item) => Math.round(item.getBoundingClientRect().top));
        const firstRowTops = firstFourTops.slice(0, 3);
        return {
          fourthStartsNextRow: firstFourTops[3] > firstFourTops[0],
          firstRowAligned: Math.max(...firstRowTops) - Math.min(...firstRowTops),
        };
      }),
    )
    .toEqual({ firstRowAligned: 0, fourthStartsNextRow: true });
  await expect(page.locator('.export-instance-list')).toHaveCount(0);

  const expectedPngSize = await getExpectedExportPngSize(preview);
  expect(expectedPngSize.height).toBeGreaterThan(expectedPngSize.visibleHeight);
  await page.evaluate(() => {
    (window as unknown as { __pokopiaImageExportDelayMs?: number }).__pokopiaImageExportDelayMs = 500;
  });
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '下载图片', exact: true }).click();
  await expect(page.getByRole('button', { name: '下载图片', exact: true })).toBeDisabled();
  await expect(page.getByRole('status', { name: '图片下载状态' })).toContainText('正在生成图片');
  await expect(page.getByRole('status', { name: '图片导出提示' })).toContainText('正在生成图片');
  const download = await downloadPromise;
  const downloadPath = await download.path();

  await expect(page.getByRole('status', { name: '图片导出提示' })).toContainText('图片已准备下载');
  expect(download.suggestedFilename()).toBe('Restored-Smoke-Layout.pokopia-scene.png');
  expect(downloadPath).not.toBeNull();
  const pngBytes = await readFile(downloadPath ?? '');
  const expectedPngPixelRatio = 2;
  const actualPngSize = getPngSize(pngBytes);
  expect(actualPngSize.width).toBe(expectedPngSize.width * expectedPngPixelRatio);
  expect(actualPngSize.height).toBeGreaterThan(expectedPngSize.visibleHeight * expectedPngPixelRatio);
  expect(Math.abs(actualPngSize.height - expectedPngSize.height * expectedPngPixelRatio)).toBeLessThanOrEqual(32);
  expect(pngBytes.toString('utf8')).not.toContain('<svg');
  expect(pngBytes.toString('utf8')).not.toContain('restore smoke');
  expect(pngBytes.toString('utf8')).not.toContain('No.');
  expect(JSON.stringify(await readSceneSnapshot(page))).toBe(beforeSnapshot);
  expect(await page.evaluate((key) => window.localStorage.getItem(key), autosavedSceneStorageKey)).toBeNull();
  expect(await page.evaluate((key) => window.localStorage.getItem(key), savedSceneStorageKey)).toBeNull();
  expect(await page.evaluate((key) => window.localStorage.getItem(key), uiPreferencesStorageKey)).toBe(beforeUiPreferences);
});

test('keeps retained edit commands wired through the workbench shell', async ({ page }) => {
  await page.addInitScript((scene) => {
    (window as unknown as { __pokopiaInitialSceneSnapshot?: unknown }).__pokopiaInitialSceneSnapshot = scene;
  }, createEditableScene());
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await dismissHelpOverlayIfVisible(page);

  const pechaBerryButton = page.locator('[data-asset-id="pecha-berry"] .asset-select-button');
  await pechaBerryButton.click();
  await expect
    .poll(async () => (await readSceneSnapshot(page)).workspaceState as Record<string, unknown>)
    .toMatchObject({ selectedAssetId: 'pecha-berry' });
  await pechaBerryButton.click();
  await expect
    .poll(async () => (await readSceneSnapshot(page)).workspaceState as Record<string, unknown>)
    .toMatchObject({ selectedAssetId: null });
  await expect(pechaBerryButton).toHaveAttribute('aria-pressed', 'false');
  await pechaBerryButton.click();
  await page.locator('[data-coordinate="2,2"]').click();
  await expect
    .poll(async () => getFirstStoredTileField(page, 'assetId'))
    .toBe('pecha-berry');
  await expect
    .poll(async () => (await readSceneSnapshot(page)).workspaceState as Record<string, unknown>)
    .toMatchObject({ selectedAssetId: null, selectedCoordinate: { x: 2, y: 2 } });

  await page.getByRole('button', { name: '旋转 90' }).click();
  await expect
    .poll(async () => getFirstStoredTileField(page, 'rotationDegrees'))
    .toBe(90);

  await page.getByRole('button', { name: '设置技能标记：树叶' }).click();
  await expect
    .poll(async () => getFirstStoredTileField(page, 'requiresSkill'))
    .toBe(true);
  await expect
    .poll(async () => getFirstStoredTileField(page, 'skillType'))
    .toBe('树叶');

  await page.locator('[data-asset-id="leppa-berry"] .asset-select-button').click();
  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('[data-coordinate="2,2"]').click();
  await page.locator('[data-coordinate="2,2"]').click();
  await expect
    .poll(async () => getStoredTileCount(page))
    .toBe(1);
  await expect
    .poll(async () => getFirstStoredTileField(page, 'assetId'))
    .toBe('leppa-berry');

  await page.locator('[data-asset-id="lum-berry"] .asset-select-button').dblclick();
  await expect(page.locator('[data-asset-id="lum-berry"]')).toHaveAttribute('data-selection-mode', 'continuous');
  await expect(page.locator('[data-asset-id="lum-berry"]')).toHaveClass(/asset-row--continuous/);
  await page.locator('[data-coordinate="2,3"]').click();
  await page.locator('[data-coordinate="2,4"]').click();
  await expect
    .poll(async () => getStoredTileCount(page))
    .toBe(3);
  await expect
    .poll(async () => (await readSceneSnapshot(page)).workspaceState as Record<string, unknown>)
    .toMatchObject({ selectedAssetId: 'lum-berry', selectedCoordinate: { x: 2, y: 4 } });
  await page.locator('[data-asset-id="lum-berry"] .asset-select-button').click();
  await expect
    .poll(async () => (await readSceneSnapshot(page)).workspaceState as Record<string, unknown>)
    .toMatchObject({ selectedAssetId: null });
  await expect(page.locator('[data-asset-id="lum-berry"]')).toHaveAttribute('data-selection-mode', 'none');

  await page.getByRole('button', { name: '新建层' }).click();
  await expect
    .poll(async () => getStoredBuildingLevelCount(page))
    .toBe(4);

  await expect(page.getByRole('textbox', { name: 'Instance note' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Move instance' })).toHaveCount(0);
  await expect(page.getByRole('combobox', { name: 'Building layer' })).toHaveCount(0);
});

test('keeps tall placed asset thumbnails contained inside canvas cells', async ({ page }) => {
  await page.addInitScript((scene) => {
    (window as unknown as { __pokopiaInitialSceneSnapshot?: unknown }).__pokopiaInitialSceneSnapshot = scene;
  }, createTallThumbnailScene());
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await dismissHelpOverlayIfVisible(page);

  const tallAssetCell = page.locator('[data-coordinate="4,2"]');
  await expect(tallAssetCell).toHaveAttribute('data-has-instance', 'true');
  await expect(page.getByLabel('Cell 4,2, main area, level-0, placeable, 罗丝雷朵茶')).toBeVisible();

  const bounds = await tallAssetCell.evaluate((cell) => {
    const token = cell.querySelector('.cell-asset-token')?.getBoundingClientRect();
    const image = cell.querySelector('.cell-asset-thumb')?.getBoundingClientRect();

    if (!token || !image) {
      return null;
    }

    return {
      imageBottom: image.bottom,
      imageLeft: image.left,
      imageRight: image.right,
      imageTop: image.top,
      tokenBottom: token.bottom,
      tokenLeft: token.left,
      tokenRight: token.right,
      tokenTop: token.top,
    };
  });

  if (!bounds) {
    throw new Error('Expected tall placed asset thumbnail bounds.');
  }

  expect(bounds.imageTop).toBeGreaterThanOrEqual(bounds.tokenTop);
  expect(bounds.imageLeft).toBeGreaterThanOrEqual(bounds.tokenLeft);
  expect(bounds.imageBottom).toBeLessThanOrEqual(bounds.tokenBottom);
  expect(bounds.imageRight).toBeLessThanOrEqual(bounds.tokenRight);
});

test('keeps 1000-instance 17x17 selection within the NFR1 budget', async ({ page }) => {
  await page.addInitScript((scene) => {
    (window as unknown as { __pokopiaInitialSceneSnapshot?: unknown }).__pokopiaInitialSceneSnapshot = scene;
  }, createPerformanceBudgetScene());
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('/');
  await dismissHelpOverlayIfVisible(page);

  expect((await readSceneSnapshot(page)).buildingLevels).toHaveLength(10);
  expect((await readSceneSnapshot(page)).tileInstances).toHaveLength(1000);
  await expect(page.getByTestId('scene-cell')).toHaveCount(defaultCanvasCellCount);

  await measureSelectionDuration(page, '[data-coordinate="2,2"]');
  const selectionDuration = await measureSelectionDuration(page, '[data-coordinate="3,3"]');
  expect(selectionDuration).toBeLessThan(150);
});

test('keeps dense 17x17 scene selection usable without the preview panel', async ({ page }) => {
  await page.addInitScript((scene) => {
    (window as unknown as { __pokopiaInitialSceneSnapshot?: unknown }).__pokopiaInitialSceneSnapshot = scene;
  }, createDenseScene());
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('/');
  await dismissHelpOverlayIfVisible(page);

  await expect(page.getByRole('complementary', { name: '检查器预览' })).toHaveCount(0);
  await expect(page.getByTestId('scene-cell')).toHaveCount(defaultCanvasCellCount);
  await expect(page.locator('.cell-asset-thumb')).toHaveCount(defaultCanvasCellCount);
  const denseSnapshot = await readSceneSnapshot(page);
  expect(denseSnapshot).toMatchObject({
    buildingLevels: expect.arrayContaining([
      expect.objectContaining({ id: 'level-9' }),
    ]),
  });
  const denseBuildingLevels = denseSnapshot.buildingLevels as unknown[];
  expect(denseBuildingLevels).toHaveLength(10);
  expect(denseSnapshot.tileInstances).toHaveLength(defaultCanvasCellCount * denseBuildingLevels.length);
  await expect(page.getByLabel('正视图预览')).toHaveCount(0);
  await expect(page.getByLabel('俯视图预览')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Show preview grid' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Show preview main boundary' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Show preview skill markers' })).toHaveCount(0);
  expect(JSON.parse((await page.evaluate((key) => window.localStorage.getItem(key), uiPreferencesStorageKey)) ?? '{}')).toMatchObject({
    helpOverlayDismissed: true,
  });

  const selectionDuration = await measureSelectionDuration(page, '[data-coordinate="3,3"]');
  expect(selectionDuration).toBeLessThan(300);
  await expect(page.locator('.current-selection-bar__asset-name')).toBeVisible();
  await expect(page.locator('.current-selection-bar__actions')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('keeps default 17x17 scenes responsive across the release viewport matrix', async ({ page }) => {
  for (const viewport of responsiveReleaseViewports) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await dismissHelpOverlayIfVisible(page);

    await expectResponsiveWorkbench(page, {
      expectedCells: defaultCanvasCellCount,
      edgeCellLabel: `Cell ${defaultMaxCoordinate.x},${defaultMaxCoordinate.y}, outer area, level-0, ${viewport.width < 768 ? 'read-only' : 'placeable'}`,
      isMobile: viewport.width < 768,
      mobileState: 'empty',
    });
  }
});

test('keeps legacy 7x7 scenes responsive across the release viewport matrix', async ({ page }) => {
  await page.addInitScript((scene) => {
    (window as unknown as { __pokopiaInitialSceneSnapshot?: unknown }).__pokopiaInitialSceneSnapshot = scene;
  }, createLegacyResponsiveScene());

  for (const viewport of responsiveReleaseViewports) {
    await page.setViewportSize(viewport);
    if (viewport.width < 768) {
      await page.evaluate(
        ({ key, scene }) => window.localStorage.setItem(key, JSON.stringify(scene)),
        { key: autosavedSceneStorageKey, scene: createLegacyResponsiveScene() },
      );
    }
    await page.goto('/');
    await dismissHelpOverlayIfVisible(page);

    await expectResponsiveWorkbench(page, {
      expectedCells: getCanvasCellCount(legacySceneDimensions.canvasSize),
      edgeCellLabel: `Cell ${legacyMaxCoordinate.x},${legacyMaxCoordinate.y}, outer area, level-0, ${viewport.width < 768 ? 'read-only' : 'placeable'}`,
      isMobile: viewport.width < 768,
      mobileState: viewport.width < 768 ? 'preview-ready' : 'empty',
      mobileSceneName: 'Legacy Responsive Smoke',
      mobileCanvasDimensions: `${legacySceneDimensions.canvasSize.width}x${legacySceneDimensions.canvasSize.height}`,
    });
  }
});

test('migrates legacy UI preferences without hidden preview or advanced asset controls', async ({ page }) => {
  await page.addInitScript((storageKey) => {
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        schemaVersion: 1,
        assetFilters: {
          query: '',
          category: 'all',
          area: 'outer',
          favoriteOnly: false,
          skill: 'skill-candidate',
        },
        preview: {
          displayOptions: {
            grid: true,
            mainBoundary: true,
            skillMarkers: true,
          },
        },
      }),
    );
  }, uiPreferencesStorageKey);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await dismissHelpOverlayIfVisible(page);

  await expect(page.getByRole('button', { name: 'Show preview grid' })).toHaveCount(0);
  await expect(page.getByLabel('Asset advanced filters')).toHaveCount(0);
  await expect(page.getByLabel('Asset area filter')).toHaveCount(0);
  await expect(page.getByLabel('Asset skill filter')).toHaveCount(0);

  const rawPreferences = await page.evaluate((storageKey) => window.localStorage.getItem(storageKey), uiPreferencesStorageKey);
  expect(rawPreferences).not.toBeNull();
  expect(rawPreferences).not.toContain('preview');
  expect(rawPreferences).not.toContain('displayOptions');
  expect(rawPreferences).not.toContain('"area"');
  expect(rawPreferences).not.toContain('"skill"');
});

test('shows asset empty state without recovery actions', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await dismissHelpOverlayIfVisible(page);

  await page.getByLabel('Search assets').fill('no-matching-asset-smoke');

  await expect(page.getByLabel('No matching assets')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Clear filters' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Show all' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Disable favorite' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'All categories' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Clear search' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Reset filters' })).toHaveCount(0);
});

test('switches to Mobile Preview Mode below the mobile breakpoint', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  await expect(page.getByRole('dialog', { name: '快速说明' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '打开说明' })).toHaveCount(0);
  expect(await page.evaluate((key) => window.localStorage.getItem(key), uiPreferencesStorageKey)).toBeNull();
  await expect(page.getByLabel('Interaction mode')).toHaveText('Mobile Preview Mode');
  await expect(page.getByRole('region', { name: 'Mobile Preview Mode' })).toHaveAttribute('data-mobile-preview-state', 'empty');
  await expect(page.getByText('还没有本地保存的布景。')).toHaveCount(0);
  await expect(page.getByText('可以导入一个布景字符串来恢复说明预览。')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '导入字符串' })).toBeVisible();
  await expect(page.getByTestId('scene-cell')).toHaveCount(0);
  await expect(page.getByLabel('Open Design editing workbench')).toHaveCount(0);
  await expect(page.getByRole('complementary', { name: 'Asset picker' })).toHaveCount(0);
  await expect(page.getByLabel('Building level panel')).toHaveCount(0);
  await expect(page.getByLabel('Selection context')).toHaveCount(0);
  expect(await readSceneSnapshot(page)).toMatchObject({
    sceneSize: defaultSceneSize,
    canvasSize: defaultCanvasSize,
  });
  await expect(page.getByLabel('Current Pokemon')).toHaveCount(0);
  await expect(page.getByLabel('布景')).toHaveCount(0);
  await expect(page.getByLabel('宽度')).toHaveCount(0);
  await expect(page.getByLabel('高度')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '新建层' })).toHaveCount(0);
  await expect(page.getByLabel('Save status')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '下载预览' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '导出字符串' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '重置' })).toHaveCount(0);
  await expect(page.getByRole('dialog', { name: '下载预览' })).toHaveCount(0);
  await expect(page.locator('.export-preview-backdrop')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expectElementCenterUncovered(page, page.getByRole('button', { name: '导入字符串' }));
  const beforeKeyboardSnapshot = JSON.stringify(await readSceneSnapshot(page));
  const dialogs: string[] = [];
  page.on('dialog', async (dialog) => {
    dialogs.push(dialog.type());
    await dialog.dismiss();
  });

  await page.getByRole('button', { name: '导入字符串' }).focus();
  for (const key of mobileApplicationKeys) {
    await page.keyboard.press(key);
  }
  await page.getByRole('button', { name: '导入字符串' }).click();
  const importDialog = page.getByRole('dialog', { name: '导入布景字符串' });
  await expect(importDialog).toBeVisible();
  await expect(importDialog.getByLabel('布景字符串')).toBeVisible();
  await expectElementCenterUncovered(page, importDialog.getByRole('button', { name: '导入' }));
  for (const key of mobileApplicationKeys) {
    await page.keyboard.press(key);
  }

  expect(JSON.stringify(await readSceneSnapshot(page))).toBe(beforeKeyboardSnapshot);
  expect(dialogs).toEqual([]);
  await expect(page.getByLabel('Current building level')).toHaveCount(0);
  expect(await page.evaluate((key) => window.localStorage.getItem(key), autosavedSceneStorageKey)).toBeNull();
  expect(await page.evaluate((key) => window.localStorage.getItem(key), savedSceneStorageKey)).toBeNull();
  expectScenePayloadHasNoLegacyFields(await readSceneSnapshot(page));
});

test('imports a scene string into Mobile Preview Mode autosave and inline preview', async ({ page }) => {
  const importedScene = createDefaultSceneDocument({
    sceneId: 'scene-mobile-import-smoke',
    sceneName: 'Mobile Import Smoke',
    selectedPokemonKey: 'pikachu',
    now: '2026-05-31T10:10:00.000Z',
  });
  const sceneString = encodeSceneDocumentString(importedScene);
  const dialogs: string[] = [];
  page.on('dialog', async (dialog) => {
    dialogs.push(dialog.type());
    await dialog.dismiss();
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: '导入字符串' }).click();

  const importDialog = page.getByRole('dialog', { name: '导入布景字符串' });
  await expect(importDialog).toBeVisible();
  await importDialog.getByLabel('布景字符串').fill(sceneString);
  await importDialog.getByRole('button', { name: '导入' }).click();

  await expect(importDialog).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Mobile Preview Mode' })).toHaveAttribute(
    'data-mobile-preview-state',
    'preview-ready',
  );
  await expect(page.getByRole('heading', { name: 'Mobile Import Smoke' })).toBeVisible();
  await expect(page.getByLabel('皮卡丘导出预览宝可梦图片')).toBeVisible();
  await expect(page.getByLabel('整体使用素材清单')).toContainText('未放置素材');
  await expect(page.getByLabel('L1 17x17 图形')).toBeVisible();
  await expect(page.getByRole('dialog', { name: '下载预览' })).toHaveCount(0);
  await expect(page.locator('.export-preview-backdrop')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '下载图片', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '按层下载图片' })).toBeVisible();
  await expect(page.getByLabel('Open Design editing workbench')).toHaveCount(0);
  expect(await getGridColumnCount(page, '.export-preview--inline .export-layer__content')).toBe(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expectElementCenterUncovered(page, page.getByRole('heading', { name: 'Mobile Import Smoke' }));
  await expectElementCenterUncovered(page, page.getByLabel('整体使用素材清单'));
  expect(dialogs).toEqual([]);
  expect(await readStoredPayload(page, autosavedSceneStorageKey)).toMatchObject({
    sceneName: 'Mobile Import Smoke',
    selectedPokemonKey: 'pikachu',
  });
  expect(await readStoredPayload(page, savedSceneStorageKey)).toBeNull();
  expect(await page.evaluate((key) => window.localStorage.getItem(key), uiPreferencesStorageKey)).toBeNull();
});

test('imports a remote scene_id into the desktop workbench with mocked production API', async ({ page }) => {
  const remoteScene = createRemoteImportScene('Remote Desktop Smoke');
  const remoteCalls = await mockRemoteSceneApi(page, {
    fixture: {
      sceneString: encodeSceneDocumentString(remoteScene),
    },
  });

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/?scene_id=fixture');
  await dismissHelpOverlayIfVisible(page);

  await expect(page.getByLabel('Pokopia scene editor workbench')).toBeVisible();
  await expect(page.getByRole('textbox', { name: '布景' })).toHaveValue('Remote Desktop Smoke');
  await expect(page.getByLabel('Current Pokemon')).toHaveValue('皮卡丘');
  expect(remoteCalls).toEqual(['fixture']);

  const snapshot = await readSceneSnapshot(page);
  expect(snapshot).toMatchObject({
    sceneName: 'Remote Desktop Smoke',
    selectedPokemonKey: 'pikachu',
  });
  expect(Array.isArray(snapshot.tileInstances) ? snapshot.tileInstances.length : 0).toBeGreaterThan(0);
  expectScenePayloadHasNoLegacyFields(snapshot);

  await page.getByRole('button', { name: '下载预览' }).click();

  await expect(page.getByRole('dialog', { name: '下载预览' })).toBeVisible();
  await expect(page.getByLabel('皮卡丘导出预览宝可梦图片')).toBeVisible();
  await expect(page.getByLabel('整体使用素材清单')).toContainText('木栏杆');
  await expect(page.getByLabel('整体使用素材清单')).toContainText('树叶');
});

test('shows a recoverable desktop remote scene_id failure without silent default success', async ({ page }) => {
  await mockRemoteSceneApi(page, {
    missing: {
      status: 404,
    },
  });

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/?scene_id=missing');
  await dismissHelpOverlayIfVisible(page);

  await expect(page.getByRole('alert', { name: '远程布景无法导入' })).toContainText('没有找到远程布景 missing');
  await expect(page.getByRole('button', { name: '手动导入字符串' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: '布景' })).toHaveValue('15x15 布景');
  expect(await page.evaluate((key) => window.localStorage.getItem(key), autosavedSceneStorageKey)).toBeNull();
  expect(await page.evaluate((key) => window.localStorage.getItem(key), savedSceneStorageKey)).toBeNull();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('imports a remote scene_id into Mobile Preview Mode autosave and persists without the query', async ({ page }) => {
  const remoteScene = createRemoteImportScene('Remote Mobile Smoke');
  const remoteCalls = await mockRemoteSceneApi(page, {
    fixture: {
      sceneString: encodeSceneDocumentString(remoteScene),
    },
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?scene_id=fixture');

  await expect(page.getByRole('region', { name: 'Mobile Preview Mode' })).toHaveAttribute(
    'data-mobile-preview-state',
    'preview-ready',
  );
  await expect(page.getByRole('heading', { name: 'Remote Mobile Smoke' })).toBeVisible();
  await expect(page.getByLabel('皮卡丘导出预览宝可梦图片')).toBeVisible();
  await expect(page.getByLabel('整体使用素材清单')).toContainText('木栏杆');
  await expect(page.getByLabel('L2 使用素材清单')).toContainText('树叶');
  await expect(page.getByLabel('Open Design editing workbench')).toHaveCount(0);
  await expect(page.getByRole('complementary', { name: 'Asset picker' })).toHaveCount(0);
  await expect(page.getByLabel('Building level panel')).toHaveCount(0);
  await expect(page.getByLabel('Selection context')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '下载预览' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '导出字符串' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '重置' })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(await readStoredPayload(page, autosavedSceneStorageKey)).toMatchObject({
    sceneName: 'Remote Mobile Smoke',
    selectedPokemonKey: 'pikachu',
  });
  expect(await readStoredPayload(page, savedSceneStorageKey)).toBeNull();
  expect(await page.evaluate((key) => window.localStorage.getItem(key), uiPreferencesStorageKey)).toBeNull();
  expect(remoteCalls).toEqual(['fixture']);

  await page.goto('/');

  await expect(page.getByRole('region', { name: 'Mobile Preview Mode' })).toHaveAttribute(
    'data-mobile-preview-state',
    'preview-ready',
  );
  await expect(page.getByRole('heading', { name: 'Remote Mobile Smoke' })).toBeVisible();
  expect(remoteCalls).toEqual(['fixture']);
});

test('shows mobile remote scene_id failure without desktop controls or storage writes', async ({ page }) => {
  await mockRemoteSceneApi(page, {
    missing: {
      status: 404,
    },
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?scene_id=missing');

  await expect(page.getByRole('region', { name: 'Mobile Preview Mode' })).toHaveAttribute(
    'data-mobile-preview-state',
    'remote-error',
  );
  await expect(page.getByRole('alert')).toContainText('没有找到远程布景 missing');
  await expect(page.getByRole('button', { name: '导入字符串' })).toBeVisible();
  await expect(page.getByRole('dialog', { name: '导入布景字符串' })).toHaveCount(0);
  await expect(page.locator('.scene-string-import-backdrop')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '布景说明预览' })).toHaveCount(0);
  await expect(page.getByLabel('Open Design editing workbench')).toHaveCount(0);
  await expect(page.getByRole('complementary', { name: 'Asset picker' })).toHaveCount(0);
  await expect(page.getByLabel('Building level panel')).toHaveCount(0);
  await expect(page.getByLabel('Selection context')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '下载预览' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '导出字符串' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '重置' })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expectElementCenterUncovered(page, page.getByRole('button', { name: '导入字符串' }));
  expect(await readStoredPayload(page, autosavedSceneStorageKey)).toBeNull();
  expect(await readStoredPayload(page, savedSceneStorageKey)).toBeNull();
  expect(await page.evaluate((key) => window.localStorage.getItem(key), uiPreferencesStorageKey)).toBeNull();
});

test('shows stored scene in Mobile Preview Mode without desktop preview drift or autosave rewrite', async ({ page }) => {
  const storedScene = createExportPreviewScene();
  const storedPayload = JSON.stringify(storedScene);
  const dialogs: string[] = [];
  page.on('dialog', async (dialog) => {
    dialogs.push(dialog.type());
    await dialog.dismiss();
  });
  await page.addInitScript(
    ({ key, payload }) => window.localStorage.setItem(key, payload),
    { key: autosavedSceneStorageKey, payload: storedPayload },
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  await expect(page.getByRole('region', { name: 'Mobile Preview Mode' })).toHaveAttribute(
    'data-mobile-preview-state',
    'preview-ready',
  );
  await expect(page.getByLabel('Interaction mode')).toHaveText('Mobile Preview Mode');
  await expect(page.getByRole('heading', { name: 'Restored Smoke Layout' })).toBeVisible();
  await expect(page.getByLabel('皮卡丘导出预览宝可梦图片')).toBeVisible();
  await expect(page.getByText('17x17 画布 · 3 个建筑层')).toBeVisible();
  await expect(page.getByLabel('整体使用素材清单')).toContainText('大叶子的植栽');
  await expect(page.getByLabel('整体使用素材清单')).toContainText('树叶');
  await expect(page.getByLabel('L2 17x17 图形')).toBeVisible();
  await expect(page.getByLabel('L2 使用素材清单')).toContainText('储水');
  await expect(page.getByRole('dialog', { name: '下载预览' })).toHaveCount(0);
  await expect(page.getByRole('dialog', { name: '导入布景字符串' })).toHaveCount(0);
  await expect(page.locator('.export-preview-backdrop')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '下载图片', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '按层下载图片' })).toBeVisible();
  await expect(page.getByLabel('Open Design editing workbench')).toHaveCount(0);
  await expect(page.getByRole('complementary', { name: 'Asset picker' })).toHaveCount(0);
  expect(await getGridColumnCount(page, '.export-preview--inline .export-layer__content')).toBe(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expectElementCenterUncovered(page, page.getByRole('button', { name: '导入字符串' }));
  await expectElementCenterUncovered(page, page.getByRole('heading', { name: 'Restored Smoke Layout' }));
  expect(await page.evaluate((key) => window.localStorage.getItem(key), autosavedSceneStorageKey)).toBe(storedPayload);
  expect(await page.evaluate((key) => window.localStorage.getItem(key), savedSceneStorageKey)).toBeNull();
  expect(await page.evaluate((key) => window.localStorage.getItem(key), uiPreferencesStorageKey)).toBeNull();
  expect(dialogs).toEqual([]);
});

test('shows invalid stored scene state in Mobile Preview Mode', async ({ page }) => {
  const invalidStoredScene = JSON.stringify({
    schemaVersion: 99,
    sceneId: 'bad-mobile-smoke',
  });
  const dialogs: string[] = [];
  page.on('dialog', async (dialog) => {
    dialogs.push(dialog.type());
    await dialog.dismiss();
  });
  await page.addInitScript(
    ({ key, payload }) => window.localStorage.setItem(key, payload),
    { key: autosavedSceneStorageKey, payload: invalidStoredScene },
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  await expect(page.getByRole('region', { name: 'Mobile Preview Mode' })).toHaveAttribute(
    'data-mobile-preview-state',
    'invalid',
  );
  await expect(page.getByLabel('Interaction mode')).toHaveText('Mobile Preview Mode');
  await expect(page.getByLabel('Mobile preview recovery errors')).toContainText('schemaVersion');
  await expect(page.getByRole('button', { name: '导入字符串' })).toBeVisible();
  await expect(page.getByText('15x15 布景')).toHaveCount(0);
  await expect(page.getByTestId('scene-cell')).toHaveCount(0);
  await expect(page.getByLabel('Open Design editing workbench')).toHaveCount(0);
  expect(await page.evaluate((key) => window.localStorage.getItem(key), autosavedSceneStorageKey)).toBe(invalidStoredScene);
  expect(await page.evaluate((key) => window.localStorage.getItem(key), savedSceneStorageKey)).toBeNull();
  expect(await page.evaluate((key) => window.localStorage.getItem(key), uiPreferencesStorageKey)).toBeNull();

  await page.getByRole('button', { name: '导入字符串' }).click();
  const importDialog = page.getByRole('dialog', { name: '导入布景字符串' });
  await expect(importDialog).toBeVisible();
  await importDialog.getByLabel('布景字符串').fill('bad-code');
  await importDialog.getByRole('button', { name: '导入' }).click();

  await expect(importDialog).toBeVisible();
  await expect(importDialog.getByRole('alert')).toContainText('导入字符串无效');
  await expect(page.getByRole('region', { name: 'Mobile Preview Mode' })).toHaveAttribute(
    'data-mobile-preview-state',
    'invalid',
  );
  await expectElementCenterUncovered(page, importDialog.getByRole('button', { name: '导入' }));
  expect(await page.evaluate((key) => window.localStorage.getItem(key), autosavedSceneStorageKey)).toBe(invalidStoredScene);
  expect(await page.evaluate((key) => window.localStorage.getItem(key), savedSceneStorageKey)).toBeNull();
  expect(await page.evaluate((key) => window.localStorage.getItem(key), uiPreferencesStorageKey)).toBeNull();
  expect(dialogs).toEqual([]);
});

async function dismissHelpOverlayIfVisible(page: Page): Promise<void> {
  const helpDialog = page.getByRole('dialog', { name: '快速说明' });
  if (await helpDialog.isVisible().catch(() => false)) {
    await page.getByRole('button', { name: '明白了！' }).click();
    await expect(helpDialog).toHaveCount(0);
  }
}

async function readSceneSnapshot(page: Page): Promise<Record<string, unknown>> {
  const rawSnapshot = await page.evaluate(() => {
    const testWindow = window as unknown as { __pokopiaSceneSnapshot?: () => string };
    return testWindow.__pokopiaSceneSnapshot?.() ?? '';
  });

  expect(rawSnapshot).not.toBe('');
  return JSON.parse(rawSnapshot) as Record<string, unknown>;
}

async function waitForStoredPayload(page: Page, key: string): Promise<Record<string, unknown>> {
  const rawPayload = await page.waitForFunction((storageKey) => window.localStorage.getItem(storageKey), key);
  const serializedPayload = await rawPayload.jsonValue();

  expect(serializedPayload).not.toBeNull();
  return JSON.parse(String(serializedPayload)) as Record<string, unknown>;
}

async function readStoredPayload(page: Page, key: string): Promise<Record<string, unknown> | null> {
  return page.evaluate((storageKey) => {
    const rawPayload = window.localStorage.getItem(storageKey);
    return rawPayload ? JSON.parse(rawPayload) : null;
  }, key) as Promise<Record<string, unknown> | null>;
}

interface MockRemoteSceneHandler {
  responseId?: string;
  sceneString?: string;
  status?: number;
}

async function mockRemoteSceneApi(
  page: Page,
  handlers: Record<string, MockRemoteSceneHandler>,
): Promise<string[]> {
  const calls: string[] = [];
  const routeRemoteScene = async (route: Route) => {
    const requestUrl = new URL(route.request().url());
    const sceneId = decodeURIComponent(requestUrl.pathname.split('/').at(-1) ?? '');
    const handler = handlers[sceneId];
    calls.push(sceneId);

    if (!handler || handler.status === 404) {
      await fulfillRemoteSceneJson(route, 404, {
        error: {
          code: 'scene_not_found',
        },
      });
      return;
    }

    if (handler.status && handler.status !== 200) {
      await fulfillRemoteSceneJson(route, handler.status, {
        error: {
          code: 'remote_error',
        },
      });
      return;
    }

    await fulfillRemoteSceneJson(route, 200, {
      id: handler.responseId ?? sceneId,
      meta: {
        name: 'Remote fixture',
      },
      pse: handler.sceneString ?? '',
    });
  };

  await page.route('https://scene-api.pokokit.com/api/scenes/*', routeRemoteScene);
  await page.route('**/api/remote-scenes/*', routeRemoteScene);

  return calls;
}

async function fulfillRemoteSceneJson(route: Route, status: number, payload: unknown): Promise<void> {
  await route.fulfill({
    status,
    headers: {
      'access-control-allow-origin': '*',
      'content-type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(payload),
  });
}

async function getStoredTileCount(page: Page): Promise<number> {
  const payload = await readStoredPayload(page, autosavedSceneStorageKey);
  return Array.isArray(payload?.tileInstances) ? payload.tileInstances.length : -1;
}

async function getFirstStoredTileField(page: Page, field: string): Promise<unknown> {
  const payload = await readStoredPayload(page, autosavedSceneStorageKey);
  const tileInstances = payload?.tileInstances;
  if (!Array.isArray(tileInstances) || !tileInstances[0] || typeof tileInstances[0] !== 'object') {
    return null;
  }

  return (tileInstances[0] as Record<string, unknown>)[field];
}

async function getStoredBuildingLevelCount(page: Page): Promise<number> {
  const payload = await readStoredPayload(page, autosavedSceneStorageKey);
  return Array.isArray(payload?.buildingLevels) ? payload.buildingLevels.length : -1;
}

async function getGridColumnCount(page: Page, selector: string): Promise<number> {
  return page.locator(selector).first().evaluate((element) =>
    getComputedStyle(element).gridTemplateColumns.split(' ').filter(Boolean).length,
  );
}

async function getCellBorderStyle(
  page: Page,
  coordinate: string,
): Promise<{ color: string; style: string; width: string }> {
  return page.locator(`[data-coordinate="${coordinate}"]`).evaluate((cell) => {
    const style = getComputedStyle(cell);
    return {
      color: style.borderTopColor,
      style: style.borderTopStyle,
      width: style.borderTopWidth,
    };
  });
}

async function expectSceneCellsToBeSquare(page: Page, coordinates: string[]): Promise<void> {
  await expect
    .poll(async () => {
      const deltas = await Promise.all(
        coordinates.map((coordinate) =>
          page.locator(`[data-coordinate="${coordinate}"]`).evaluate((cell) => {
            const box = cell.getBoundingClientRect();
            return Math.abs(box.width - box.height);
          }),
        ),
      );

      return Math.max(...deltas);
    })
    .toBeLessThanOrEqual(2);
}

async function getSelectionEmptySilhouetteHeightRatio(page: Page): Promise<number> {
  return page.getByLabel('No selected grid cell').evaluate((element) => {
    const promptHeight = element.getBoundingClientRect().height;
    const silhouetteHeight = Number.parseFloat(getComputedStyle(element, '::before').height);

    return promptHeight > 0 ? silhouetteHeight / promptHeight : 0;
  });
}

async function getSelectionEmptyPromptHeightRatio(page: Page): Promise<number> {
  return page.getByLabel('No selected grid cell').evaluate((element) => {
    const barHeight = element.closest('.current-selection-bar')?.getBoundingClientRect().height ?? 0;
    const promptHeight = element.getBoundingClientRect().height;

    return barHeight > 0 ? promptHeight / barHeight : 0;
  });
}

async function getSelectionEmptyTextHeightRatio(page: Page): Promise<number> {
  return page.getByLabel('No selected grid cell').evaluate((element) => {
    const promptHeight = element.getBoundingClientRect().height;
    const textHeight = element.querySelector('span')?.getBoundingClientRect().height ?? 0;

    return promptHeight > 0 ? textHeight / promptHeight : 0;
  });
}

async function getExpectedExportPngSize(preview: Locator): Promise<{ height: number; visibleHeight: number; width: number }> {
  return preview.evaluate((element) => {
    const box = element.getBoundingClientRect();
    const previewBody = element.querySelector<HTMLElement>('.export-preview__body');
    const bodyOverflowHeight = previewBody
      ? Math.max(0, previewBody.scrollHeight - previewBody.getBoundingClientRect().height)
      : 0;

    return {
      height: Math.ceil(box.height + bodyOverflowHeight),
      visibleHeight: Math.ceil(box.height),
      width: Math.ceil(Math.max(box.width, element.scrollWidth)),
    };
  });
}

async function expectResponsiveWorkbench(
  page: Page,
  options: {
    edgeCellLabel: string;
    expectedCells: number;
    isMobile: boolean;
    mobileState?: 'empty' | 'preview-ready';
    mobileSceneName?: string;
    mobileCanvasDimensions?: string;
  },
): Promise<void> {
  if (options.isMobile) {
    await expect(page.getByRole('region', { name: 'Mobile Preview Mode' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Mobile Preview Mode' })).toHaveAttribute(
      'data-mobile-preview-state',
      options.mobileState ?? 'empty',
    );
    await expect(page.getByLabel('Interaction mode')).toHaveText('Mobile Preview Mode');
    await expect(page.getByLabel('Open Design editing workbench')).toHaveCount(0);
    await expect(page.getByTestId('scene-cell')).toHaveCount(0);
    await expect(page.getByLabel('Pokemon scene controls')).toHaveCount(0);
    await expect(page.getByRole('complementary', { name: 'Asset picker' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: '导入字符串' })).toBeVisible();
    await expect(page.getByRole('button', { name: '下载预览' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: '导出字符串' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: '重置' })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    if (options.mobileState === 'preview-ready') {
      await expect(page.getByRole('heading', { name: options.mobileSceneName ?? '' })).toBeVisible();
      await expect(page.getByText(`${options.mobileCanvasDimensions ?? ''} 画布`, { exact: false })).toBeVisible();
      await expect(page.getByLabel('图片导出内容')).toBeVisible();
      await expect(page.getByLabel('整体使用素材清单')).toBeVisible();
      await expect(page.getByLabel('逐层图形和素材清单')).toBeVisible();
    } else {
      await expect(page.getByText('还没有本地保存的布景。')).toHaveCount(0);
      await expect(page.getByText('可以导入一个布景字符串来恢复说明预览。')).toHaveCount(0);
    }
    return;
  }

  await expect(page.getByLabel('Pokopia scene editor workbench')).toBeVisible();
  await expect(page.getByTestId('scene-cell')).toHaveCount(options.expectedCells);
  await expect(page.getByLabel(options.edgeCellLabel)).toBeVisible();
  await expect(page.getByLabel('Interaction mode')).toHaveText('Desktop edit mode');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expectElementCenterUncovered(page, page.getByLabel(options.edgeCellLabel));

  await expect(page.getByLabel('Pokemon scene controls')).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Asset picker' })).toBeVisible();
  await expect(page.getByRole('complementary', { name: '检查器预览' })).toHaveCount(0);
  await expectElementCenterUncovered(page, page.getByRole('complementary', { name: 'Asset picker' }));
  await expect(page.getByRole('button', { name: '下载预览' })).toBeVisible();
  await expect(page.getByRole('button', { name: '新建层' })).toBeEnabled();
}

async function expectElementCenterUncovered(page: Page, locator: Locator): Promise<void> {
  await locator.scrollIntoViewIfNeeded();
  await expect
    .poll(async () =>
      locator.evaluate((element) => {
        const box = element.getBoundingClientRect();
        const x = box.left + box.width / 2;
        const y = box.top + box.height / 2;
        const hit = document.elementFromPoint(x, y);
        return Boolean(hit && (hit === element || element.contains(hit) || hit.contains(element)));
      }),
    )
    .toBe(true);
}

async function measureSelectionDuration(page: Page, cellSelector: string): Promise<number> {
  await page.evaluate(() => performance.clearMeasures('scene-selection-duration'));
  await page.locator(cellSelector).click();
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const measure = performance.getEntriesByName('scene-selection-duration').at(-1);
          return measure?.duration ?? -1;
        }),
      { timeout: 3000 },
    )
    .toBeGreaterThanOrEqual(0);

  return page.evaluate(() => performance.getEntriesByName('scene-selection-duration').at(-1)?.duration ?? -1);
}

function expectScenePayloadHasNoLegacyFields(payload: unknown): void {
  const serializedPayload = JSON.stringify(payload);

  expect(serializedPayload).not.toContain('"saveStatus"');
  expect(serializedPayload).not.toContain('"saveError"');
  expect(serializedPayload).not.toContain('"note"');
  expect(serializedPayload).not.toContain('"visible"');
  expect(serializedPayload).not.toContain('"locked"');
  expect(serializedPayload).not.toContain('"rotatable"');
  expect(serializedPayload).not.toContain('"stackable"');
}

function getShellTransitionDuration(page: Page): Promise<string> {
  return page
    .getByLabel('Pokopia scene editor workbench')
    .evaluate((element) => getComputedStyle(element).transitionDuration);
}

function getPngSize(bytes: Buffer): { height: number; width: number } {
  expect(bytes.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));

  return {
    height: bytes.readUInt32BE(20),
    width: bytes.readUInt32BE(16),
  };
}

function getCanvasCellCount(canvasSize: { width: number; height: number }): number {
  return canvasSize.width * canvasSize.height;
}

function getMaxCoordinate(canvasSize: { width: number; height: number }): { x: number; y: number } {
  return {
    x: canvasSize.width - 1,
    y: canvasSize.height - 1,
  };
}

const mobileApplicationKeys = [
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Enter',
  'Space',
  'Escape',
  'Delete',
  'Backspace',
  'Meta+S',
  'Control+S',
] as const;

function createRemoteImportScene(sceneName: string) {
  return createDefaultSceneDocument({
    includeOpenDesignDemo: true,
    now: '2026-06-01T02:40:00.000Z',
    sceneId: 'scene-remote-import-smoke',
    sceneName,
    selectedPokemonKey: 'pikachu',
  });
}

function createEditableScene() {
  const now = '2026-05-16T10:20:00.000Z';

  return {
    schemaVersion: 1,
    sceneId: 'scene-edit-flow',
    sceneName: 'Edit Flow Smoke',
    selectedPokemonKey: 'pikachu',
    sceneSize: { ...defaultSceneSize },
    canvasSize: { ...defaultCanvasSize },
    outerPadding: defaultOuterPadding,
    buildingLevels: [
      { id: 'level-0', levelNumber: 0, name: '1层' },
      { id: 'level-1', levelNumber: 1, name: '2层' },
      { id: 'level-2', levelNumber: 2, name: '3层' },
    ],
    tileInstances: [],
    workspaceState: {
      currentBuildingLevelId: 'level-0',
      selectedAssetId: null,
      selectedCoordinate: null,
    },
    metadata: {
      createdAt: now,
      updatedAt: now,
      lastSavedAt: now,
      lastAutosavedAt: null,
    },
  };
}

function createRestoredScene() {
  return {
    ...createEditableScene(),
    sceneId: 'scene-restored-smoke',
    sceneName: 'Restored Smoke Layout',
    tileInstances: [
      {
        instanceId: 'tile-restored-smoke',
        assetId: 'leafy-plant',
        coordinate: { x: 4, y: 4 },
        areaType: 'main',
        buildingLevelId: 'level-1',
        rotationDegrees: 0,
        dyeColor: null,
        requiresSkill: true,
        skillType: '树叶',
        skillNote: 'restore smoke',
      },
    ],
    workspaceState: {
      currentBuildingLevelId: 'level-1',
      selectedAssetId: 'leafy-plant',
      selectedCoordinate: { x: 4, y: 4 },
    },
    metadata: {
      createdAt: '2026-05-16T10:20:00.000Z',
      updatedAt: '2026-05-16T10:45:00.000Z',
      lastSavedAt: null,
      lastAutosavedAt: '2026-05-16T10:45:00.000Z',
    },
  };
}

function createExportPreviewScene() {
  const scene = createRestoredScene();
  const coordinates = [
    { x: 4, y: 4 },
    { x: 1, y: 1 },
    { x: 2, y: 1 },
    { x: 3, y: 1 },
    { x: 4, y: 1 },
    { x: 5, y: 1 },
  ];
  const assetIds = ['leafy-plant', 'wooden-fencing', 'stepping-stones', 'ditto-doll', 'stone-brick-wall', 'brick-roof-decoration'];

  return {
    ...scene,
    tileInstances: assetIds.map((assetId, index) => ({
      instanceId: `tile-export-preview-${assetId}`,
      assetId,
      coordinate: coordinates[index],
      areaType: 'main',
      buildingLevelId: 'level-1',
      rotationDegrees: 0,
      dyeColor: null,
      requiresSkill: assetId === 'leafy-plant',
      skillType: assetId === 'leafy-plant' ? '树叶' : null,
      skillNote: assetId === 'leafy-plant' ? 'restore smoke' : '',
    })),
    skillMarkers: [
      {
        coordinate: { x: 2, y: 5 },
        areaType: 'main',
        buildingLevelId: 'level-1',
        skillType: '储水',
        skillNote: '',
      },
    ],
  };
}

function createTallThumbnailScene() {
  return {
    ...createEditableScene(),
    sceneId: 'scene-tall-thumbnail',
    sceneName: 'Tall Thumbnail Smoke',
    tileInstances: [
      {
        instanceId: 'tile-roserade-tea',
        assetId: 'roserade-tea',
        coordinate: { x: 4, y: 2 },
        areaType: 'main',
        buildingLevelId: 'level-0',
        rotationDegrees: 0,
        dyeColor: null,
        requiresSkill: false,
        skillType: null,
        skillNote: '',
      },
    ],
    workspaceState: {
      currentBuildingLevelId: 'level-0',
      selectedAssetId: null,
      selectedCoordinate: { x: 4, y: 2 },
    },
  };
}

function createLegacyResponsiveScene() {
  const now = '2026-05-16T10:32:30.000Z';

  return {
    schemaVersion: 1,
    sceneId: 'scene-legacy-responsive',
    sceneName: 'Legacy Responsive Smoke',
    selectedPokemonKey: 'pikachu',
    sceneSize: { ...legacySceneDimensions.sceneSize },
    canvasSize: { ...legacySceneDimensions.canvasSize },
    outerPadding: legacySceneDimensions.outerPadding,
    buildingLevels: [
      { id: 'level-0', levelNumber: 0, name: '1层' },
    ],
    tileInstances: [
      {
        instanceId: 'tile-legacy-responsive',
        assetId: 'leafy-plant',
        coordinate: { ...legacyMaxCoordinate },
        areaType: 'outer',
        buildingLevelId: 'level-0',
        rotationDegrees: 0,
        dyeColor: null,
        requiresSkill: false,
        skillType: null,
        skillNote: '',
      },
    ],
    workspaceState: {
      currentBuildingLevelId: 'level-0',
      selectedAssetId: null,
      selectedCoordinate: { ...legacyMaxCoordinate },
    },
    metadata: {
      createdAt: now,
      updatedAt: now,
      lastSavedAt: now,
      lastAutosavedAt: null,
    },
  };
}

function createDenseScene() {
  return createLayeredScene('scene-dense-preview', 'Dense Preview Smoke', defaultCanvasSize.width * defaultCanvasSize.height);
}

function createPerformanceBudgetScene() {
  return createLayeredScene('scene-performance-budget', 'Performance Budget Smoke', 100);
}

function createLayeredScene(sceneId: string, sceneName: string, instancesPerLevel: number) {
  const now = '2026-05-16T10:32:30.000Z';
  const buildingLevels = Array.from({ length: 10 }, (_, levelNumber) => ({
    id: `level-${levelNumber}`,
    levelNumber,
    name: `${levelNumber}层`,
  }));
  const tileInstances = buildingLevels.flatMap((level) =>
    Array.from({ length: instancesPerLevel }, (_, index) => {
      const x = index % defaultCanvasSize.width;
      const y = Math.floor(index / defaultCanvasSize.width);
      const assetId = densePreviewAssetIds[index % densePreviewAssetIds.length];
      const requiresSkill = index % 3 === 0;

      return {
        instanceId: `tile-${level.levelNumber}-${index}`,
        assetId,
        coordinate: { x, y },
        areaType: isMainCoordinate(x, y) ? 'main' : 'outer',
        buildingLevelId: level.id,
        rotationDegrees: 0,
        dyeColor: null,
        requiresSkill,
        skillType: requiresSkill ? densePreviewSkillTypes[index % densePreviewSkillTypes.length] : null,
        skillNote: '',
      };
    }),
  );

  return {
    schemaVersion: 1,
    sceneId,
    sceneName,
    selectedPokemonKey: 'pikachu',
    sceneSize: { ...defaultSceneSize },
    canvasSize: { ...defaultCanvasSize },
    outerPadding: defaultOuterPadding,
    buildingLevels,
    tileInstances,
    workspaceState: {
      currentBuildingLevelId: 'level-0',
      selectedAssetId: null,
      selectedCoordinate: { x: 2, y: 3 },
    },
    metadata: {
      createdAt: now,
      updatedAt: now,
      lastSavedAt: now,
      lastAutosavedAt: null,
    },
  };
}

function isMainCoordinate(x: number, y: number): boolean {
  return (
    x >= defaultOuterPadding &&
    x < defaultOuterPadding + defaultSceneSize.width &&
    y >= defaultOuterPadding &&
    y < defaultOuterPadding + defaultSceneSize.height
  );
}
