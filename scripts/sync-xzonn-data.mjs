import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const checkOnly = process.argv.includes('--check');
const xzonnRoot = resolve(projectRoot, 'assets/pokopia_data_sources/xzonn');
const xzonnReadmePath = resolve(xzonnRoot, 'README.md');
const assetSourcePath = resolve(projectRoot, 'packages/scene-core/src/domain/assets/source-placeable-items.ts');
const translationSourcePath = resolve(projectRoot, 'packages/scene-core/src/domain/assets/source-placeable-item-translations.ts');
const pokemonPortraitSourcePath = resolve(projectRoot, 'packages/scene-core/src/domain/assets/source-pokemon-portraits.ts');
const pokemonPreferenceSourcePath = resolve(projectRoot, 'packages/scene-core/src/domain/assets/source-pokemon-preferences.ts');
const habitatMatchingSourcePath = resolve(projectRoot, 'packages/scene-core/src/domain/assets/source-habitat-matching-items.ts');
const auditReportPath = resolve(projectRoot, '_bmad-output/implementation-artifacts/xzonn-data-audit.md');

const itemText = readText(resolve(xzonnRoot, 'item.txt'));
const pokemonText = readText(resolve(xzonnRoot, 'pokemon.txt'));
const habitatText = readText(resolve(xzonnRoot, 'habitat.txt'));

const itemRows = parseTsv(itemText, 'item.txt', ['编号', '哈希值', '中文名', '日文名', '英文名', '图标', '分类', '标签', '获得方式', '交易价值', '喜欢的类别']).map((row) => ({
  number: toRequiredNumber(row['编号'], '编号', 'item.txt'),
  hash: row['哈希值'],
  chineseName: row['中文名'],
  japaneseName: row['日文名'],
  englishName: row['英文名'],
  icon: toRequiredNumber(row['图标'], '图标', 'item.txt'),
  category: row['分类'],
  tags: splitPipe(row['标签']),
  acquisition: row['获得方式'],
  tradeValue: row['交易价值'] ? toRequiredNumber(row['交易价值'], '交易价值', 'item.txt') : null,
  preferenceTerms: splitPipe(row['喜欢的类别']),
}));
const pokemonRows = parseTsv(pokemonText, 'pokemon.txt', ['编号', '形态编号', '中文名', '形态名', '日文名', '英文名', '属性1', '属性2', '特长', '时间', '天气', '栖息地', '喜欢的环境', '喜欢的东西', '分类', '图鉴说明', '身高', '体重']).map((row) => ({
  number: toRequiredNumber(row['编号'], '编号', 'pokemon.txt'),
  formNumber: toRequiredNumber(row['形态编号'], '形态编号', 'pokemon.txt'),
  chineseName: row['中文名'],
  formName: row['形态名'],
  japaneseName: row['日文名'],
  englishName: row['英文名'],
  skills: splitPipe(row['特长']),
  habitatIds: splitPipe(row['栖息地']),
  preferenceTerms: splitPipe(row['喜欢的东西']).filter((term) => term !== '无'),
}));
const habitatRows = parseTsv(habitatText, 'habitat.txt', ['编号', '中文名', '日文名', '英文名', '图鉴说明', '详情', '宝可梦']);
assertUniqueNumbers(itemRows.map((row) => row.number), 'item.txt 编号');
assertUniquePokemonRows(pokemonRows);
assertUniqueNumbers(habitatRows.map((row) => toRequiredNumber(row['编号'], '编号', 'habitat.txt')), 'habitat.txt 编号');
const normalItemRows = itemRows.filter((row) => row.number < 10000);

const localItems = parseExportedArray(readText(assetSourcePath), 'sourcePlaceableAssetItems');
const currentTranslations = parseExportedObject(readText(translationSourcePath), 'sourcePlaceableAssetNameTranslations');
const pokemonPortraits = parseExportedArray(readText(pokemonPortraitSourcePath), 'sourcePokemonPortraits');
const currentPokemonPreferenceText = readText(pokemonPreferenceSourcePath);
const currentItemPreferenceTerms = new Map(
  parseExportedArray(currentPokemonPreferenceText, 'sourceItemPreferenceTerms').map((entry) => [
    entry.slug,
    entry.preferenceTerms,
  ]),
);

