# Pokopia Scene Editor Open Design UI

## Visual Theme & Atmosphere

- Mood: 克制、工具化、低干扰。
- Feel: 像创作者工作台，而不是营销页或后台表格。
- Reference posture: Open Design 的纸面、细线、编辑型信息密度；Pokopia Decor Dex 的温暖背景和动态主题；Whimsical 的中心画布优先布局。
- First viewport: 直接进入可编辑工作台，顶部悬浮素材栏、中央 7x7 画布、左侧层级控制和左下检查器预览同时可见。

## Color Palette & Roles

### Foundation

- App background: `#d9b8bf`
- Paper surface: `#fbf7ee`
- Raised surface: `#f2eadc`
- Ink primary: `#231f1a`
- Ink secondary: `#71685f`
- Hairline: `#d8cab8`
- Strong line: `#9f8e7b`

### Semantic

- Accent coral: `#c85f56`
- Focus blue: `#4169e1`
- Main 5x5 fill: `#fff8df`
- Outer ring fill: `#dfeee8`
- Current layer green: `#3d7a62`
- Skill mark blue: `#355ec9`
- Warning amber: `#b97824`
- Error red: `#b23a48`

### Usage Rules

- Dynamic Pokemon color may tint the outer shell only.
- Canvas semantics never inherit dynamic background color.
- Accent appears in current selection, active tool, and primary action only.
- Skill, locked, hidden, error, and warning states use dedicated semantic tokens.

## Typography Rules

- Display: `Georgia`, serif, used only for product title, panel headings, and preview labels.
- UI text: `Inter`, `ui-sans-serif`, `system-ui`, used for controls and list content.
- Data text: `SF Mono`, `Consolas`, monospace, used for coordinates, layer numbers, asset IDs, JSON fields, and counts.
- Do not use hero-scale type inside the editor. Compact panels use 12-16px text.

## Layout Principles

- Desktop grid: single canvas workspace with floating asset, layer, and preview panels.
- Header height: 56px.
- Panel padding: 12-16px.
- Canvas grid: fixed 7x7 with stable square cells and no resize on hover.
- Building levels float on the left side of the canvas, ordered visually as L2, L1, L0 so bottom-to-top reads from low layer to high layer.
- No card nesting. Repeated list rows may be framed, but panels do not contain decorative cards inside decorative cards.

## Core Screen

### Workbench

- Top-left floating: selected Pokemon display/search selector plus editable scene `Name` with save action.
- Right floating: Asset Picker with search, existing item-category filters, a favorite-only checkbox, a stable 4-character result count, fixed current asset, and an independently scrolling vertical result list.
- Center: Scene Canvas with fixed-square 7x7 grid, 5x5 boundary, selected cell, selected item icon, and context actions.
- Left floating: Building Level Panel.
- Floating bottom-left: compact Preview Inspector that directly shows front view and top view together as icon-populated 7x7 thumbnails with fixed-square cells; front view has its own vertical scroll.
- Top: icon-only save action plus destructive delete action.
- Canvas work area keeps extra left clearance so the floating inspector does not cover the grid or current item bar.

### Required Persistent Context

- Scene scale: outward label remains 5x5, actual canvas remains 7x7.
- Current building layer.
- Current selected asset.
- Current selected Pokemon.
- Scene name.
- Selected coordinate.
- Dyeable item state: show a bottom-left dye icon, open an in-cell color picker on click, and display the chosen color on the icon.
- Skill mark visibility and per-instance skill state; markers display a one-character skill label, e.g. `树叶 -> 树`, `储水 -> 水`.
- Per-instance orientation: hide the default 0-degree state; show 90, 180, and 270 degrees as a top-left rotation icon inside a Ditto-shaped frame.
- Skill type vocabulary: `树叶`, `耕地`, `储水`. Do not use the older placeholder options `改变素材状态`, `改变地形`, or `移动占位`.
- Dirty or saved status.

## Component Stylings

- Buttons: 32-38px high, 6px radius, 1px border, visible focus ring.
- Icon buttons: square, title tooltip, accessible label.
- Segmented controls: compact pill or joined buttons for view mode, filters, and rotation.
- Asset rows: thumbnail, name, metadata, and the official item id from Pokopia data shown with a `No.` prefix.
- Layer rows: layer number, name, instance count, visible toggle, lock toggle.
- Inspector fields: label left/top, value/control right/below; read-only fields visually distinct.

## State Rules

- Hovered canvas cell: light outline; enlarged coordinate remains visible.
- Selected cell: coral outline plus persistent inspector sync.
- Filled cell: stable item token with asset initials or thumbnail block.
- Skill mark: blue corner flag with text/icon; not color-only; rendered above item and orientation overlays.
- Locked layer: disabled cursor, reduced opacity, lock icon, command rejection.
- Hidden layer: remains in layer list with eye-off icon and excluded preview count.
- Invalid import/export: field path, expected value, actual issue, recovery action.

## Responsive Behavior

- `>=1280px`: full three-column workbench.
- `1024-1279px`: left panel remains visible, right panel narrows; preview moves below inspector if needed.
- `768-1023px`: panels become tabbed drawers; canvas and current context remain visible.
- `<768px`: read-only preview/check mode; hide edit controls, asset picker, save/delete, layer creation, context actions, dye controls, and disable scene/canvas mutations.

## Agent Prompt Guide

- Build the editor workbench first; do not create a landing page.
- Keep the 7x7 canvas as the visual and interaction center.
- Do not let decorative style obscure coordinates or layers.
- Do not replace semantic state colors with dynamic Pokemon theme colors.
- Do not hide current layer, selected asset, selected coordinate, or dirty state.
- Do not use color as the only signal for area, lock, hidden, error, or skill state.
- Use icons for toolbar commands; scene changes are auto-saved and export is not currently exposed.
