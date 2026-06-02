import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { createReadStream, cpSync, existsSync, mkdirSync, rmSync, statSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin, ResolvedConfig } from 'vite';
import {
  getRemoteSceneDevProxyRequestHeaders,
  remoteSceneApiBaseUrl,
  remoteSceneDevProxyContextPattern,
  rewriteRemoteSceneDevProxyPath,
} from './src/io/remote-scene-import-config';

const configDir = dirname(fileURLToPath(import.meta.url));
const sceneCoreSourceEntry = resolve(configDir, '../../packages/scene-core/src/index.ts');

const runtimeAssetDirectories = [
  'ability_icons',
  'decorative_item_portraits',
  'item_portraits',
  'pokemon_portraits',
  'specialty_icons',
] as const;

const runtimeImageExtensionPattern = /\.(avif|gif|jpe?g|png|svg|webp)$/i;
const runtimeAssetUrlPrefix = '/assets/pokopia_image_sources/';

const runtimeImageContentTypes: Record<string, string> = {
  avif: 'image/avif',
  gif: 'image/gif',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  svg: 'image/svg+xml',
  webp: 'image/webp',
};

export default defineConfig({
  base: process.env.VITE_PUBLIC_BASE_PATH ?? './',
  plugins: [react(), copyPokopiaRuntimeAssets()],
  resolve: {
    alias: {
      '@pokopia-scene-editor/scene-core': sceneCoreSourceEntry,
    },
  },
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
  server: {
    proxy: {
      [remoteSceneDevProxyContextPattern]: {
        target: remoteSceneApiBaseUrl,
        changeOrigin: true,
        rewrite: rewriteRemoteSceneDevProxyPath,
        configure(proxy) {
          proxy.on('proxyReq', (proxyRequest) => {
            for (const [headerName, headerValue] of Object.entries(getRemoteSceneDevProxyRequestHeaders())) {
              proxyRequest.setHeader(headerName, headerValue);
            }
          });
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
    configResolved(resolvedConfig) {
      config = resolvedConfig;
    },
    configureServer(server) {
      const sourceRoot = resolve(server.config.root, '../../assets/pokopia_image_sources');

      server.middlewares.use((request, response, next) => {
        const requestUrl = new URL(request.url ?? '', 'http://localhost');

        if (!requestUrl.pathname.startsWith(runtimeAssetUrlPrefix)) {
          next();
          return;
        }

        const relativeAssetPath = decodeURIComponent(requestUrl.pathname.slice(runtimeAssetUrlPrefix.length));
        const assetPath = resolve(sourceRoot, relativeAssetPath);
        const sourceRelativePath = relative(sourceRoot, assetPath);

        if (
          sourceRelativePath.startsWith('..') ||
          sourceRelativePath.includes(`${sep}..${sep}`) ||
          !runtimeImageExtensionPattern.test(assetPath) ||
          !isRuntimeAssetDirectory(sourceRelativePath) ||
          !existsSync(assetPath)
        ) {
          next();
          return;
        }

        const assetStat = statSync(assetPath);

        if (!assetStat.isFile()) {
          next();
          return;
        }

        response.statusCode = 200;
        response.setHeader('Cache-Control', 'no-cache');
        response.setHeader('Content-Length', assetStat.size.toString());
        response.setHeader('Content-Type', getRuntimeImageContentType(assetPath));

        if (request.method === 'HEAD') {
          response.end();
          return;
        }

        createReadStream(assetPath).pipe(response);
      });
    },
    closeBundle() {
      if (config.command !== 'build') {
        return;
      }

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

function isRuntimeAssetDirectory(sourceRelativePath: string): boolean {
  return runtimeAssetDirectories.some((directory) => {
    return sourceRelativePath === directory || sourceRelativePath.startsWith(`${directory}${sep}`);
  });
}

function getRuntimeImageContentType(filePath: string): string {
  const extension = filePath.split('.').pop()?.toLowerCase() ?? '';

  return runtimeImageContentTypes[extension] ?? 'application/octet-stream';
}
