import { expect, test, type Page } from '@playwright/test';

const autosavedSceneStorageKey = 'pokopia.sceneDocument.autosave.v1';
const savedSceneStorageKey = 'pokopia.sceneDocument.v1';
const uiPreferencesStorageKey = 'pokopia.uiPreferences.v1';
const densePreviewAssetIds = ['wooden-floor', 'garden-plant', 'outer-wall', 'ditto-doll', 'water-barrel', 'roof-tile'];
const densePreviewSkillTypes = ['树叶', '耕地', '储水'];

test('renders the Open Design workbench as the first screen', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');

  await expect(page.getByLabel('Pokopia scene editor workbench')).toBeVisible();
  expect(await getShellTransitionDuration(page)).toBe('0s');
  await expect(page.getByLabel('Pokemon scene controls')).toBeVisible();
  await expect(page.getByLabel('Current Pokemon')).toHaveValue('pikachu');
  await expect(page.getByLabel('Scene Name')).toHaveValue('星光庭院');
  await expect(page.getByRole('complementary', { name: 'Asset picker' })).toBeVisible();
  await expect(page.getByRole('complementary', { name: '检查器预览' })).toBeVisible();
  await expect(page.getByTestId('scene-cell')).toHaveCount(49);
  await expect(page.getByLabel('Cell 3,2, main area, level-1, placeable, 白木栅栏, rotated 90')).toBeVisible();
  await expect(page.getByLabel('Save status')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Save scene' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Undo' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Redo' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Show preview grid' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Show preview main boundary' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Show preview skill markers' })).toHaveCount(0);

  const snapshot = await readSceneSnapshot(page);
  expect(snapshot.sceneName).toBe('星光庭院');
  expect(snapshot.workspaceState).toMatchObject({
    currentBuildingLevelId: 'level-1',
    selectedAssetId: 'wooden-floor',
    selectedCoordinate: { x: 3, y: 2 },
  });
  expectScenePayloadHasNoLegacyFields(snapshot);
});

test('autosaves SceneDocument v1 without UI-only state or manual save entrypoints', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');

  await page.getByLabel('Scene Name').fill('Smoke Payload Boundary');
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

  await expect(page.getByLabel('Scene Name')).toHaveValue('Restored Smoke Layout');

  const snapshot = await readSceneSnapshot(page);
  expect(snapshot).toMatchObject({
    sceneId: 'scene-restored-smoke',
    sceneName: 'Restored Smoke Layout',
    workspaceState: {
      currentBuildingLevelId: 'level-1',
      selectedAssetId: 'garden-plant',
      selectedCoordinate: { x: 4, y: 4 },
    },
  });
  expectScenePayloadHasNoLegacyFields(snapshot);
  expect(await page.evaluate((key) => window.localStorage.getItem(key), savedSceneStorageKey)).toBeNull();
});

test('keeps retained edit commands wired through the workbench shell', async ({ page }) => {
  await page.addInitScript((scene) => {
    (window as unknown as { __pokopiaInitialSceneSnapshot?: unknown }).__pokopiaInitialSceneSnapshot = scene;
  }, createEditableScene());
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');

  await page.locator('[data-asset-id="garden-plant"] .asset-select-button').click();
  await page.locator('[data-coordinate="2,2"]').click();
  await expect
    .poll(async () => getFirstStoredTileField(page, 'assetId'))
    .toBe('garden-plant');

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

  await page.locator('[data-asset-id="roof-tile"] .asset-select-button').click();
  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('[data-coordinate="2,2"]').click();
  await expect
    .poll(async () => getStoredTileCount(page))
    .toBe(1);
  await expect
    .poll(async () => getFirstStoredTileField(page, 'assetId'))
    .toBe('roof-tile');

  await page.getByRole('button', { name: '新建层' }).click();
  await expect
    .poll(async () => getStoredBuildingLevelCount(page))
    .toBe(4);

  await expect(page.getByRole('textbox', { name: 'Instance note' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Move instance' })).toHaveCount(0);
  await expect(page.getByRole('combobox', { name: 'Building layer' })).toHaveCount(0);
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

test('migrates legacy preview display preferences without hidden preview controls', async ({ page }) => {
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
  await expect(page.getByLabel('Asset area filter')).toHaveValue('outer');
  await expect(page.getByLabel('Asset skill filter')).toHaveValue('skill-candidate');

  const rawPreferences = await page.evaluate((storageKey) => window.localStorage.getItem(storageKey), uiPreferencesStorageKey);
  expect(rawPreferences).not.toBeNull();
  expect(rawPreferences).not.toContain('preview');
  expect(rawPreferences).not.toContain('displayOptions');
  expect(rawPreferences).toContain('"area":"outer"');
  expect(rawPreferences).toContain('"skill":"skill-candidate"');
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
  await expect(page.getByLabel('Scene Name')).toHaveAttribute('readonly', '');
  await expect(page.getByRole('button', { name: '新建层' })).toBeDisabled();
  await expect(page.getByLabel('Save status')).toHaveCount(0);
  const beforeKeyboardSnapshot = JSON.stringify(await readSceneSnapshot(page));
  const beforeCurrentLevel = await page.getByLabel('Current building level').textContent();
  const selectedCell = page.getByLabel('Cell 3,2, main area, level-1, read-only, 白木栅栏, rotated 90');

  await selectedCell.focus();
  for (const key of mobileApplicationKeys) {
    await page.keyboard.press(key);
  }
  await page.getByLabel('L2, 屋顶与遮挡, 5 instances').focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Space');
  await page.locator('[data-asset-id="garden-plant"] .asset-select-button').focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  for (const key of mobileApplicationKeys) {
    await page.keyboard.press(key);
  }

  expect(JSON.stringify(await readSceneSnapshot(page))).toBe(beforeKeyboardSnapshot);
  await expect(page.getByLabel('Current building level')).toHaveText(beforeCurrentLevel ?? '');
  await expect(selectedCell).toHaveAttribute('aria-selected', 'true');
  expect(await page.evaluate((key) => window.localStorage.getItem(key), autosavedSceneStorageKey)).toBeNull();
  expect(await page.evaluate((key) => window.localStorage.getItem(key), savedSceneStorageKey)).toBeNull();

  await selectedCell.click();
  await expect(selectedCell).toHaveAttribute(
    'aria-selected',
    'true',
  );
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
      { id: 'level-0', levelNumber: 0, name: '0 层' },
      { id: 'level-1', levelNumber: 1, name: '1 层' },
      { id: 'level-2', levelNumber: 2, name: '2 层' },
    ],
    tileInstances: [],
    workspaceState: {
      currentBuildingLevelId: 'level-0',
      selectedAssetId: null,
      selectedCoordinate: { x: 2, y: 2 },
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
        assetId: 'garden-plant',
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
      selectedAssetId: 'garden-plant',
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

function createDenseScene() {
  const now = '2026-05-16T10:32:30.000Z';
  const buildingLevels = Array.from({ length: 10 }, (_, levelNumber) => ({
    id: `level-${levelNumber}`,
    levelNumber,
    name: `${levelNumber} 层`,
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
