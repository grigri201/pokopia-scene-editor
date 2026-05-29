import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { basename, join } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const skillRoot = join(root, '.agents/skills/pokopia-scene-worker');
const skillPath = join(skillRoot, 'SKILL.md');
const examplesRoot = join(skillRoot, 'examples');
const forbiddenAuxiliaryFiles = new Set([
  'README.md',
  'INSTALLATION_GUIDE.md',
  'QUICK_REFERENCE.md',
  'CHANGELOG.md',
]);

const skill = read(skillPath);
assert(/^---\n[\s\S]*?\n---/.test(skill), 'SKILL.md must include YAML frontmatter.');
assert(/name:\s*pokopia-scene-worker/.test(skill), 'SKILL.md frontmatter must name the skill.');
assert(/description:\s*.+MCP/.test(skill), 'SKILL.md description must mention MCP.');
assert(skill.includes('structuredContent'), 'SKILL.md must instruct agents to use MCP structuredContent.');
assert(skill.includes('structuredContent.dimensions'), 'SKILL.md must instruct agents to use MCP structuredContent.dimensions.');
assert(skill.includes('Footprint') || skill.includes('footprint'), 'SKILL.md must mention footprint handling.');
assert(skill.includes('15x15') && skill.includes('17x17'), 'SKILL.md must describe the current default 15x15/17x17 dimensions.');
assert(skill.includes('5x5') && skill.includes('7x7'), 'SKILL.md must describe the legacy 5x5/7x7 dimensions.');

for (const tool of [
  'generate_scene_document',
  'validate_scene_document',
  'recover_scene_document',
  'summarize_scene_export',
  'search_pokopia_assets',
]) {
  assert(skill.includes(tool), `SKILL.md must mention ${tool}.`);
}

const examples = readdirSync(examplesRoot).filter((file) => file.endsWith('.md')).sort();
assert(examples.length >= 3, 'Skill must include at least three markdown examples.');

for (const file of collectFiles(skillRoot)) {
  assert(
    !forbiddenAuxiliaryFiles.has(basename(file)),
    `Skill must not include auxiliary documentation file: ${file}`,
  );
}

const exampleText = examples.map((file) => read(join(examplesRoot, file))).join('\n');
const validateSceneExample = read(join(examplesRoot, 'validate-scene.md'));
const summarizeExportExample = read(join(examplesRoot, 'summarize-export.md'));
const workflowReference = read(join(skillRoot, 'references/workflows.md'));
const skillMarkdown = collectMarkdown(skillRoot).map((file) => read(file)).join('\n');
assert(exampleText.includes('validate_scene_document'), 'Examples must cover validate scene workflow.');
assert(exampleText.includes('summarize_scene_export'), 'Examples must cover summarize export workflow.');
assert(
  summarizeExportExample.includes('structuredContent.data.summary.layers[].notes'),
  'Summarize export example must require layer notes from summary.layers[].notes.',
);
assert(
  workflowReference.includes('structuredContent.data.summary.layers[].notes'),
  'Workflow reference must require layer notes from summary.layers[].notes.',
);
assert(exampleText.includes('effectiveFootprint'), 'Examples must require export summaries to preserve effectiveFootprint.');
assert(exampleText.includes('occupiedCells'), 'Examples must require export summaries to preserve occupiedCells.');
assert(exampleText.includes('blockingCells'), 'Examples must require export summaries to preserve blockingCells.');
assert(exampleText.includes('conflictType'), 'Examples must require validation workflows to preserve footprint conflictType.');
assert(exampleText.includes('structuredContent.dimensions'), 'Examples must require workflows to preserve structuredContent.dimensions.');
assert(skillMarkdown.includes('sceneSize'), 'Skill markdown must mention sceneSize.');
assert(skillMarkdown.includes('canvasSize'), 'Skill markdown must mention canvasSize.');
assert(skillMarkdown.includes('outerPadding'), 'Skill markdown must mention outerPadding.');
assert(skillMarkdown.includes('classification'), 'Skill markdown must mention dimension classification.');
assert(validateSceneExample.includes('classification'), 'Validate scene example must require dimension classification.');
assert(skillMarkdown.includes('15x15') && skillMarkdown.includes('17x17'), 'Skill markdown must mention current 15x15/17x17 dimensions.');
assert(skillMarkdown.includes('5x5') && skillMarkdown.includes('7x7'), 'Skill markdown must mention legacy 5x5/7x7 dimensions.');
assert(skillMarkdown.includes('6..17'), 'Skill markdown must mention selectable 6..17 canvas dimensions.');
assert(
  exampleText.includes('search_pokopia_assets') && exampleText.includes('generate_scene_document'),
  'Examples must cover asset search and default scene generation workflow.',
);

