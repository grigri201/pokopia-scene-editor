import { describe, expect, it } from 'vitest';
import { pokemonThemeCatalog } from '../domain/assets';
import { getContrastRatio, getPokemonTheme, getReadableInkColor } from './pokemon-theme';

describe('pokemon theme tokens', () => {
  it('uses Ditto as the fallback Pokemon theme', () => {
    expect(getPokemonTheme(null)).toEqual({
      pokemonBackground: '#e6d1df',
      pokemonBackgroundInk: '#211f1a',
      pokemonAccent: '#7d4a74',
    });
  });

  it('derives readable ink from background luminance', () => {
    expect(getReadableInkColor('#f4dc67')).toBe('#211f1a');
    expect(getReadableInkColor('#2d2540')).toBe('#fffaf0');
    expect(getPokemonTheme('eevee').pokemonBackgroundInk).toBe('#211f1a');
  });

  it('keeps every Pokemon theme background readable', () => {
    for (const pokemon of pokemonThemeCatalog) {
      const theme = getPokemonTheme(pokemon.key);
      expect(getContrastRatio(theme.pokemonBackground, theme.pokemonBackgroundInk)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