const itemRowsByExactEnglish = groupBy(normalItemRows.filter((row) => row.englishName), (row) => normalizeEnglish(row.englishName));
const pokemonRowsByExactEnglish = groupBy(pokemonRows.filter((row) => row.englishName), (row) => normalizeEnglish(row.englishName));

const itemMatches = new Map();
const unmatchedByExactEnglish = [];
const interiorWallpaperMatches = [];

for (const item of localItems) {
  const exactMatch = getUnique(itemRowsByExactEnglish.get(normalizeEnglish(item.name)));

  if (exactMatch) {
    itemMatches.set(item.slug, { row: exactMatch, matchType: 'exact-english' });
    continue;
  }

  const wallpaperName = getInteriorWallpaperName(item.name);
  const wallpaperMatch = wallpaperName ? getUnique(itemRowsByExactEnglish.get(normalizeEnglish(wallpaperName))) : null;

  if (wallpaperMatch) {
    itemMatches.set(item.slug, { row: wallpaperMatch, matchType: 'interior-wallpaper' });
    interiorWallpaperMatches.push({ item, row: wallpaperMatch });
  } else {
    unmatchedByExactEnglish.push(item);
  }
}

const matchedSourceNumberIds = new Set(
  [...itemMatches.values()].map(({ row }) => formatOfficialId(row.number)),
);
const usedOfficialIds = new Set(matchedSourceNumberIds);
const fallbackDisplayNumbers = new Map();
const fallbackDisplayNumberAllocations = [];
let nextFallbackDisplayNumber = 9001;

for (const item of localItems) {
  if (itemMatches.has(item.slug)) {
    continue;
  }

  const legacyOfficialId = formatOfficialId(item.id);

  if (!usedOfficialIds.has(legacyOfficialId)) {
    usedOfficialIds.add(legacyOfficialId);
    continue;
  }

  while (usedOfficialIds.has(String(nextFallbackDisplayNumber))) {
    nextFallbackDisplayNumber += 1;
  }

  fallbackDisplayNumbers.set(item.slug, nextFallbackDisplayNumber);
  fallbackDisplayNumberAllocations.push({
    slug: item.slug,
    name: item.name,
    legacyOfficialId,
    displayOfficialId: String(nextFallbackDisplayNumber),
    conflictsWith: findMatchedSlugBySourceNumber(legacyOfficialId),
  });
  usedOfficialIds.add(String(nextFallbackDisplayNumber));
  nextFallbackDisplayNumber += 1;
}

const generatedItems = localItems.map((item) => {
  const match = itemMatches.get(item.slug);
  const generated = {
    id: item.id,
    ...(match ? { sourceNumber: match.row.number } : {}),
    ...(fallbackDisplayNumbers.has(item.slug) ? { displayNumber: fallbackDisplayNumbers.get(item.slug) } : {}),
    name: item.name,
    slug: item.slug,
    menuCategory: item.menuCategory,
    ...(match ? { sourceCategory: match.row.category } : {}),
    tags: item.tags,
    ...(match && match.row.tags.length > 0 ? { sourceTags: match.row.tags } : {}),
    favoriteCategoryIds: item.favoriteCategoryIds,
    imageFileName: item.imageFileName,
  };

  return generated;
});

for (const item of generatedItems) {
  if (item.sourceNumber >= 10000) {
    throw new Error(`Habitat-only item row leaked into placeable source items: ${item.slug} uses ${item.sourceNumber}.`);
  }
}

const generatedTranslations = Object.fromEntries(
  localItems.map((item) => {
    const match = itemMatches.get(item.slug);
    const fallbackName = currentTranslations[item.id] ?? item.name;

    return [item.id, match?.row.chineseName || fallbackName];
  }),
);

