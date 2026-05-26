import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const bundleDir = process.argv[2] ?? 'apps/worker/dist/worker-bundle';
const metafilePath = join(bundleDir, 'metafile.json');

assert(existsSync(bundleDir), `Worker bundle directory does not exist: ${bundleDir}`);
assert(existsSync(metafilePath), `Worker metafile does not exist: ${metafilePath}`);

const metafile = JSON.parse(readFileSync(metafilePath, 'utf8'));
const inputPaths = Object.keys(metafile.inputs ?? {});
const outputFiles = collectFiles(bundleDir);

const forbiddenInputs = [
  /node_modules\/\.pnpm\/react@/,
  /node_modules\/\.pnpm\/react-dom@/,
  /node_modules\/\.pnpm\/html-to-image@/,
  /node_modules\/\.pnpm\/playwright/,
  /node_modules\/\.pnpm\/jsdom@/,
  /apps\/web\/src\//,
  /apps\/web\/node_modules\//,
  /src\/io\/image-export/,
];

for (const input of inputPaths) {
  for (const pattern of forbiddenInputs) {
    assert(!pattern.test(input), `Worker bundle contains forbidden input: ${input}`);
  }
}

const forbiddenImageSources = /assets\/pokopia_image_sources\/.*\.(png|jpe?g|webp|gif|avif|svg)$/i;
for (const input of inputPaths) {
  assert(!forbiddenImageSources.test(input), `Worker bundle includes large image source input: ${input}`);
}

for (const file of outputFiles) {
  const relativePath = relative(bundleDir, file);
  assert(!/\.(png|jpe?g|webp|gif|avif|svg)$/i.test(file), `Worker bundle emitted image asset: ${relativePath}`);
}

console.log(`Worker bundle verification passed (${inputPaths.length} inputs, ${outputFiles.length} output files).`);

function collectFiles(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      return collectFiles(path);
    }

    return [path];
  });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
