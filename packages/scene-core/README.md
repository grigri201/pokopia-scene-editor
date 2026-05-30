# @pokopia-scene-editor/scene-core

DOM-free SceneDocument v1 domain library for Pokopia Scene Editor.

This package is currently `private: true` because the supported distribution path is local installation from this repository, not registry publishing. Build it before use:

```sh
pnpm --filter @pokopia-scene-editor/scene-core build
pnpm add file:/absolute/path/to/pokopia-scene-editor/packages/scene-core
```

The public contract is the package root export. It points to `dist/index.js` and `dist/index.d.ts`; downstream projects should not import from `src`.

The build target is ESM for Node 22 or newer.