const explicitPokemonRowByKey = {
  'chef-dente': { number: 192, formNumber: 0, chineseName: '藏饱栗鼠', formName: '厨师', englishName: 'Greedent' },
  'dj-rotom': { number: 182, formNumber: 0, chineseName: '洛托姆', formName: '立体音响洛托姆', englishName: 'Rotom' },
  'gastrodon-east-sea': { number: 60, formNumber: 1, chineseName: '海兔兽', formName: '东海', englishName: 'Gastrodon' },
  'gastrodon-west-sea': { number: 60, formNumber: 0, chineseName: '海兔兽', formName: '西海', englishName: 'Gastrodon' },
  mosslax: { number: 108, formNumber: 0, chineseName: '卡比兽', formName: '萌苔', englishName: 'Snorlax' },
  peakychu: { number: 79, formNumber: 0, chineseName: '皮卡丘', formName: '浅色', englishName: 'Pikachu' },
  pikachu: { number: 79, formNumber: 1, chineseName: '皮卡丘', formName: '', englishName: 'Pikachu' },
  'prof-tangrowth': { number: 41, formNumber: 0, chineseName: '巨蔓藤', formName: '博士', englishName: 'Tangrowth' },
  'shellos-east-sea': { number: 59, formNumber: 1, chineseName: '无壳海兔', formName: '东海', englishName: 'Shellos' },
  'shellos-west-sea': { number: 59, formNumber: 0, chineseName: '无壳海兔', formName: '西海', englishName: 'Shellos' },
  smearguru: { number: 119, formNumber: 0, chineseName: '图图犬', formName: '彩绘匠', englishName: 'Smeargle' },
  snorlax: { number: 108, formNumber: 1, chineseName: '卡比兽', formName: '', englishName: 'Snorlax' },
  'tatsugiri-curly-form': { number: 145, formNumber: 0, chineseName: '米立龙', formName: '上弓姿势', englishName: 'Tatsugiri' },
  'tatsugiri-droopy-form': { number: 145, formNumber: 1, chineseName: '米立龙', formName: '下垂姿势', englishName: 'Tatsugiri' },
  'tatsugiri-stretchy-form': { number: 145, formNumber: 2, chineseName: '米立龙', formName: '平挺姿势', englishName: 'Tatsugiri' },
  'toxtricity-amped-form': { number: 197, formNumber: 0, chineseName: '颤弦蝾螈', formName: '高调的样子', englishName: 'Toxtricity' },
  'toxtricity-low-key-form': { number: 197, formNumber: 1, chineseName: '颤弦蝾螈', formName: '低调的样子', englishName: 'Toxtricity' },
  tangrowth: { number: 41, formNumber: 1, chineseName: '巨蔓藤', formName: '', englishName: 'Tangrowth' },
};

assertLocalPokemonPortrait('peakychu', { name: '浅浅丘', englishName: 'Peakychu' });

const pokemonMatches = new Map();
const pokemonUnmatched = [];

for (const pokemon of pokemonPortraits) {
  const row = findPokemonRow(pokemon);

  if (row) {
    pokemonMatches.set(pokemon.key, row);
  } else {
    pokemonUnmatched.push(pokemon);
  }
}

if (pokemonUnmatched.length > 0) {
  throw new Error(`Unable to match Pokemon rows: ${pokemonUnmatched.map((pokemon) => pokemon.key).join(', ')}`);
}

const generatedPokemonPreferences = pokemonPortraits.map((pokemon) => ({
  key: pokemon.key,
  preferenceTerms: pokemonMatches.get(pokemon.key).preferenceTerms,
}));
const generatedItemPreferenceTerms = localItems
  .map((item) => {
    const match = itemMatches.get(item.slug);
    const preferenceTerms = match ? match.row.preferenceTerms : currentItemPreferenceTerms.get(item.slug) ?? [];

    return {
      slug: item.slug,
      preferenceTerms,
    };
  })
  .filter((entry) => entry.preferenceTerms.length > 0);

