interface MaterialColorCandidate {
  hex: string;
  oklab: OklabColor;
  order: number;
}

interface OklabColor {
  lightness: number;
  redGreen: number;
  blueYellow: number;
}

interface RgbColor {
  red: number;
  green: number;
  blue: number;
}

const materialColorHues = Array.from({ length: 36 }, (_, index) => index * 10);
const materialColorSaturations = [88, 74, 60] as const;
const materialColorLightnesses = [28, 40] as const;
const highContrastMaterialColors = createHighContrastMaterialColors();

export function createMaterialColor(index: number): string {
  return highContrastMaterialColors[index] ?? createFallbackMaterialColor(index);
}

function createHighContrastMaterialColors(): string[] {
  const candidates = createMaterialColorCandidates();
  const firstCandidate = candidates[0];

  if (!firstCandidate) {
    return [];
  }

  const selected: MaterialColorCandidate[] = [firstCandidate];
  const remaining = candidates.slice(1).map((candidate) => ({
    candidate,
    nearestDistance: getOklabDistance(candidate.oklab, firstCandidate.oklab),
  }));

  // Farthest-point ordering keeps the palette deterministic while maximizing separation from colors already assigned.
  while (remaining.length > 0) {
    let bestIndex = 0;

    for (let index = 1; index < remaining.length; index += 1) {
      const current = remaining[index];
      const best = remaining[bestIndex];

      if (
        current.nearestDistance > best.nearestDistance ||
        (current.nearestDistance === best.nearestDistance && current.candidate.order < best.candidate.order)
      ) {
        bestIndex = index;
      }
    }

    const [next] = remaining.splice(bestIndex, 1);
    selected.push(next.candidate);

    for (const option of remaining) {
      option.nearestDistance = Math.min(
        option.nearestDistance,
        getOklabDistance(option.candidate.oklab, next.candidate.oklab),
      );
    }
  }

  return selected.map((candidate) => candidate.hex);
}

function createMaterialColorCandidates(): MaterialColorCandidate[] {
  const candidates: MaterialColorCandidate[] = [];
  let order = 0;

  for (const lightness of materialColorLightnesses) {
    for (const saturation of materialColorSaturations) {
      for (const hue of materialColorHues) {
        const rgb = hslToRgb({ hue, saturation, lightness });

        candidates.push({
          hex: rgbToHex(rgb),
          oklab: rgbToOklab(rgb),
          order,
        });
        order += 1;
      }
    }
  }

  return candidates;
}

function createFallbackMaterialColor(index: number): string {
  const hue = (index * 137.508) % 360;
  const saturation = index % 3 === 1 ? 88 : 74;
  const lightness = index % 2 === 0 ? 30 : 42;

  return rgbToHex(hslToRgb({ hue, saturation, lightness }));
}

function hslToRgb({
  hue,
  saturation,
  lightness,
}: {
  hue: number;
  saturation: number;
  lightness: number;
}): RgbColor {
  const normalizedHue = ((hue % 360) + 360) % 360;
  const normalizedSaturation = saturation / 100;
  const normalizedLightness = lightness / 100;
  const chroma = (1 - Math.abs((2 * normalizedLightness) - 1)) * normalizedSaturation;
  const huePrime = normalizedHue / 60;
  const secondary = chroma * (1 - Math.abs((huePrime % 2) - 1));
  let red = 0;
  let green = 0;
  let blue = 0;

  if (huePrime < 1) {
    red = chroma;
    green = secondary;
  } else if (huePrime < 2) {
    red = secondary;
    green = chroma;
  } else if (huePrime < 3) {
    green = chroma;
    blue = secondary;
  } else if (huePrime < 4) {
    green = secondary;
    blue = chroma;
  } else if (huePrime < 5) {
    red = secondary;
    blue = chroma;
  } else {
    red = chroma;
    blue = secondary;
  }

  const match = normalizedLightness - (chroma / 2);

  return {
    red: red + match,
    green: green + match,
    blue: blue + match,
  };
}

function rgbToHex({ red, green, blue }: RgbColor): string {
  return `#${toHexChannel(red)}${toHexChannel(green)}${toHexChannel(blue)}`;
}

function toHexChannel(channel: number): string {
  return Math.round(Math.min(1, Math.max(0, channel)) * 255)
    .toString(16)
    .padStart(2, '0')
    .toUpperCase();
}

function rgbToOklab(rgb: RgbColor): OklabColor {
  const red = toLinearRgb(rgb.red);
  const green = toLinearRgb(rgb.green);
  const blue = toLinearRgb(rgb.blue);
  const long = Math.cbrt((0.4122214708 * red) + (0.5363325363 * green) + (0.0514459929 * blue));
  const medium = Math.cbrt((0.2119034982 * red) + (0.6806995451 * green) + (0.1073969566 * blue));
  const short = Math.cbrt((0.0883024619 * red) + (0.2817188376 * green) + (0.6299787005 * blue));

  return {
    lightness: (0.2104542553 * long) + (0.793617785 * medium) - (0.0040720468 * short),
    redGreen: (1.9779984951 * long) - (2.428592205 * medium) + (0.4505937099 * short),
    blueYellow: (0.0259040371 * long) + (0.7827717662 * medium) - (0.808675766 * short),
  };
}

function getOklabDistance(left: OklabColor, right: OklabColor): number {
  return Math.hypot(
    (left.lightness - right.lightness) * 1.35,
    left.redGreen - right.redGreen,
    left.blueYellow - right.blueYellow,
  );
}

function toLinearRgb(channel: number): number {
  return channel <= 0.04045
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4;
}
