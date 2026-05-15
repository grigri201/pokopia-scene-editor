export const knownPokemonKeys = ['ditto', 'eevee', 'pikachu'] as const;

export type PokemonKey = (typeof knownPokemonKeys)[number];

const knownPokemonKeySet = new Set<string>(knownPokemonKeys);

export function isKnownPokemonKey(value: string): value is PokemonKey {
  return knownPokemonKeySet.has(value);
}

export function assertKnownPokemonKey(value: string): asserts value is PokemonKey {
  if (!isKnownPokemonKey(value)) {
    throw new RangeError(`Unknown Pokemon key: ${value}`);
  }
}
