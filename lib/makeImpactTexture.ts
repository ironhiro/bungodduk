import * as THREE from "three";

// Gradient constants
const OUTER_RADIUS_RATIO = 0.45;
const INNER_RADIUS_RATIO = 0.28;
const LINE_WIDTH_RATIO = 0.04;
const MIN_LINE_WIDTH = 2;

// Color stops
const GRADIENT_STOPS = [
  { offset: 0, color: "rgba(255,255,255,.8)" },
  { offset: 0.6, color: "rgba(255,255,255,.25)" },
  { offset: 1, color: "rgba(255,255,255,0)" },
] as const;

const STROKE_COLOR = "rgba(255,255,255,.95)";

/**
 * Create a radial impact effect texture
 */
export function makeImpactTexture(size = 256): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d")!;
  const center = size / 2;
  const outerRadius = size * OUTER_RADIUS_RATIO;
  const innerRadius = size * INNER_RADIUS_RATIO;

  ctx.clearRect(0, 0, size, size);

  // Create radial gradient
  const gradient = ctx.createRadialGradient(
    center,
    center,
    innerRadius,
    center,
    center,
    outerRadius
  );

  for (const { offset, color } of GRADIENT_STOPS) {
    gradient.addColorStop(offset, color);
  }

  // Draw filled circle with gradient
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(center, center, outerRadius, 0, Math.PI * 2);
  ctx.fill();

  // Draw ring stroke
  ctx.lineWidth = Math.max(MIN_LINE_WIDTH, size * LINE_WIDTH_RATIO);
  ctx.strokeStyle = STROKE_COLOR;
  ctx.beginPath();
  ctx.arc(center, center, (outerRadius + innerRadius) / 2, 0, Math.PI * 2);
  ctx.stroke();

  // Create Three.js texture
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;

  return texture;
}