const habitatMatchingRows = itemRows.filter((row) => row.number >= 10001 && row.number <= 10056);

if (habitatMatchingRows.length !== 56) {
  throw new Error(`Expected 56 habitat matching item rows, found ${habitatMatchingRows.length}.`);
}
assertExactNumberSet(
  habitatMatchingRows.map((row) => row.number),
  Array.from({ length: 56 }, (_, index) => 10001 + index),
  'habitat matching item rows',
);

if (habitatRows.length !== 213) {
  throw new Error(`Expected 213 habitat rows, found ${habitatRows.length}.`);
}

const generatedFiles = new Map([
  [xzonnReadmePath, formatXzonnReadme()],
  [assetSourcePath, formatPlaceableItemsSource(generatedItems)],
  [translationSourcePath, formatTranslationsSource(generatedTranslations)],
  [pokemonPreferenceSourcePath, formatPokemonPreferencesSource(generatedPokemonPreferences, generatedItemPreferenceTerms)],
  [habitatMatchingSourcePath, formatHabitatMatchingItemsSource(habitatMatchingRows)],
  [auditReportPath, formatAuditReport()],
]);

let stale = false;

for (const [filePath, content] of generatedFiles) {
  const existing = existsSync(filePath) ? readText(filePath) : '';

  if (existing !== content) {
    stale = true;

    if (checkOnly) {
      console.error(`Stale generated file: ${relativePath(filePath)}`);
    } else {
      writeFileSync(filePath, content);
    }
  }
}

if (checkOnly && stale) {
  console.error('Run `pnpm run data:xzonn:sync` to update generated Xzonn data snapshots.');
  process.exit(1);
}

console.log(
  checkOnly
    ? 'Xzonn generated data snapshots are current.'
    : `Xzonn data sync complete (${itemMatches.size} item matches, ${localItems.length - itemMatches.size} local fallback items).`,
);

function formatXzonnReadme() {
  return `# Xzonn PokemonPokopiaDatabase Snapshot\n\n` +
    `This directory contains pinned text snapshots from \`Xzonn/PokemonPokopiaDatabase\`.\n\n` +
    `Upstream:\n\n` +
    `- Repository: https://github.com/Xzonn/PokemonPokopiaDatabase\n` +
    `- Commit: \`579689ce05e6239b732141d5adee3b98922f602c\`\n` +
    `- Commit date: 2026-04-21T00:48:52+08:00\n` +
    `- Commit subject: \`fix: Add robots.txt\`\n` +
    `- Synced for: Story 13.7 Xzonn data baseline\n\n` +
    `Files:\n\n` +
    `| File | Rows | SHA-256 |\n` +
    `| --- | ---: | --- |\n` +
    `| \`item.txt\` | ${itemRows.length} data rows | \`${sha256(itemText)}\` |\n` +
    `| \`pokemon.txt\` | ${pokemonRows.length} data rows | \`${sha256(pokemonText)}\` |\n` +
    `| \`habitat.txt\` | ${habitatRows.length} data rows | \`${sha256(habitatText)}\` |\n\n` +
    `\`item.txt\` rows \`10001-10056\` are habitat generalized matching data. They are valid source data for future habitat matching, but must not be emitted into the current placeable asset catalog, Asset Picker, export material list, or ordinary asset search.\n\n` +
    `\`habitat.txt\` is pinned for future use. Current runtime code must not add habitat UI, \`SceneDocument\` fields, or Web catalog consumption unless a later story explicitly enables it.\n`;
}

