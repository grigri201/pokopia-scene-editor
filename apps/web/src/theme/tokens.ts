export const layoutTokens = {
  appPadding: '16px',
  panelRadius: '8px',
  toolbarMinHeight: '64px',
  leftPanelWidth: '230px',
  rightPanelWidth: '300px',
} as const;

export const gridTokens = {
  sceneSize: 5,
  canvasSize: 7,
  cellGap: '2px',
  maxCanvasWidth: '610px',
} as const;

export const surfaceTokens = {
  surface: 'var(--surface)',
  surfacePanel: 'var(--surface-panel)',
  surfaceStrong: 'var(--surface-strong)',
  line: 'var(--line)',
  lineStrong: 'var(--line-strong)',
} as const;

export const semanticTokens = {
  mainArea: 'var(--color-main-area)',
  outerArea: 'var(--color-outer-area)',
  selectedCell: 'var(--color-selected-cell)',
  hoverCell: 'var(--color-hover-cell)',
  skillMarker: 'var(--color-skill-marker)',
  error: 'var(--color-error)',
} as const;

export const pokemonThemeTokens = {
  pokemonBackground: 'var(--pokemon-background)',
  pokemonBackgroundInk: 'var(--pokemon-background-ink)',
  pokemonAccent: 'var(--pokemon-accent)',
} as const;

export const openDesignPalette = {
  paper: '#fffdf8',
  parchment: '#f6f3ec',
  moss: '#256f68',
  ditto: '#7d4a74',
  clay: '#b54a32',
} as const;

export const typographyTokens = {
  uiFamily: 'Inter, ui-sans-serif, system-ui',
  coordinateFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  toolHeadingSize: '16px',
  workbenchHeadingSize: '28px',
} as const;
