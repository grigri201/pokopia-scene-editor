import { expect, test, type Page } from '@playwright/test';

const savedSceneStorageKey = 'pokopia.sceneDocument.v1';
const autosavedSceneStorageKey = 'pokopia.sceneDocument.autosave.v1';
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

  const snapshot = await readSceneSnapshot(page);
  expect(snapshot.sceneName).toBe('星光庭院');
  expect(snapshot.workspaceState).toMatchObject({
    currentBuildingLevelId: 'level-1',
    selectedAssetId: 'wooden-floor',
    selectedCoordinate: { x: 3, y: 2 },
  });
  expectScenePayloadHasNoLegacyFields(snapshot);
});

test('saves and autosaves SceneDocument v1 without UI-only state', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');

  await page.getByLabel('Scene Name').fill('Smoke Payload Boundary');
  const autosavedPayload = await waitForStoredPayload(page, autosavedSceneStorageKey);
  expect(autosavedPayload.sceneName).toBe('Smoke Payload Boundary');
  expectScenePayloadHasNoLegacyFields(autosavedPayload);
  expect(await page.evaluate((key) => window.localStorage.getItem(key), savedSceneStorageKey)).toBeNull();

  await page.getByRole('button', { name: 'Save scene', exact: true }).click();
  const savedPayload = await waitForStoredPayload(page, savedSceneStorageKey);
  expect(savedPayload.sceneName).toBe('Smoke Payload Boundary');
  expect(await page.evaluate((key) => window.localStorage.getItem(key), autosavedSceneStorageKey)).toBe(
    await page.evaluate((key) => window.localStorage.getItem(key), savedSceneStorageKey),
  );
  expectScenePayloadHasNoLegacyFields(savedPayload);
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

  await expect(frontPreview.locator('[data-front-level-id]')).toHaveCount(70);
  const selectionDuration = await measureSelectionDuration(page, '[data-coordinate="3,3"]');
  expect(selectionDuration).toBeLessThan(250);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('switches scaffold controls to read-only below the mobile breakpoint', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  await expect(page.getByLabel('Interaction mode')).toHaveText('Mobile read-only mode');
  await expect(page.getByLabel('Current Pokemon')).toBeDisabled();
  await expect(page.getByLabel('Scene Name')).toHaveAttribute('readonly', '');
  await expect(page.getByRole('button', { name: '新建层' })).toBeDisabled();
  await expect(page.getByLabel('Save status')).toHaveCount(0);

  await page.getByLabel('Cell 3,2, main area, level-1, read-only, 白木栅栏, rotated 90').click();
  await expect(page.getByLabel('Cell 3,2, main area, level-1, read-only, 白木栅栏, rotated 90')).toHaveAttribute(
    'aria-selected',
    'true',
  );
  expect(await page.evaluate((key) => window.localStorage.getItem(key), autosavedSceneStorageKey)).toBeNull();
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
