import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distRoot = resolve(repoRoot, 'packages/scene-core/dist');
const fromSpecifierPattern = /(from\s+['"])(\.[^'"]+)(['"])/g;
const pokemonDeclarationPath = resolve(distRoot, 'domain/assets/pokemon.d.ts');
const pokemonDataPath = resolve(repoRoot, '../pokopia-data/dist/data/pokemon.json');

for (const declarationFile of listDeclarationFiles(distRoot)) {
  const source = readFileSync(declarationFile, 'utf8');
  const nextSource = source.replace(fromSpecifierPattern, (match, prefix, specifier, suffix) => {
    return `${prefix}${toNodeNextSpecifier(declarationFile, specifier)}${suffix}`;
  });

  if (nextSource !== source) {
    writeFileSync(declarationFile, nextSource);
  }
}

if (existsSync(pokemonDeclarationPath)) {
  const source = readFileSync(pokemonDeclarationPath, 'utf8');
  const pokemonData = JSON.parse(readFileSync(pokemonDataPath, 'utf8'));
  const pokemonKeyUnion = pokemonData.pokemon.map((pokemon) => JSON.stringify(pokemon.key)).join(' | ');
  const nextSource = source.replace(
    "import { pokemonData } from 'pokopia-data';\nexport type PokemonKey = (typeof pokemonData.pokemon)[number]['key'];",
    `export type PokemonKey = ${pokemonKeyUnion};`,
  );

  if (nextSource !== source) {
    writeFileSync(pokemonDeclarationPath, nextSource);
  }
}

function listDeclarationFiles(root) {
  const files = [];

  for (const entry of readdirSync(root)) {
    const entryPath = resolve(root, entry);
    const entryStat = statSync(entryPath);

    if (entryStat.isDirectory()) {
      files.push(...listDeclarationFiles(entryPath));
      continue;
    }

    if (entryPath.endsWith('.d.ts')) {
      files.push(entryPath);
    }
  }

  return files;
}

function toNodeNextSpecifier(declarationFile, specifier) {
  if (/\.(?:js|mjs|cjs|json)$/.test(specifier)) {
    return specifier;
  }

  const specifierTarget = resolve(dirname(declarationFile), specifier);

  if (existsSync(`${specifierTarget}.d.ts`)) {
    return `${specifier}.js`;
  }

  if (existsSync(resolve(specifierTarget, 'index.d.ts'))) {
    return `${specifier.replace(/\/$/, '')}/index.js`;
  }

  return specifier;
}
