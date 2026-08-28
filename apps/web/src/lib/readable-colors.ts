function parseHex(value: string): [number, number, number] | undefined {
  const hex = value.trim().replace(/^#/, "");
  const normalized =
    hex.length === 3
      ? hex
          .split("")
          .map((character) => character + character)
          .join("")
      : hex;
  if (!/^[\da-f]{6}$/i.test(normalized)) return undefined;

  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ];
}

function channel(value: number) {
  const srgb = value / 255;
  return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
}

function luminance(value: string) {
  const rgb = parseHex(value);
  if (!rgb) return undefined;
  return (
    0.2126 * channel(rgb[0]) +
    0.7152 * channel(rgb[1]) +
    0.0722 * channel(rgb[2])
  );
}

export function contrastRatio(a: string, b: string) {
  const first = luminance(a);
  const second = luminance(b);
  if (first == null || second == null) return undefined;
  const [higher, lower] = first > second ? [first, second] : [second, first];
  return (higher + 0.05) / (lower + 0.05);
}

export function hasReadableContrast(
  foreground: string | null | undefined,
  background: string | null | undefined,
  minimum = 3,
) {
  const text = foreground?.trim();
  const surface = background?.trim();
  if (!text || !surface) return true;
  const ratio = contrastRatio(text, surface);
  return ratio != null && ratio >= minimum;
}
