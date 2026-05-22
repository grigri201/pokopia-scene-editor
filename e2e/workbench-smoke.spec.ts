import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

const autosavedSceneStorageKey = 'pokopia.sceneDocument.autosave.v1';
const savedSceneStorageKey = 'pokopia.sceneDocument.v1';
const uiPreferencesStorageKey = 'pokopia.uiPreferences.v1';
const densePreviewAssetIds = ['wooden-fencing', 'leafy-plant', 'stepping-stones', 'ditto-doll', 'stone-brick-wall', 'brick-roof-decoration'];
const densePreviewSkillTypes = ['树叶', '耕地', '储水'];

test('renders the Open Design workbench as the first screen', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');

  await expect(page.getByLabel('Pokopia scene editor workbench')).toBeVisible();
  expect(await getShellTransitionDuration(page)).toBe('0s');
  await expect(page.getByLabel('Pokemon scene controls')).toBeVisible();
  await expect(page.getByLabel('Current Pokemon')).toHaveValue('ditto');
  await expect(page.getByLabel('布景名称')).toHaveValue('5x5 布景');
  await expect(page.getByRole('complementary', { name: 'Asset picker' })).toBeVisible();
  await expect(page.locator('.asset-row')).toHaveCount(10);
  await expect(page.locator('[data-asset-id="leppa-berry"]')).toContainText('苹野果');
  await expect(page.locator('[data-asset-id="leppa-berry"]')).toContainText('食物');
  await expect(page.getByLabel('Asset page status')).toHaveText('1 / 116');
  await expect(page.getByText('Showing first')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Show more' })).toHaveCount(0);
  await expect(page.getByRole('complementary', { name: '检查器预览' })).toBeVisible();
  await expect(page.getByTestId('scene-cell')).toHaveCount(49);
  await expect(page.getByLabel('Cell 3,2, main area, level-0, placeable')).toBeVisible();
  await expect(page.getByLabel('Save status')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Save scene' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '下载预览' })).toBeVisible();
  await expect(page.getByRole('button', { name: '删除' })).toBeVisible();
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
  expect(snapshot.sceneName).toBe('5x5 布景');
  expect(snapshot.buildingLevels).toEqual([{ id: 'level-0', levelNumber: 0, name: '0层' }]);
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

test('autosaves SceneDocument v1 without UI-only state or manual save entrypoints', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');

  await page.getByLabel('布景名称').fill('Smoke Payload Boundary');
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

  await expect(page.getByLabel('布景名称')).toHaveValue('Restored Smoke Layout');

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

  const beforeSnapshot = JSON.stringify(await readSceneSnapshot(page));
  await page.getByRole('button', { name: '下载预览' }).click();

  await expect(page.getByRole('dialog', { name: '图片导出预览' })).toBeVisible();
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
  await expect(page.locator('.export-preview__layers > .export-layer').first()).toContainText('L0 · 0层');
  await expect(page.locator('.export-preview__layers')).not.toContainText('placed items');
  await expect(page.getByLabel('整体使用素材清单')).toContainText('绿叶植物');
  await expect(page.getByLabel('整体使用素材清单')).not.toContainText('No.');
  await expect(page.getByLabel('整体使用素材清单').locator('img[alt="绿叶植物缩略图"]')).toBeVisible();
  const overallMaterialItems = page.getByLabel('整体使用素材清单').locator('.export-material-list--with-thumbs > li');
  await expect(overallMaterialItems).toHaveCount(6);
  await expect
    .poll(async () => {
      const itemTops = await overallMaterialItems.evaluateAll((items) => items.map((item) => item.getBoundingClientRect().top));
      return Math.max(...itemTops) - Math.min(...itemTops);
    })
    .toBeLessThan(1);
  await expect
    .poll(async () =>
      overallMaterialItems.first().evaluate((item) => {
        const thumbnailBottom = item.querySelector('.export-material-list__thumb')?.getBoundingClientRect().bottom ?? 0;
        const textTop = item.querySelector('.export-material-list__row')?.getBoundingClientRect().top ?? 0;
        return textTop - thumbnailBottom;
      }),
    )
    .toBeGreaterThan(0);
  await expect(page.getByLabel('L1 7x7 图形')).toBeVisible();
  await expect(page.getByLabel('4,4: 绿叶植物').locator('img[title="绿叶植物"]')).toBeVisible();
  await expect(page.getByLabel('4,4: 绿叶植物')).not.toContainText('绿叶');
  await expect(page.getByLabel('L1 使用素材清单')).toContainText('绿叶植物');
  await expect(page.getByLabel('L1 使用素材清单')).not.toContainText('No.');
  await expect(page.getByLabel('L1 使用素材清单')).not.toContainText('restore smoke');
  await expect(page.getByLabel('L1 使用素材清单').locator('img[alt="绿叶植物缩略图"]')).toBeVisible();
  const layerMaterialItems = page.getByLabel('L1 使用素材清单').locator('.export-material-list--with-thumbs > li');
  await expect(layerMaterialItems).toHaveCount(6);
  await expect
    .poll(async () => {
      const itemTops = await layerMaterialItems.evaluateAll((items) => items.map((item) => item.getBoundingClientRect().top));
      return Math.abs(itemTops[0] - itemTops[1]);
    })
    .toBeLessThan(1);
  await expect
    .poll(async () => {
      const itemTops = await layerMaterialItems.evaluateAll((items) => items.map((item) => item.getBoundingClientRect().top));
      return itemTops[2] - itemTops[0];
    })
    .toBeGreaterThan(1);
  await expect(page.locator('.export-instance-list')).toHaveCount(0);

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '下载图片' }).click();
  const download = await downloadPromise;
  const downloadPath = await download.path();

  expect(download.suggestedFilename()).toBe('Restored-Smoke-Layout.pokopia-scene.svg');
  expect(downloadPath).not.toBeNull();
  const svgText = await readFile(downloadPath ?? '', 'utf8');
  expect(svgText).toContain('Restored Smoke Layout');
  expect(svgText).toContain('整体使用素材');
  expect(svgText).toContain('逐层图形');
  expect(svgText).toContain('逐层素材清单');
  expect(svgText).not.toContain('restore smoke');
  expect(svgText).not.toContain('No.');
  await expect(page.getByRole('status', { name: 'Image export download status' })).toContainText('图片已准备下载');
  expect(JSON.stringify(await readSceneSnapshot(page))).toBe(beforeSnapshot);
  expect(await page.evaluate((key) => window.localStorage.getItem(key), autosavedSceneStorageKey)).toBeNull();
  expect(await page.evaluate((key) => window.localStorage.getItem(key), savedSceneStorageKey)).toBeNull();
  expect(await page.evaluate((key) => window.localStorage.getItem(key), uiPreferencesStorageKey)).toBeNull();
});

