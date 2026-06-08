import { describe, expect, it } from 'vitest';
import manifest from '../package.json';

declare global {
  interface ImportMeta {
    glob<T>(pattern: string, options: {
      eager: true;
      import: 'default';
      query: '?raw';
    }): Record<string, T>;
  }
}

interface PackageManifest {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

interface ForbiddenRuntimePattern {
  label: string;
  pattern: RegExp;
  stripStrings?: boolean;
}

const sourceModules = import.meta.glob<string>('./**/*.ts', {
  eager: true,
  import: 'default',
  query: '?raw',
});

const forbiddenPackageNamePattern = /(?:^|[/_-])(?:supabase|react|auth)(?:$|[/_-])/i;
const forbiddenImportSpecifierPattern = /(?:@supabase|supabase-js|react|\/auth\/|\/api\/|apps\/web|AuthProvider|AuthStatusControl)/i;
const forbiddenRuntimePatterns: readonly ForbiddenRuntimePattern[] = [
  { label: 'localStorage', pattern: /\blocalStorage\b/ },
  { label: 'sessionStorage', pattern: /\bsessionStorage\b/ },
  { label: 'indexedDB', pattern: /\bindexedDB\b/ },
  { label: 'window API', pattern: /\bwindow\s*\./, stripStrings: true },
  { label: 'document API', pattern: /\bdocument\s*\./, stripStrings: true },
  { label: 'navigator API', pattern: /\bnavigator\s*\./, stripStrings: true },
  { label: 'fetch API', pattern: /\bfetch\s*\(/, stripStrings: true },
  { label: 'XMLHttpRequest', pattern: /\bXMLHttpRequest\b/, stripStrings: true },
  { label: 'Authorization header', pattern: /\bAuthorization\b/ },
  { label: 'Bearer token', pattern: /\bBearer\b/ },
  { label: 'Scene API path', pattern: /\/api\// },
];

describe('scene-core architecture boundary', () => {
  it('does not depend on Supabase, auth UI, React, API adapters or browser storage packages', () => {
    const dependencyNames = [
      ...Object.keys((manifest as PackageManifest).dependencies ?? {}),
      ...Object.keys((manifest as PackageManifest).devDependencies ?? {}),
      ...Object.keys((manifest as PackageManifest).peerDependencies ?? {}),
    ];

    expect(dependencyNames.filter((dependencyName) => forbiddenPackageNamePattern.test(dependencyName))).toEqual([]);
  });

  it('keeps source imports free of auth, Supabase, API and web runtime modules', () => {
    const violations = getProductionSourceEntries()
      .flatMap(([filePath, source]) => {
        const sourceWithoutComments = stripComments(source);

        return [
          ...getImportSpecifiers(sourceWithoutComments)
            .filter((specifier) => forbiddenImportSpecifierPattern.test(specifier))
            .map((specifier) => `${filePath} -> ${specifier}`),
          ...getNonStaticDynamicImportExpressions(sourceWithoutComments)
            .map((expression) => `${filePath} contains non-static dynamic import ${expression}`),
        ];
      });

    expect(violations).toEqual([]);
  });

  it('keeps production source free of browser storage, API and token transport primitives', () => {
    const violations = getProductionSourceEntries()
      .flatMap(([filePath, source]) => {
        const sourceWithoutComments = stripComments(source);
        const sourceWithoutCommentsOrStrings = stripStringLiterals(sourceWithoutComments);

        return forbiddenRuntimePatterns
          .filter(({ pattern, stripStrings }) =>
            pattern.test(stripStrings ? sourceWithoutCommentsOrStrings : sourceWithoutComments))
          .map(({ label }) => `${filePath} contains ${label}`);
      });

    expect(violations).toEqual([]);
  });
});

function getProductionSourceEntries(): Array<[string, string]> {
  return Object.entries(sourceModules)
    .filter(([filePath]) => !filePath.endsWith('.test.ts'))
    .filter(([filePath]) => !filePath.startsWith('./test/'));
}

function getImportSpecifiers(source: string): string[] {
  return [
    ...source.matchAll(/\bimport\s+(?:type\s+)?(?:[^'"]+\s+from\s+)?['"]([^'"]+)['"]/g),
    ...source.matchAll(/\bexport\s+(?:type\s+)?[^'"]+\s+from\s+['"]([^'"]+)['"]/g),
    ...source.matchAll(/\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g),
  ].map((match) => match[1]);
}

function getNonStaticDynamicImportExpressions(source: string): string[] {
  return [...source.matchAll(/\bimport\s*\(([\s\S]*?)\)/g)]
    .map((match) => match[1].trim())
    .filter((expression) => !/^['"][^'"]+['"]$/.test(expression));
}

function stripStringLiterals(source: string): string {
  return source
    .replace(/'(?:\\.|[^'\\])*'/g, "''")
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/`(?:\\.|[^`\\])*`/g, '``');
}

function stripComments(source: string): string {
  let result = '';
  let index = 0;
  let quote: '"' | "'" | '`' | null = null;

  while (index < source.length) {
    const current = source[index];
    const next = source[index + 1];

    if (quote) {
      result += current;
      if (current === '\\') {
        result += next ?? '';
        index += 2;
        continue;
      }
      if (current === quote) {
        quote = null;
      }
      index += 1;
      continue;
    }

    if (current === '"' || current === "'" || current === '`') {
      quote = current;
      result += current;
      index += 1;
      continue;
    }

    if (current === '/' && next === '/') {
      while (index < source.length && source[index] !== '\n') {
        index += 1;
      }
      result += '\n';
      index += 1;
      continue;
    }

    if (current === '/' && next === '*') {
      index += 2;
      while (index < source.length && !(source[index] === '*' && source[index + 1] === '/')) {
        result += source[index] === '\n' ? '\n' : ' ';
        index += 1;
      }
      index += 2;
      continue;
    }

    result += current;
    index += 1;
  }

  return result;
}