const allSkillFiles = collectMarkdown(skillRoot).map((file) => [file, read(file)]);
for (const [file, text] of allSkillFiles) {
  assert(!/from ['"]@pokopia-scene-editor\/scene-core['"]/.test(text), `${file} must not import scene-core.`);
  assert(!/sceneDocumentV1Schema\s*=/.test(text), `${file} must not define a copied scene schema.`);
  assert(!/assetCatalog\s*=/.test(text), `${file} must not define a copied asset catalog.`);
  assert(!/function\s+buildImageExportSummary/.test(text), `${file} must not define export-summary logic.`);
  assert(!/(?:function|const|let|var)\s+buildSceneOccupancy\b/.test(text), `${file} must not define occupancy logic.`);
  assert(!/(?:function|const|let|var)\s+getFootprintCells\b/.test(text), `${file} must not define footprint geometry.`);
  assert(!/(?:function|const|let|var)\s+(?:encodeSceneDocumentString|decodeSceneDocumentString|encodeCoordinate|decodeCoordinate|encodeDimensions|decodeDimensions)\b/.test(text), `${file} must not define codec logic.`);
  assert(!/(?:function|const|let|var)\s+(?:summarizeSceneDimensions|classifySceneDimensions|getSceneDimensions|dimensionsEqual|isSupportedSceneDimensions)\b/.test(text), `${file} must not define scene dimension helper logic.`);
  assert(!/(?:const|let|var)\s+assetFootprintOverride\s*=/.test(text), `${file} must not copy footprint overrides.`);
  assert(!/(?:const|let|var)\s+(?:defaultSceneDimensions|legacySceneDimensions)\s*=/.test(text), `${file} must not copy scene dimension constants.`);
  assert(!/"wooden-bench"\s*:\s*\{\s*"?length"?\s*:/.test(text), `${file} must not copy fixture footprint tables.`);
  assert(!/\b(?:encodeSceneDocumentString|decodeSceneDocumentString|scene-string-codec)\b/.test(text), `${file} must not copy or invoke codec helpers inside the skill.`);
  assert(!hasBadDefault7x7Claim(text), `${file} must not describe 7x7 as the default dimensions.`);
  assert(!hasBadCurrent7x7Claim(text), `${file} must not describe 7x7 as the current dimensions.`);
  assert(!/\b(?:x|y)\s*<\s*7\b/.test(text), `${file} must not hardcode 7x7 coordinate bounds.`);
  assert(!/\b49\s+cells\b/i.test(text), `${file} must not hardcode default canvas cell counts.`);
}

console.log(`Pokopia Scene Worker skill verification passed (${examples.length} examples).`);

function collectMarkdown(directory) {
  return collectFiles(directory).filter((path) => path.endsWith('.md'));
}

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

function read(path) {
  return readFileSync(path, 'utf8');
}

function hasBadDefault7x7Claim(text) {
  return text.split(/\r?\n/).some((line) => {
    if (isExplicit7x7Negation(line) || isCorrectDefaultLegacyContrast(line)) {
      return false;
    }

    return /\bdefault\b[^\n.]{0,80}\b7x7\b/i.test(line) || /\b7x7\b[^\n.]{0,80}\bdefault\b/i.test(line);
  });
}

function hasBadCurrent7x7Claim(text) {
  return text.split(/\r?\n/).some((line) => {
    if (isExplicit7x7Negation(line) || isCorrectDefaultLegacyContrast(line)) {
      return false;
    }

    return /\bcurrent\b[^\n.]{0,80}\b7x7\b/i.test(line);
  });
}

function isCorrectDefaultLegacyContrast(line) {
  return (
    /\bdefault\b[^\n.]{0,80}\b15x15\b[^\n.]{0,80}\b17x17\b/i.test(line) &&
    /\blegacy\b[^\n.]{0,80}\b5x5\b[^\n.]{0,80}\b7x7\b/i.test(line)
  );
}

function isExplicit7x7Negation(line) {
  return (
    /\b(?:do not|don't|never)\b[^\n.]{0,80}\b7x7\b[^\n.]{0,80}\b(?:default|current)\b/i.test(line) ||
    /\b(?:do not|don't|never)\b[^\n.]{0,80}\b(?:default|current)\b[^\n.]{0,80}\b7x7\b/i.test(line) ||
    /\b7x7\b[^\n.]{0,80}\b(?:is|as|be|being)\b[^\n.]{0,20}\b(?:not|never)\b[^\n.]{0,80}\b(?:default|current)\b/i.test(line)
  );
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
