import { describe, expect, it } from 'vitest';
import { pokemonThemeCatalog, pokemonThemeCatalogByNumber } from './pokemon';

describe('pokemon theme catalog', () => {
  it('exposes Pokedex numbers on Pokemon theme definitions', () => {
    expect(pokemonThemeCatalog.find((pokemon) => pokemon.key === 'bulbasaur')?.pokedexNumber).toBe(1);
    expect(pokemonThemeCatalog.find((pokemon) => pokemon.key === 'pikachu')?.pokedexNumber).toBe(79);
    expect(pokemonThemeCatalog.find((pokemon) => pokemon.key === 'abra')?.pokedexNumber).toBe(213);
    expect(pokemonThemeCatalog.find((pokemon) => pokemon.key === 'mew')?.pokedexNumber).toBe(300);
  });

  it('sorts Pokemon themes by Pokedex number', () => {
    expect(pokemonThemeCatalogByNumber.slice(0, 9).map((pokemon) => pokemon.key)).toEqual([
      'bulbasaur',
      'ivysaur',
      'venusaur',
      'charmander',
      'charmeleon',
      'charizard',
      'squirtle',
      'wartortle',
      'blastoise',
    ]);
    expect(pokemonThemeCatalogByNumber.at(-1)?.key).toBe('mew');
  });
});
