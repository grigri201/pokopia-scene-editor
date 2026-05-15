import type { CSSProperties } from 'react';
import { getPokemonThemeDefinition, type PokemonKey } from '../domain/assets';

export interface PokemonTheme {
  pokemonBackground: string;
  pokemonBackgroundInk: string;
  pokemonAccent: string;
}

export function getPokemonTheme(pokemonKey: PokemonKey | null | undefined): PokemonTheme {
  const definition = getPokemonThemeDefinition(pokemonKey);

  return {
    pokemonBackground: definition.background,
    pokemonBackgroundInk: getReadableInkColor(definition.background),
    pokemonAccent: definition.accent,
  };
}

export function toPokemonThemeStyle(theme: PokemonTheme): CSSProperties {
  return {
    '--pokemon-background': theme.pokemonBackground,
    '--pokemon-background-ink': theme.pokemonBackgroundInk,
    '--pokemon-accent': theme.pokemonAccent,
  } as CSSProperties;
}

export function getReadableInkColor(hexColor: string): string {
  const darkInk = '#211f1a';
  const lightInk = '#fffaf0';

  return getContrastRatio(hexColor, darkInk) >= getContrastRatio(hexColor, lightInk)
    ? darkInk
    : lightInk;
}

export function getContrastRatio(leftHexColor: string, rightHexColor: string): number {
  const leftLuminance = getRelativeLuminance(leftHexColor);
  const rightLuminance = getRelativeLuminance(rightHexColor);
  const lighter = Math.max(leftLuminance, rightLuminance);
  const darker = Math.min(leftLuminance, rightLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

function parseHexColor(hexColor: string): { r: number; g: number; b: number } {
  const normalized = hexColor.replace('#', '');

  if (!/^[0-9a-f]{6}$/i.test(normalized)) {
    throw new RangeError(`Invalid hex color: ${hexColor}`);
  }

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function getRelativeLuminance(hexColor: string): number {
  const { r, g, b } = parseHexColor(hexColor);
  return 0.2126 * toLinearRgb(r) + 0.7152 * toLinearRgb(g) + 0.0722 * toLinearRgb(b);
}

function toLinearRgb(channel: number): number {
  const normalized = channel / 255;
  return normalized <= 0.03928
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}
