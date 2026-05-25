import { existsSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const runtimeAssetDirectories = [
  'ability_icons',
  'decorative_item_portraits',
  'item_portraits',
  'pokemon_portraits',
  'specialty_icons',
];

const imageExtensionPattern = /\.(avif|gif|jpe?g|png|svg|webp)$/i;
const root = process.cwd();
const sourceRoot = resolve(root, getOptionValue('--source') ?? 'assets/pokopia_image_sources');
const outputRoot = resolve(root, getOptionValue('--output') ?? 'dist/assets/pokopia_image_sources');
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

if (errors.length > 0) {
  console.error(['Pokopia runtime asset verification failed:', ...errors.map((error) => `- ${error}`)].join('\n'));
  process.exit(1);
}

console.log('Pokopia runtime asset verification passed.');

function getOptionValue(optionName) {
  const optionIndex = process.argv.indexOf(optionName);
  const value = optionIndex >= 0 ? process.argv[optionIndex + 1] : undefined;

  return value && !value.startsWith('--') ? value : undefined;
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
