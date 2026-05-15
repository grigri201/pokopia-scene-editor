# Pokopia Image Sources For Scene Editor

This directory contains the Pokopia source-data subset copied from:

`/Users/grigri/side-project/pokopia/pokopia-color-pattern/docs/pokopia_image_sources`

Current project location:

`assets/pokopia_image_sources`

## Included For This Project

- `decorative_item_images.csv`
  - Primary scene-editor candidate catalog.
  - Contains the filtered decorative/placeable item set with English name, Simplified Chinese name when available, category, tag, selection reasons, source URLs, and image source.
- `decorative_item_portraits/`
  - Local thumbnails/icons for the `decorative_item_images.csv` rows.
  - `manifest.csv` contains filename, relative path, source URL, content type, bytes, SHA-256, status, and source metadata.
- `pokopiadex_placeable_items.csv`
- `pokopiadex_placeable_items.json`
- `pokopiadex_placeable_items_summary.md`
  - Complete PokopiaDex in-collection/placeable item scrape.
  - This is the broad 1,219-row source set and should be treated as the complete item catalog snapshot copied into this project.
- `item_portraits/`
  - Local thumbnails/icons for the complete 1,219-row `pokopiadex_placeable_items.csv` catalog.
  - `manifest.csv` contains normalized item metadata plus filename, relative path, source URL, content type, bytes, SHA-256, status, and source metadata.
- `pokemon_images.csv`
  - Pokopia-specific Pokemon catalog with English names, Simplified Chinese names, source image URLs, and source metadata.
- `pokemon_portraits/`
  - Local Pokemon portraits for the `pokemon_images.csv` rows.
  - `manifest.csv` contains filename, relative path, source URL, content type, bytes, SHA-256, status, and source metadata.
- `infipoke_items_zh_hans.csv`
  - Simplified Chinese item-name reference from InfiPoke, useful when filling missing localized names.
- `summary.md`
  - Upstream generation notes, selection rules, counts, and source URLs.

## Selection Scope

There are two item scopes in this directory.

The complete copied item catalog is the PokopiaDex `in-collection` / placeable snapshot:

- `pokopiadex_placeable_items.csv`
- `pokopiadex_placeable_items.json`
- `item_portraits/`

This complete set contains 1,219 items across categories such as `Food`, `Materials`, `Nature`, `Kits`, `Furniture`, `Misc.`, `Outdoor`, `Utilities`, `Buildings`, `Blocks`, `Key Items`, and `Other`.

The smaller decorative subset is:

- `decorative_item_images.csv`
- `decorative_item_portraits/`

It keeps rows selected by these stricter decoration-oriented rules:

- PokopiaDex or InfiPoke rows with category `Furniture` or `Blocks`.
- Rows tagged `Decoration` or `Toy`.
- PokopiaDex `Food` and `Materials` rows with non-empty `favorite_category_ids`, used as the available source signal that the item can be placed as a ground/world item.

Use the complete 1,219-row catalog when the scene editor needs every available placeable/source item. Use the 658-row decorative subset when a feature specifically needs a decoration-focused initial picker or filtered view.

The Pokemon set is included separately for scene-editor flows that need Pokemon identity, portraits, preview participants, theme/reference selection, or future skill/preference data.

## Deliberately Excluded

- `furniture_portraits/`
  - Covered by the broader `decorative_item_portraits/` subset.
- `pokopiadex_pokemon_preferences.json` and combined Pokemon/furniture URL exports.
  - Relevant to Pokopia Decor Dex recommendation/theme flows, not required for the first copied scene-editor workspace data set.
- `.DS_Store`
  - Local macOS metadata, intentionally excluded.
