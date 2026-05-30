import { existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const runtimeAssetDirectories = [
  'ability_icons',
  'decorative_item_portraits',
  'item_portraits',
  'pokemon_portraits',
  'specialty_icons',
];

const imageExtensionPattern = /\.(avif|gif|jpe?g|png|svg|webp)$/i;
const runtimeAssetUrlPrefix = '/assets/pokopia_image_sources/';
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = resolvePathOption('--source', resolve(projectRoot, 'assets/pokopia_image_sources'));
const outputRoot = resolvePathOption('--output', resolve(projectRoot, 'apps/web/dist/assets/pokopia_image_sources'));
const sceneCoreSourceRoot = resolve(projectRoot, 'packages/scene-core/src');
const sceneCoreEntry = resolve(projectRoot, 'packages/scene-core/dist/index.js');
const errors = [];

for (const directory of runtimeAssetDirectories) {
  const sourceDirectory = resolve(sourceRoot, directory);
  const outputDirectory = resolve(outputRoot, directory);
  const sourceCount = countImages(sourceDirectory);
  const outputCount = countImages(outputDirectory);

  if (sourceCount === 0) {
    errors.push(`No source runtime images found in ${sourceDirectory}`);
  }

  if (outputCount !== sourceCount) {
    errors.push(`Runtime image count mismatch for ${directory}: expected ${sourceCount}, found ${outputCount}`);
  }
}

const sceneCore = await loadSceneCore();
const referencedAssets = collectReferencedRuntimeAssets(sceneCore);

for (const referencedAsset of referencedAssets.values()) {
  const sourcePath = resolveRuntimeAssetPath(sourceRoot, referencedAsset.relativePath);
  const outputPath = resolveRuntimeAssetPath(outputRoot, referencedAsset.relativePath);
  const label = `${referencedAsset.kind} ${referencedAsset.id}`;

  if (!sourcePath) {
    errors.push(`Runtime asset reference escapes source root for ${label}: ${referencedAsset.url}`);
    continue;
  }

  if (!outputPath) {
    errors.push(`Runtime asset reference escapes output root for ${label}: ${referencedAsset.url}`);
    continue;
  }

  if (!existsSync(sourcePath)) {
    errors.push(`Missing source runtime image for ${label}: ${referencedAsset.url} -> ${sourcePath}`);
  }

  if (!existsSync(outputPath)) {
    errors.push(`Missing Web build runtime image for ${label}: ${referencedAsset.url} -> ${outputPath}`);
  }
}

if (errors.length > 0) {
  console.error(['Pokopia runtime asset verification failed:', ...errors.map((error) => `- ${error}`)].join('\n'));
  process.exit(1);
}

console.log(`Pokopia runtime asset verification passed (${referencedAssets.size} references checked).`);

function getOptionValue(optionName) {
  const optionIndex = process.argv.indexOf(optionName);
  const value = optionIndex >= 0 ? process.argv[optionIndex + 1] : undefined;

  return value && !value.startsWith('--') ? value : undefined;
}

function resolvePathOption(optionName, fallback) {
  const value = getOptionValue(optionName);

  return value ? resolve(process.cwd(), value) : fallback;
}

function countImages(directory) {
  if (!existsSync(directory)) {
    return 0;
  }

  let count = 0;

  for (const entry of readdirSync(directory)) {
    if (entry.startsWith('.')) {
      continue;
    }

    const entryPath = resolve(directory, entry);
    const entryStat = statSync(entryPath);

    if (entryStat.isDirectory()) {
      count += countImages(entryPath);
    } else if (imageExtensionPattern.test(entry)) {
      count += 1;
    }
  }

  return count;
}

async function loadSceneCore() {
  if (!existsSync(sceneCoreEntry)) {
    errors.push(`Scene core build output not found at ${sceneCoreEntry}. Run pnpm --filter @pokopia-scene-editor/scene-core build before verifying runtime asset references.`);
    return {
      assetCatalog: [],
      assetSkillTypes: [],
      getAssetSkillMarkerIconUrl: () => null,
      pokemonThemeCatalog: [],
    };
  }

  ensureFreshSceneCoreBuild();

  return import(pathToFileURL(sceneCoreEntry).href);
}

function ensureFreshSceneCoreBuild() {
  const entryMtimeMs = statSync(sceneCoreEntry).mtimeMs;
  const newestSourceMtimeMs = getNewestModifiedTime(sceneCoreSourceRoot);

  if (newestSourceMtimeMs > entryMtimeMs) {
    errors.push(`Scene core build output is older than source files. Run pnpm --filter @pokopia-scene-editor/scene-core build before verifying runtime asset references.`);
  }
}

function getNewestModifiedTime(path) {
  const pathStat = statSync(path);

  if (!pathStat.isDirectory()) {
    return pathStat.mtimeMs;
  }

  let newestMtimeMs = pathStat.mtimeMs;

  for (const entry of readdirSync(path)) {
    if (entry.startsWith('.')) {
      continue;
    }

    newestMtimeMs = Math.max(newestMtimeMs, getNewestModifiedTime(resolve(path, entry)));
  }

  return newestMtimeMs;
}

function collectReferencedRuntimeAssets({
  assetCatalog,
  assetSkillTypes,
  getAssetSkillMarkerIconUrl,
  pokemonThemeCatalog,
}) {
  const references = new Map();

  for (const asset of assetCatalog) {
    addReferencedRuntimeAsset(references, {
      id: asset.assetId,
      kind: 'asset thumbnail',
      url: asset.thumbnailUrl,
    });
  }

  for (const pokemon of pokemonThemeCatalog) {
    addReferencedRuntimeAsset(references, {
      id: pokemon.key,
      kind: 'Pokemon portrait',
      url: pokemon.portraitUrl,
    });
  }

  for (const skillType of assetSkillTypes) {
    addReferencedRuntimeAsset(references, {
      id: skillType,
      kind: 'skill marker icon',
      url: getAssetSkillMarkerIconUrl(skillType),
    });
  }

  return references;
}

function addReferencedRuntimeAsset(references, reference) {
  if (!reference.url || typeof reference.url !== 'string') {
    errors.push(`Missing runtime asset URL for ${reference.kind} ${reference.id}`);
    return;
  }

  const relativePath = getRuntimeAssetRelativePath(reference.url);

  if (!relativePath) {
    errors.push(`Runtime asset URL for ${reference.kind} ${reference.id} must start with ${runtimeAssetUrlPrefix}: ${reference.url}`);
    return;
  }

  if (!imageExtensionPattern.test(relativePath)) {
    errors.push(`Runtime asset URL for ${reference.kind} ${reference.id} must point to an image file: ${reference.url}`);
    return;
  }

  if (!isRuntimeAssetDirectory(relativePath)) {
    errors.push(`Runtime asset URL for ${reference.kind} ${reference.id} must be in an approved runtime asset directory: ${reference.url}`);
    return;
  }

  const existingReference = references.get(relativePath);

  if (existingReference) {
    references.set(relativePath, {
      ...existingReference,
      id: `${existingReference.id}, ${reference.id}`,
      kind: existingReference.kind === reference.kind ? reference.kind : `${existingReference.kind}, ${reference.kind}`,
    });
    return;
  }

  references.set(relativePath, {
    ...reference,
    relativePath,
  });
}

function getRuntimeAssetRelativePath(url) {
  const path = url.startsWith('http://') || url.startsWith('https://')
    ? new URL(url).pathname
    : url;

  if (!path.startsWith(runtimeAssetUrlPrefix)) {
    return null;
  }

  try {
    return decodeURIComponent(path.slice(runtimeAssetUrlPrefix.length));
  } catch {
    return null;
  }
}

function resolveRuntimeAssetPath(root, relativePath) {
  const assetPath = resolve(root, relativePath);
  const pathFromRoot = relative(root, assetPath);

  if (
    pathFromRoot.startsWith('..') ||
    pathFromRoot.includes(`${sep}..${sep}`) ||
    !isRuntimeAssetDirectory(pathFromRoot)
  ) {
    return null;
  }

  return assetPath;
}

function isRuntimeAssetDirectory(relativePath) {
  return runtimeAssetDirectories.some((directory) => {
    return relativePath === directory || relativePath.startsWith(`${directory}/`) || relativePath.startsWith(`${directory}${sep}`);
  });
}
