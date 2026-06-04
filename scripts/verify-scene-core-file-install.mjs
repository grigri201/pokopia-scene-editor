import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const corePackageDir = resolve(repoRoot, 'packages/scene-core');
const coreDistEntry = resolve(corePackageDir, 'dist/index.js');
const coreDistTypes = resolve(corePackageDir, 'dist/index.d.ts');

execFileSync('pnpm', ['--filter', '@pokopia-scene-editor/scene-core', 'build'], {
  cwd: repoRoot,
  stdio: 'inherit',
});

for (const requiredFile of [coreDistEntry, coreDistTypes]) {
  if (!existsSync(requiredFile)) {
    throw new Error(
      `Missing scene-core build output: ${requiredFile}. Run pnpm --filter @pokopia-scene-editor/scene-core build first.`,
    );
  }
}

const tempDir = mkdtempSync(join(tmpdir(), 'pokopia-scene-core-consumer-'));

try {
  const packDir = resolve(tempDir, 'pack');
  mkdirSync(packDir);

  execFileSync('pnpm', ['pack', '--pack-destination', packDir], {
    cwd: corePackageDir,
    stdio: 'inherit',
  });

  const packedPackage = readdirSync(packDir).find((entry) => entry.endsWith('.tgz'));

  if (!packedPackage) {
    throw new Error(`Unable to find packed scene-core tarball in ${packDir}.`);
  }

  const packedPackagePath = resolve(packDir, packedPackage);

  writeFileSync(
    resolve(tempDir, 'package.json'),
    `${JSON.stringify(
      {
        name: 'pokopia-scene-core-file-install-smoke',
        private: true,
        type: 'module',
      },
      null,
      2,
    )}\n`,
  );

  execFileSync('pnpm', ['add', `file:${packedPackagePath}`], {
    cwd: tempDir,
    stdio: 'inherit',
  });

  execFileSync('pnpm', ['add', '-D', 'typescript@6.0.3'], {
    cwd: tempDir,
    stdio: 'inherit',
  });

  writeFileSync(
    resolve(tempDir, 'verify.mjs'),
    `import assert from 'node:assert/strict';
import {
  assetCatalog,
  buildImageExportSummary,
  createCanvasCells,
  createDefaultSceneDocument,
  createSceneDimensionsForCanvasSize,
  decodeSceneDocumentString,
  encodeSceneDocumentString,
  getAssetById,
  getSelectedCellContext,
  parseSceneDocument,
  serializeSceneDocument
} from '@pokopia-scene-editor/scene-core';

const scene = createDefaultSceneDocument({
  sceneId: 'file-install-smoke',
  now: '2026-05-30T00:00:00.000Z',
  selectedCoordinate: { x: 1, y: 1 }
});

const payload = serializeSceneDocument(scene);
const parsed = parseSceneDocument(payload);
assert.equal(parsed.ok, true, 'SceneDocument v1 payload should parse');

const dimensions = createSceneDimensionsForCanvasSize({ width: 17, height: 17 });
assert.equal(createCanvasCells(dimensions).length, 289, '17x17 dimensions should expose 289 cells');

assert.ok(assetCatalog.length > 0, 'asset catalog should be available');
const sampleAsset = assetCatalog[0];
assert.equal(getAssetById(sampleAsset.assetId)?.assetId, sampleAsset.assetId, 'catalog helper should resolve a known asset');

const encoded = encodeSceneDocumentString(scene);
const decoded = decodeSceneDocumentString(encoded, '2026-05-30T00:00:00.000Z');
assert.equal(decoded.ok, true, 'codec should roundtrip from the installed package');

assert.equal(getSelectedCellContext(scene)?.areaType, 'main', 'selector should use SceneDocument dimensions');
assert.equal(buildImageExportSummary(scene).layers.length, scene.buildingLevels.length, 'export summary should be available');
`,
  );

  writeFileSync(
    resolve(tempDir, 'verify-types.ts'),
    `import {
  createDefaultSceneDocument,
  parseSceneDocument,
  serializeSceneDocument,
  type SceneDocument
} from '@pokopia-scene-editor/scene-core';

const scene: SceneDocument = createDefaultSceneDocument({
  sceneId: 'file-install-type-smoke',
  now: '2026-05-30T00:00:00.000Z'
});

const parsed = parseSceneDocument(serializeSceneDocument(scene));

if (!parsed.ok) {
  throw new Error('SceneDocument v1 payload should parse.');
}
`,
  );

  writeFileSync(
    resolve(tempDir, 'tsconfig.json'),
    `${JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2024',
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          strict: true,
          skipLibCheck: true,
          noEmit: true,
        },
        include: ['verify-types.ts'],
      },
      null,
      2,
    )}\n`,
  );

  execFileSync('node', ['verify.mjs'], {
    cwd: tempDir,
    stdio: 'inherit',
  });

  execFileSync('pnpm', ['exec', 'tsc', '-p', 'tsconfig.json'], {
    cwd: tempDir,
    stdio: 'inherit',
  });
} finally {
  rmSync(tempDir, { force: true, recursive: true });
}