test('keeps retained edit commands wired through the workbench shell', async ({ page }) => {
  await page.addInitScript((scene) => {
    (window as unknown as { __pokopiaInitialSceneSnapshot?: unknown }).__pokopiaInitialSceneSnapshot = scene;
  }, createEditableScene());
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');

  const leppaBerryButton = page.locator('[data-asset-id="leppa-berry"] .asset-select-button');
  await leppaBerryButton.click();
  await expect
    .poll(async () => (await readSceneSnapshot(page)).workspaceState as Record<string, unknown>)
    .toMatchObject({ selectedAssetId: 'leppa-berry' });
  await leppaBerryButton.click();
  await expect
    .poll(async () => (await readSceneSnapshot(page)).workspaceState as Record<string, unknown>)
    .toMatchObject({ selectedAssetId: null });
  await expect(leppaBerryButton).toHaveAttribute('aria-pressed', 'false');
  await leppaBerryButton.click();
  await page.locator('[data-coordinate="2,2"]').click();
  await expect
    .poll(async () => getFirstStoredTileField(page, 'assetId'))
    .toBe('leppa-berry');
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

  await page.locator('[data-asset-id="chesto-berry"] .asset-select-button').click();
  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('[data-coordinate="2,2"]').click();
  await page.locator('[data-coordinate="2,2"]').click();
  await expect
    .poll(async () => getStoredTileCount(page))
    .toBe(1);
  await expect
    .poll(async () => getFirstStoredTileField(page, 'assetId'))
    .toBe('chesto-berry');

  await page.locator('[data-asset-id="rawst-berry"] .asset-select-button').dblclick();
  await expect(page.locator('[data-asset-id="rawst-berry"]')).toHaveAttribute('data-selection-mode', 'continuous');
  await expect(page.locator('[data-asset-id="rawst-berry"]')).toHaveClass(/asset-row--continuous/);
  await page.locator('[data-coordinate="2,3"]').click();
  await page.locator('[data-coordinate="2,4"]').click();
  await expect
    .poll(async () => getStoredTileCount(page))
    .toBe(3);
  await expect
    .poll(async () => (await readSceneSnapshot(page)).workspaceState as Record<string, unknown>)
    .toMatchObject({ selectedAssetId: 'rawst-berry', selectedCoordinate: { x: 2, y: 4 } });
  await page.locator('[data-asset-id="rawst-berry"] .asset-select-button').click();
  await expect
    .poll(async () => (await readSceneSnapshot(page)).workspaceState as Record<string, unknown>)
    .toMatchObject({ selectedAssetId: null });
  await expect(page.locator('[data-asset-id="rawst-berry"]')).toHaveAttribute('data-selection-mode', 'none');

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

test('updates dense preview inside the browser-visible performance budget', async ({ page }) => {
  await page.addInitScript((scene) => {
    (window as unknown as { __pokopiaInitialSceneSnapshot?: unknown }).__pokopiaInitialSceneSnapshot = scene;
  }, createDenseScene());
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('/');

  const topPreview = page.getByLabel('俯视图预览');
  const frontPreview = page.getByLabel('正视图预览');

  await expect(page.getByLabel('Top preview item summary')).toHaveText('49 current-layer preview items');
  await expect(page.getByLabel('Front preview item summary')).toHaveText('490 visible items projected across 10 layers');
  await expect(topPreview.locator('[data-preview-coordinate]')).toHaveCount(49);
  await expect(frontPreview.locator('[data-front-level-id="level-0"]')).toHaveCount(7);
  await expect(page.getByRole('button', { name: 'Show preview grid' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Show preview main boundary' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Show preview skill markers' })).toHaveCount(0);
  await expect(topPreview).not.toHaveAttribute('data-preview-grid-visible');
  await expect(frontPreview).not.toHaveAttribute('data-preview-grid-visible');
  await expect(frontPreview).not.toHaveAttribute('data-preview-main-boundary-visible');
  await expect(frontPreview).not.toHaveAttribute('data-preview-skill-markers-visible');
  await expect(frontPreview.locator('.front-cell.skill')).toHaveCount(0);
  await expect(topPreview.locator('.top-cell.skill')).toHaveCount(0);
  expect(await page.evaluate((key) => window.localStorage.getItem(key), uiPreferencesStorageKey)).toBeNull();

  await expect(frontPreview.locator('[data-front-level-id]')).toHaveCount(70);
  const selectionDuration = await measureSelectionDuration(page, '[data-coordinate="3,3"]');
  expect(selectionDuration).toBeLessThan(250);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
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

  await page.getByLabel('Search assets').fill('no-matching-asset-smoke');

  await expect(page.getByLabel('No matching assets')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Clear filters' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Show all' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Disable favorite' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'All categories' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Clear search' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Reset filters' })).toHaveCount(0);
});

test('switches scaffold controls to read-only below the mobile breakpoint', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  await expect(page.getByLabel('Interaction mode')).toHaveText('Mobile read-only mode');
  await expect(page.getByLabel('Current Pokemon')).toBeDisabled();
  await expect(page.getByLabel('布景名称')).toHaveAttribute('readonly', '');
  await expect(page.getByRole('button', { name: '新建层' })).toBeDisabled();
  await expect(page.getByLabel('Save status')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '下载预览' })).toHaveCount(0);
  const beforeKeyboardSnapshot = JSON.stringify(await readSceneSnapshot(page));
  const beforeCurrentLevel = await page.getByLabel('Current building level').textContent();
  const selectedCell = page.getByLabel('Cell 3,2, main area, level-0, read-only');

  await selectedCell.focus();
  for (const key of mobileApplicationKeys) {
    await page.keyboard.press(key);
  }
  await page.getByLabel('L0, 0层, 0 instances, viewing layer').focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Space');
  await page.locator('[data-asset-id="leppa-berry"] .asset-select-button').focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  for (const key of mobileApplicationKeys) {
    await page.keyboard.press(key);
  }

  expect(JSON.stringify(await readSceneSnapshot(page))).toBe(beforeKeyboardSnapshot);
  await expect(page.getByLabel('Current building level')).toHaveText(beforeCurrentLevel ?? '');
  await expect(selectedCell).not.toHaveAttribute('aria-selected', 'true');
  expect(await page.evaluate((key) => window.localStorage.getItem(key), autosavedSceneStorageKey)).toBeNull();
  expect(await page.evaluate((key) => window.localStorage.getItem(key), savedSceneStorageKey)).toBeNull();

  await selectedCell.click();
  await expect(selectedCell).toHaveAttribute('aria-selected', 'true');
  expect(await page.evaluate((key) => window.localStorage.getItem(key), autosavedSceneStorageKey)).toBeNull();
  expect(await page.evaluate((key) => window.localStorage.getItem(key), savedSceneStorageKey)).toBeNull();
  expectScenePayloadHasNoLegacyFields(await readSceneSnapshot(page));
});

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