function formatPlaceableItemsSource(items) {
  return `// Generated from assets/pokopia_data_sources/xzonn/item.txt and the existing local image snapshot.\n` +
    `// Run \`pnpm run data:xzonn:sync\` after updating Xzonn or local image source data.\n\n` +
    `export interface SourcePlaceableAssetItem {\n` +
    `  readonly id: number;\n` +
    `  readonly sourceNumber?: number;\n` +
    `  readonly displayNumber?: number;\n` +
    `  readonly name: string;\n` +
    `  readonly slug: string;\n` +
    `  readonly menuCategory: string;\n` +
    `  readonly sourceCategory?: string;\n` +
    `  readonly tags: readonly string[];\n` +
    `  readonly sourceTags?: readonly string[];\n` +
    `  readonly favoriteCategoryIds: readonly number[];\n` +
    `  readonly imageFileName: string;\n` +
    `}\n\n` +
    `export const sourcePlaceableAssetItems = [\n` +
    items.map((item) => `  ${JSON.stringify(item)},`).join('\n') +
    `\n] as const satisfies readonly SourcePlaceableAssetItem[];\n`;
}

function formatTranslationsSource(translations) {
  const lines = Object.entries(translations).map(([id, name]) => `  ${id}: ${JSON.stringify(name)},`);

  return `// Generated from assets/pokopia_data_sources/xzonn/item.txt with local fallback names for unmatched source items.\n` +
    `// Run \`pnpm run data:xzonn:sync\` after updating Xzonn or local image source data.\n\n` +
    `export const sourcePlaceableAssetNameTranslations: Readonly<Record<number, string>> = {\n` +
    lines.join('\n') +
    `\n};\n`;
}

function formatPokemonPreferencesSource(pokemonPreferences, itemPreferenceTerms) {
  return `// Generated from assets/pokopia_data_sources/xzonn/pokemon.txt and item.txt.\n` +
    `// Run \`pnpm run data:xzonn:sync\` after updating Xzonn or local image source data.\n\n` +
    `export const sourcePokemonPreferences = [\n` +
    pokemonPreferences.map((entry) => `  ${JSON.stringify(entry)},`).join('\n') +
    `\n] as const;\n\n` +
    `export const sourceItemPreferenceTerms = [\n` +
    itemPreferenceTerms.map((entry) => `  ${JSON.stringify(entry)},`).join('\n') +
    `\n] as const;\n`;
}

function formatHabitatMatchingItemsSource(rows) {
  const entries = rows.map((row) => ({
    sourceNumber: row.number,
    chineseName: row.chineseName,
    japaneseName: row.japaneseName,
    englishName: row.englishName,
    icon: row.icon,
    tags: row.tags,
    preferenceTerms: row.preferenceTerms,
  }));

  return `// Generated from assets/pokopia_data_sources/xzonn/item.txt rows 10001-10056.\n` +
    `// These rows are source data for future habitat matching and must not enter the current asset catalog.\n` +
    `// Run \`pnpm run data:xzonn:sync\` after updating Xzonn data.\n\n` +
    `export interface SourceHabitatMatchingItem {\n` +
    `  readonly sourceNumber: number;\n` +
    `  readonly chineseName: string;\n` +
    `  readonly japaneseName: string;\n` +
    `  readonly englishName: string;\n` +
    `  readonly icon: number;\n` +
    `  readonly tags: readonly string[];\n` +
    `  readonly preferenceTerms: readonly string[];\n` +
    `}\n\n` +
    `export const sourceHabitatMatchingItems = [\n` +
    entries.map((entry) => `  ${JSON.stringify(entry)},`).join('\n') +
    `\n] as const satisfies readonly SourceHabitatMatchingItem[];\n`;
}

