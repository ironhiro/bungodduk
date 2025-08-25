import * as THREE from "three";
export function makeImpactTexture(size=256){
  const cnv = document.createElement("canvas"); cnv.width=size; cnv.height=size;
  const ctx = cnv.getContext("2d")!;
  const cx=size/2, cy=size/2, rO=size*0.45, rI=size*0.28;
  ctx.clearRect(0,0,size,size);
  const g = ctx.createRadialGradient(cx,cy,rI,cx,cy,rO);
  g.addColorStop(0,"rgba(255,255,255,.8)");
  g.addColorStop(0.6,"rgba(255,255,255,.25)");
  g.addColorStop(1,"rgba(255,255,255,0)");
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx,cy,rO,0,Math.PI*2); ctx.fill();
  ctx.lineWidth = Math.max(2, size*0.04);
  ctx.strokeStyle = "rgba(255,255,255,.95)";
  ctx.beginPath(); ctx.arc(cx,cy,(rO+rI)/2,0,Math.PI*2); ctx.stroke();
  const tex = new THREE.CanvasTexture(cnv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter=THREE.LinearFilter;
  tex.minFilter=THREE.LinearMipmapLinearFilter; tex.generateMipmaps=true;
  return tex;
}
