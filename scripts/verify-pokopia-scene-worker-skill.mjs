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
assert(exampleText.includes('validate_scene_document'), 'Examples must cover validate scene workflow.');
assert(exampleText.includes('summarize_scene_export'), 'Examples must cover summarize export workflow.');
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

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