function formatAuditReport() {
  const exactMatches = [...itemMatches.values()].filter((match) => match.matchType === 'exact-english').length;
  const categoryCounts = countBy(itemRows, (row) => row.category || '(empty)');
  const normalSourceRows = itemRows.filter((row) => row.number < 10000);
  const fallbackItems = localItems.filter((item) => !itemMatches.has(item.slug));
  const explicitPokemonKeys = new Set(Object.keys(explicitPokemonRowByKey));
  const explicitPokemonLines = Object.entries(explicitPokemonRowByKey).map(([key, expected]) => {
    const localPokemon = pokemonPortraits.find((pokemon) => pokemon.key === key);
    const row = pokemonRows.find((pokemon) => pokemon.number === expected.number && pokemon.formNumber === expected.formNumber);

    return `| \`${key}\` | ${escapeTable(localPokemon?.englishName ?? '')} | ${expected.number} | ${expected.formNumber} | ${escapeTable(row?.chineseName ?? '')} | ${escapeTable(row?.formName ?? '')} | ${escapeTable(row?.englishName ?? '')} |`;
  });
  const fallbackLines = fallbackItems.map((item) => {
    const allocation = fallbackDisplayNumberAllocations.find((entry) => entry.slug === item.slug);
    const allocationText = allocation ? `, display fallback ${allocation.displayOfficialId} because legacy ${allocation.legacyOfficialId} conflicts with ${allocation.conflictsWith}` : '';

    return `| ${item.id} | \`${item.slug}\` | ${escapeTable(item.name)} | ${escapeTable(currentTranslations[item.id] ?? '')} | ${escapeTable(item.menuCategory)}${allocationText} |`;
  });
  const interiorLines = interiorWallpaperMatches.map(({ item, row }) =>
    `| ${item.id} | \`${item.slug}\` | ${escapeTable(item.name)} | ${row.number} | ${escapeTable(row.englishName)} | ${escapeTable(row.chineseName)} |`,
  );

  return `# Xzonn Data Sync Audit\n\n` +
    `Generated by \`pnpm run data:xzonn:sync\`.\n\n` +
    `## Source Snapshot\n\n` +
    `- Upstream commit: \`579689ce05e6239b732141d5adee3b98922f602c\`\n` +
    `- \`item.txt\`: ${itemRows.length} data rows, SHA-256 \`${sha256(readText(resolve(xzonnRoot, 'item.txt')))}\`\n` +
    `- \`pokemon.txt\`: ${pokemonRows.length} data rows, SHA-256 \`${sha256(readText(resolve(xzonnRoot, 'pokemon.txt')))}\`\n` +
    `- \`habitat.txt\`: ${habitatRows.length} data rows, SHA-256 \`${sha256(readText(resolve(xzonnRoot, 'habitat.txt')))}\`\n\n` +
    `## Item Match Summary\n\n` +
    `- Local source items: ${localItems.length}\n` +
    `- Xzonn item rows: ${itemRows.length}\n` +
    `- Xzonn normal rows (source number < 10000): ${normalSourceRows.length}\n` +
    `- Exact English matches: ${exactMatches}\n` +
    `- Interior/wallpaper confirmed matches: ${interiorWallpaperMatches.length}\n` +
    `- Local fallback items: ${fallbackItems.length}\n` +
    `- Habitat generalized matching rows: ${habitatMatchingRows.length}\n\n` +
    `## Pokemon Match Summary\n\n` +
    `- Local Pokemon portrait rows: ${pokemonPortraits.length}\n` +
    `- Xzonn pokemon rows: ${pokemonRows.length}\n` +
    `- Exact English matches: ${pokemonPortraits.filter((pokemon) => !explicitPokemonKeys.has(pokemon.key)).length}\n` +
    `- Explicit special/duplicate-form matches: ${explicitPokemonLines.length}\n` +
    `- Unmatched Pokemon: None\n` +
    `- Possible Xzonn candidates for unmatched Pokemon: None; all local Pokemon resolved uniquely.\n\n` +
    `## Explicit Pokemon Row Matches\n\n` +
    `These entries are pinned because the local key is a special form, local-only name, or a duplicate English-name family that needs a specific Xzonn form row.\n\n` +
    `| Local key | Local English name | Xzonn number | Xzonn form | Xzonn Chinese name | Xzonn form name | Xzonn English name |\n` +
    `| --- | --- | ---: | ---: | --- | --- | --- |\n` +
    explicitPokemonLines.join('\n') +
    `\n\n` +
    `## Xzonn Category Counts\n\n` +
    [...categoryCounts.entries()].sort((left, right) => left[0].localeCompare(right[0], 'zh')).map(([category, count]) => `- ${category}: ${count}`).join('\n') +
    `\n\n## Local Fallback Items\n\n` +
    `These items are kept from local data because Xzonn does not provide a unique confirmed equivalent for the current asset catalog. Non-Interior entries are intentionally local-first.\n\n` +
    `| Legacy id | Slug | English name | Local Chinese name | Local category / note |\n` +
    `| ---: | --- | --- | --- | --- |\n` +
    fallbackLines.join('\n') +
    `\n\n## Interior/Wallpaper Matches\n\n` +
    `These local \`(interior)\` entries are confirmed against Xzonn \`(wallpaper)\` rows.\n\n` +
    `| Legacy id | Slug | Local English name | Xzonn id | Xzonn English name | Xzonn Chinese name |\n` +
    `| ---: | --- | --- | ---: | --- | --- |\n` +
    interiorLines.join('\n') +
    `\n\n## Legacy Official Id Aliases\n\n` +
    `Scene short string decode must accept legacy official ids. If the new display official id differs from the legacy id, \`catalog.ts\` maps the legacy id back to the same stable \`assetId\`.\n\n` +
    `Fallback display id allocations caused by Xzonn id conflicts:\n\n` +
    (fallbackDisplayNumberAllocations.length > 0
      ? fallbackDisplayNumberAllocations.map((entry) => `- \`${entry.slug}\`: legacy \`${entry.legacyOfficialId}\`, display \`${entry.displayOfficialId}\`, conflicts with \`${entry.conflictsWith}\`.`).join('\n')
      : '- None') +
    `\n`;
}

