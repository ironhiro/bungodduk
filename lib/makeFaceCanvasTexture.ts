import * as THREE from "three";

// Constants
const FONT_SIZE_RATIO = 0.2;
const LINE_HEIGHT_MULTIPLIER = 1.05;
const MIN_FONT_SIZE = 6;
const MIN_OUTER_RATIO = 0.02;
const MIN_OUTER_PX = 4;
const LINE_COUNT = 3;
const FALLBACK_FONT = "sans-serif";

/**
 * Quote font family name if it contains special characters
 */
function quoteFamily(family: string): string {
  const trimmed = family.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith("'") || trimmed.startsWith('"')) return trimmed;
  return /[^a-zA-Z0-9_-]/.test(trimmed) ? `"${trimmed}"` : trimmed;
}

// Primary font for Korean text
const PRIMARY_FONT = "Black Han Sans";

/**
 * Resolve and load the preferred font family using FontFace API
 */
async function resolveLoadedFamily(prefer?: string): Promise<string> {
  // Wait for all fonts to be ready first
  await document.fonts.ready;

  const candidates = [prefer?.trim(), PRIMARY_FONT].filter(
    (f): f is string => Boolean(f)
  );

  // Test string includes Korean characters to ensure Korean glyphs are loaded
  const testString = "붕오떡";

  for (const family of candidates) {
    const quoted = quoteFamily(family);
    try {
      // Load font with Korean test string
      await document.fonts.load(`400 64px ${quoted}`, testString);
      if (document.fonts.check(`400 64px ${quoted}`, testString)) {
        return quoted;
      }
    } catch {
      // Font loading failed, try next candidate
    }
  }

  return quoteFamily(candidates.at(-1) ?? FALLBACK_FONT);
}

export interface TextureOptions {
  readonly lines: string[];
  readonly w: number;
  readonly h: number;
  readonly pad: number;
  readonly bgRGBA: readonly [number, number, number, number];
  readonly color: string;
  readonly fontFamily?: string;
}

/**
 * Create a canvas texture with text for cube faces
 */
export async function makeFaceCanvasTextureAsync(
  opts: TextureOptions
): Promise<THREE.CanvasTexture> {
  const { lines, w, h, pad, bgRGBA, color, fontFamily } = opts;
  const family = await resolveLoadedFamily(fontFamily);

  // Create canvas
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, w, h);

  // Draw background
  const [r, g, b, a] = bgRGBA;
  ctx.fillStyle = `rgba(${r},${g},${b},${a / 255})`;
  ctx.fillRect(0, 0, w, h);

  const usableW = w - pad * 2;
  const usableH = h - pad * 2;

  // Calculate font size
  const lineHeight = (fs: number) => fs * LINE_HEIGHT_MULTIPLIER;
  const setFont = (fs: number) => {
    ctx.font = `950 ${fs}px ${family}`;
  };

  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";

  let fontSize = Math.floor(h * FONT_SIZE_RATIO);
  setFont(fontSize);

  // Shrink font to fit height
  while (lineHeight(fontSize) * LINE_COUNT > usableH && fontSize > MIN_FONT_SIZE) {
    fontSize--;
    setFont(fontSize);
  }

  // Measure text width
  const measureWidth = (text: string) =>
    ctx.measureText([...text].join("")).width;

  // Shrink font to fit width
  while (
    Math.max(...lines.map(measureWidth)) > usableW &&
    fontSize > MIN_FONT_SIZE
  ) {
    fontSize--;
    setFont(fontSize);
  }

  // Calculate vertical layout
  const totalHeight = lineHeight(fontSize) * LINE_COUNT;
  const minOuter = Math.max(MIN_OUTER_PX, h * MIN_OUTER_RATIO);
  const leftover = Math.max(0, usableH - totalHeight - minOuter * 2);
  const gap = leftover > 0 ? leftover / 2 : 0;
  const startY = pad + minOuter + fontSize;

  // Draw text
  ctx.fillStyle = color;

  lines.forEach((text, lineIndex) => {
    const chars = [...text];
    const gapCount = Math.max(1, chars.length - 1);
    const textWidth = measureWidth(text);
    const spacing = gapCount > 0 ? Math.max(0, (usableW - textWidth) / gapCount) : 0;

    const y = startY + lineIndex * (lineHeight(fontSize) + gap);
    let x = pad;

    for (const char of chars) {
      ctx.fillText(char, x, y);
      x += ctx.measureText(char).width + spacing;
    }
  });

  // Create Three.js texture
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;

  return texture;
}
