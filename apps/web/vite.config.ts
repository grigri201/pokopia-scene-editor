import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { cpSync, existsSync, mkdirSync, rmSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Plugin, ResolvedConfig } from 'vite';

const runtimeAssetDirectories = [
  'ability_icons',
  'decorative_item_portraits',
  'item_portraits',
  'pokemon_portraits',
  'specialty_icons',
] as const;

const runtimeImageExtensionPattern = /\.(avif|gif|jpe?g|png|svg|webp)$/i;

export default defineConfig({
  base: process.env.VITE_PUBLIC_BASE_PATH ?? './',
  plugins: [react(), copyPokopiaRuntimeAssets()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'react-vendor',
              test: /node_modules[\\/](react|react-dom)[\\/]/,
              priority: 30,
            },
            {
              name: 'export-vendor',
              test: /node_modules[\\/]html-to-image[\\/]/,
              priority: 20,
            },
            {
              name: 'schema-vendor',
              test: /node_modules[\\/]zod[\\/]/,
              priority: 20,
            },
            {
              name: 'pokopia-catalog',
              test: /src[\\/]domain[\\/]assets[\\/]source-/,
              priority: 10,
            },
          ],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
    setupFiles: ['./src/test/setup.ts'],
  },
});

function copyPokopiaRuntimeAssets(): Plugin {
  let config: ResolvedConfig;

  return {
    name: 'copy-pokopia-runtime-assets',
    apply: 'build',
    configResolved(resolvedConfig) {
      config = resolvedConfig;
    },
    closeBundle() {
      const sourceRoot = resolve(config.root, '../../assets/pokopia_image_sources');
      const outputRoot = resolve(config.root, config.build.outDir, 'assets/pokopia_image_sources');

      rmSync(outputRoot, { force: true, recursive: true });
      mkdirSync(outputRoot, { recursive: true });

      for (const directory of runtimeAssetDirectories) {
        const sourceDirectory = resolve(sourceRoot, directory);
        const outputDirectory = resolve(outputRoot, directory);

        if (!existsSync(sourceDirectory)) {
          throw new Error(`Missing Pokopia runtime asset source directory: ${sourceDirectory}`);
        }

        cpSync(sourceDirectory, outputDirectory, {
          recursive: true,
          filter: (sourcePath) => {
            if (sourcePath.includes('/.')) {
              return false;
            }

            const sourceStat = statSync(sourcePath);

            return sourceStat.isDirectory() || runtimeImageExtensionPattern.test(sourcePath);
          },
        });
      }
    },
  };
}