function findPokemonRow(pokemon) {
  const explicit = explicitPokemonRowByKey[pokemon.key];

  if (explicit) {
    const row = pokemonRows.find((candidate) => candidate.number === explicit.number && candidate.formNumber === explicit.formNumber) ?? null;

    if (row) {
      assertPinnedPokemonRow(pokemon.key, row, explicit);
    }

    return row;
  }

  return getUnique(pokemonRowsByExactEnglish.get(normalizeEnglish(pokemon.englishName)));
}

function findMatchedSlugBySourceNumber(officialId) {
  for (const item of localItems) {
    const match = itemMatches.get(item.slug);

    if (match && formatOfficialId(match.row.number) === officialId) {
      return item.slug;
    }
  }

  return 'unknown';
}

function getInteriorWallpaperName(name) {
  return /\(interior\)$/i.test(name) ? name.replace(/\s*\(interior\)$/i, ' (wallpaper)') : null;
}

function parseTsv(text, sourceName, requiredHeaders) {
  const [headerLine, ...lines] = text.replace(/(?:\r?\n)+$/, '').split(/\r?\n/);
  const headers = headerLine.split('\t');
  const headerSet = new Set(headers);

  if (headerSet.size !== headers.length) {
    throw new Error(`${sourceName} contains duplicate headers.`);
  }

  for (const header of requiredHeaders) {
    if (!headerSet.has(header)) {
      throw new Error(`${sourceName} is missing required header: ${header}`);
    }
  }

  return lines.map((line, index) => {
    const columns = line.split('\t');

    if (columns.length !== headers.length) {
      throw new Error(`${sourceName} row ${index + 2} has ${columns.length} columns; expected ${headers.length}.`);
    }

    return Object.fromEntries(headers.map((header, index) => [header, columns[index] ?? '']));
  });
}

function toRequiredNumber(value, fieldName, sourceName) {
  if (!value) {
    throw new Error(`${sourceName} has empty numeric field: ${fieldName}`);
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new Error(`${sourceName} has invalid numeric field ${fieldName}: ${value}`);
  }

  return parsed;
}

function assertUniqueNumbers(values, label) {
  const seen = new Set();

  for (const value of values) {
    if (seen.has(value)) {
      throw new Error(`Duplicate ${label}: ${value}`);
    }

    seen.add(value);
  }
}

