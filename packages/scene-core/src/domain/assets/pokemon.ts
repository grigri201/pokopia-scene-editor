import { pokemonData } from 'pokopia-data';
import { getPokopiaAssetUrl } from './asset-base-url';

export type PokemonKey = (typeof pokemonData.pokemon)[number]['key'];

export interface PokemonThemeDefinition {
  key: PokemonKey;
  name: string;
  englishName: string;
  pokedexNumber: number;
  background: string;
  accent: string;
  portraitUrl: string;
}

export const knownPokemonKeys = pokemonData.pokemon.map((pokemon) => pokemon.key) as readonly PokemonKey[];

const defaultPokemonTheme = {
  background: '#efe6d5',
  accent: '#6e604b',
};

const pokemonThemeOverrides: Partial<Record<PokemonKey, { background: string; accent: string }>> = {
  ditto: {
    background: '#e6d1df',
    accent: '#7d4a74',
  },
  eevee: {
    background: '#d8c3a4',
    accent: '#855f37',
  },
  pikachu: {
    background: '#f4dc67',
    accent: '#9c6b13',
  },
};

export const pokemonThemeCatalog: readonly PokemonThemeDefinition[] = pokemonData.pokemon.map((pokemon) => {
  const theme = pokemonThemeOverrides[pokemon.key] ?? defaultPokemonTheme;

  return {
    key: pokemon.key,
    name: pokemon.name,
    englishName: pokemon.englishName,
    pokedexNumber: pokemon.pokedexNumber,
    background: theme.background,
    accent: theme.accent,
    portraitUrl: getPokemonPortraitUrl(pokemon.portraitFileName),
  };
});

export const pokemonThemeCatalogByNumber: readonly PokemonThemeDefinition[] = [...pokemonThemeCatalog].sort(
  (left, right) => left.pokedexNumber - right.pokedexNumber,
);

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
    (pokemon) =>
      pokemon.key === normalizedQuery ||
      pokemon.name.toLowerCase() === normalizedQuery ||
      pokemon.englishName.toLowerCase() === normalizedQuery,
  );

  if (exactMatch) {
    return exactMatch.key;
  }

  const partialMatches = pokemonThemeCatalog.filter(
    (pokemon) =>
      pokemon.key.startsWith(normalizedQuery) ||
      pokemon.name.toLowerCase().startsWith(normalizedQuery) ||
      pokemon.englishName.toLowerCase().startsWith(normalizedQuery),
  );

  return normalizedQuery && partialMatches.length === 1 ? partialMatches[0].key : null;
}

function getPokemonPortraitUrl(fileName: string): string {
  return getPokopiaAssetUrl(`assets/pokopia_image_sources/pokemon_portraits/${fileName}`);
}
