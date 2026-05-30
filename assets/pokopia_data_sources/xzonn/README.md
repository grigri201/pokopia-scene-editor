# Xzonn PokemonPokopiaDatabase Snapshot

This directory contains pinned text snapshots from `Xzonn/PokemonPokopiaDatabase`.

Upstream:

- Repository: https://github.com/Xzonn/PokemonPokopiaDatabase
- Commit: `579689ce05e6239b732141d5adee3b98922f602c`
- Commit date: 2026-04-21T00:48:52+08:00
- Commit subject: `fix: Add robots.txt`
- Synced for: Story 13.7 Xzonn data baseline

Files:

| File | Rows | SHA-256 |
| --- | ---: | --- |
| `item.txt` | 1251 data rows | `0da26f3682ee56c63d5017f3946efbb4cd63b2a260ea8cfa10ff2ecf8b91d326` |
| `pokemon.txt` | 312 data rows | `152424bb783a008378aed307c7cd0ce083628745e3ae86a38c681f80ebbbd941` |
| `habitat.txt` | 213 data rows | `e0e16686be4cf783026f2596cab3587941f5b0d0e45dba10f1746021c58e8d68` |

`item.txt` rows `10001-10056` are habitat generalized matching data. They are valid source data for future habitat matching, but must not be emitted into the current placeable asset catalog, Asset Picker, export material list, or ordinary asset search.

`habitat.txt` is pinned for future use. Current runtime code must not add habitat UI, `SceneDocument` fields, or Web catalog consumption unless a later story explicitly enables it.