function assertUniquePokemonRows(rows) {
  const seen = new Set();

  for (const row of rows) {
    const key = `${row.number}:${row.formNumber}`;

    if (seen.has(key)) {
      throw new Error(`Duplicate pokemon.txt row: ${key}`);
    }

    seen.add(key);
  }
}

function assertExactNumberSet(actualValues, expectedValues, label) {
  const actual = [...new Set(actualValues)].sort((left, right) => left - right);
  const expected = [...expectedValues].sort((left, right) => left - right);

  if (actual.length !== expected.length || actual.some((value, index) => value !== expected[index])) {
    throw new Error(`Unexpected ${label}: expected ${expected.join(', ')}, received ${actual.join(', ')}.`);
  }
}

function assertPinnedPokemonRow(key, row, expected) {
  for (const field of ['chineseName', 'formName', 'englishName']) {
    if (row[field] !== expected[field]) {
      throw new Error(
        `Pinned Pokemon row drifted for ${key}: expected ${field}=${JSON.stringify(expected[field])}, received ${JSON.stringify(row[field])}.`,
      );
    }
  }
}

function assertLocalPokemonPortrait(key, expected) {
  const portrait = pokemonPortraits.find((pokemon) => pokemon.key === key);

  if (!portrait) {
    throw new Error(`Missing local Pokemon portrait row: ${key}`);
  }

  for (const field of ['name', 'englishName']) {
    if (portrait[field] !== expected[field]) {
      throw new Error(
        `Local Pokemon portrait drifted for ${key}: expected ${field}=${JSON.stringify(expected[field])}, received ${JSON.stringify(portrait[field])}.`,
      );
    }
  }
}

function parseExportedArray(text, exportName) {
  return JSON.parse(stripTrailingCommas(extractBalanced(text, `export const ${exportName}`, '[', ']')));
}

function parseExportedObject(text, exportName) {
  const source = extractBalanced(text, `export const ${exportName}`, '{', '}');

  return vm.runInNewContext(`(${source})`, Object.create(null));
}

function extractBalanced(text, marker, openChar, closeChar) {
  const markerIndex = text.indexOf(marker);

  if (markerIndex < 0) {
    throw new Error(`Unable to find ${marker}.`);
  }

  const start = text.indexOf(openChar, markerIndex);

  if (start < 0) {
    throw new Error(`Unable to find ${openChar} after ${marker}.`);
  }

  let depth = 0;
  let inString = false;
  let quote = '';
  let escaped = false;

  for (let index = start; index < text.length; index += 1) {
    const char = text[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        inString = false;
      }
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      inString = true;
      quote = char;
      continue;
    }

    if (char === openChar) {
      depth += 1;
    } else if (char === closeChar) {
      depth -= 1;

      if (depth === 0) {
        return text.slice(start, index + 1);
      }
    }
  }

  throw new Error(`Unable to find matching ${closeChar} for ${marker}.`);
}

function stripTrailingCommas(source) {
  return source.replace(/,\s*([}\]])/g, '$1');
}

function splitPipe(value) {
  return value ? value.split('|').map((entry) => entry.trim()).filter(Boolean) : [];
}

function normalizeEnglish(value) {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/pokémon/g, 'pokemon')
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function formatOfficialId(value) {
  return String(value).padStart(3, '0');
}

function groupBy(values, keyFn) {
  const groups = new Map();

  for (const value of values) {
    const key = keyFn(value);
    const group = groups.get(key);

    if (group) {
      group.push(value);
    } else {
      groups.set(key, [value]);
    }
  }

  return groups;
}

function countBy(values, keyFn) {
  const counts = new Map();

  for (const value of values) {
    const key = keyFn(value);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return counts;
}

function getUnique(values) {
  return values?.length === 1 ? values[0] : null;
}

function readText(filePath) {
  return readFileSync(filePath, 'utf8');
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function escapeTable(value) {
  return String(value).replaceAll('|', '\\|');
}

function relativePath(filePath) {
  return filePath.slice(projectRoot.length + 1);
}
