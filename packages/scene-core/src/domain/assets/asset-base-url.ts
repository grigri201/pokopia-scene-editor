const pokopiaAssetBaseUrl = '/';

export function getPokopiaAssetUrl(path: string): string {
  return `${pokopiaAssetBaseUrl}${path.replace(/^\/+/, '')}`;
}
