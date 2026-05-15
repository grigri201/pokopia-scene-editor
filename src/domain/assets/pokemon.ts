export const knownPokemonKeys = ['ditto', 'eevee', 'pikachu'] as const;

export type PokemonKey = (typeof knownPokemonKeys)[number];

export interface PokemonThemeDefinition {
  key: PokemonKey;
  name: string;
  background: string;
  accent: string;
}

export const pokemonThemeCatalog: readonly PokemonThemeDefinition[] = [
  {
    key: 'ditto',
    name: 'Ditto',
    background: '#e6d1df',
    accent: '#7d4a74',
  },
  {
    key: 'eevee',
    name: 'Eevee',
    background: '#d8c3a4',
    accent: '#855f37',
  },
  {
    key: 'pikachu',
    name: 'Pikachu',
    background: '#f4dc67',
    accent: '#9c6b13',
  },
] as const;

const knownPokemonKeySet = new Set<string>(knownPokemonKeys);

export function isKnownPokemonKey(value: string): value is PokemonKey {
  return knownPokemonKeySet.has(value);
}

export function assertKnownPokemonKey(value: string): asserts value is PokemonKey {
  if (!isKnownPokemonKey(value)) {
    throw new RangeError(`Unknown Pokemon key: ${value}`);
  }
}

export function getPokemonThemeDefinition(value: string | null | undefined): PokemonThemeDefinition {
  const key = value && isKnownPokemonKey(value) ? value : 'ditto';
  return pokemonThemeCatalog.find((pokemon) => pokemon.key === key) ?? pokemonThemeCatalog[0];
}

export function findPokemonKeyByQuery(query: string): PokemonKey | null {
  const normalizedQuery = query.trim().toLowerCase();
  const exactMatch = pokemonThemeCatalog.find(
    (pokemon) => pokemon.key === normalizedQuery || pokemon.name.toLowerCase() === normalizedQuery,
  );

  if (exactMatch) {
    return exactMatch.key;
  }

  const partialMatches = pokemonThemeCatalog.filter(
    (pokemon) =>
      pokemon.key.startsWith(normalizedQuery) ||
      pokemon.name.toLowerCase().startsWith(normalizedQuery),
  );

  return normalizedQuery && partialMatches.length === 1 ? partialMatches[0].key : null;
}
