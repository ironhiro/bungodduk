import * as THREE from "three";

// 하얀 링+글로우를 캔버스로 만든 뒤 텍스처로 반환
export function makeImpactTexture(size = 128) {
  const cnv = document.createElement("canvas");
  cnv.width = size; cnv.height = size;
  const ctx = cnv.getContext("2d")!;

  const cx = size / 2, cy = size / 2;
  const rOuter = size * 0.45;
  const rInner = size * 0.28;

  ctx.clearRect(0, 0, size, size);

  // 외곽 글로우
  const g = ctx.createRadialGradient(cx, cy, rInner, cx, cy, rOuter);
  g.addColorStop(0.0, "rgba(255,255,255,0.8)");
  g.addColorStop(0.6, "rgba(255,255,255,0.25)");
  g.addColorStop(1.0, "rgba(255,255,255,0.0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, rOuter, 0, Math.PI * 2);
  ctx.fill();

  // 링
  ctx.lineWidth = Math.max(2, size * 0.04);
  ctx.strokeStyle = "rgba(255,255,255,0.95)";
  ctx.beginPath();
  ctx.arc(cx, cy, (rOuter + rInner) / 2, 0, Math.PI * 2);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(cnv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  return tex;
}