function createEditableScene() {
  const now = '2026-05-16T10:20:00.000Z';

  return {
    schemaVersion: 1,
    sceneId: 'scene-edit-flow',
    sceneName: 'Edit Flow Smoke',
    selectedPokemonKey: 'pikachu',
    sceneSize: { width: 5, height: 5 },
    canvasSize: { width: 7, height: 7 },
    outerPadding: 1,
    buildingLevels: [
      { id: 'level-0', levelNumber: 0, name: '0层' },
      { id: 'level-1', levelNumber: 1, name: '1层' },
      { id: 'level-2', levelNumber: 2, name: '2层' },
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

function createDenseScene() {
  const now = '2026-05-16T10:32:30.000Z';
  const buildingLevels = Array.from({ length: 10 }, (_, levelNumber) => ({
    id: `level-${levelNumber}`,
    levelNumber,
    name: `${levelNumber}层`,
  }));
  const tileInstances = buildingLevels.flatMap((level) =>
    Array.from({ length: 49 }, (_, index) => {
      const assetId = densePreviewAssetIds[index % densePreviewAssetIds.length];
      const requiresSkill = index % 3 === 0;

      return {
        instanceId: `tile-${level.levelNumber}-${index}`,
        assetId,
        coordinate: { x: index % 7, y: Math.floor(index / 7) },
        areaType: isMainCoordinate(index % 7, Math.floor(index / 7)) ? 'main' : 'outer',
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
    sceneId: 'scene-dense-preview',
    sceneName: 'Dense Preview Smoke',
    selectedPokemonKey: 'pikachu',
    sceneSize: { width: 5, height: 5 },
    canvasSize: { width: 7, height: 7 },
    outerPadding: 1,
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
  return x >= 1 && x <= 5 && y >= 1 && y <= 5;
}
