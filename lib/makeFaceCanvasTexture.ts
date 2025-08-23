import * as THREE from "three";

export async function makeFaceCanvasTextureAsync(opts: {
  lines: string[];
  w: number; h: number; pad: number;
  bgRGBA: [number, number, number, number];
  color: string;
  fontFamily: string;   // "'Black Han Sans', sans-serif"
}) {
  const { lines, w, h, pad, bgRGBA, color, fontFamily } = opts;

  // ★ 폰트 로드 대기 (가장 확실)
  if (document && "fonts" in document) {
    try {
      // 특정 크기로 명시적으로 한 번 로드
      // 가끔 일부 브라우저에서 family만으론 미적용되는 케이스가 있어 weight+size까지 명시
      await (document as any).fonts.load(`400 64px ${fontFamily}`);
      await (document as any).fonts.ready;
    } catch {}
  }

  const cnv = document.createElement("canvas");
  cnv.width = w; cnv.height = h;
  const ctx = cnv.getContext("2d")!;
  ctx.clearRect(0,0,w,h);

  // 배경(반투명)
  ctx.fillStyle = `rgba(${bgRGBA[0]},${bgRGBA[1]},${bgRGBA[2]},${bgRGBA[3] / 255})`;
  ctx.fillRect(0,0,w,h);

  const usableW = w - pad*2;
  const usableH = h - pad*2;

  let fontSize = Math.floor(h * 0.2);
  const lineH = (fs:number)=> fs * 1.05;
  const setFont = (fs:number) => (ctx.font = `${fs}px ${fontFamily}`);

  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  setFont(fontSize);
  while (lineH(fontSize) * 3 > usableH && fontSize > 6) { fontSize--; setFont(fontSize); }

  const rawWidths = () => lines.map(t => ctx.measureText(t.split("").join("")).width);
  while (Math.max(...rawWidths()) > usableW && fontSize > 6) { fontSize--; setFont(fontSize); }

  const total = lineH(fontSize) * 3;
  const minOuter = Math.max(4, h * 0.02);
  const leftover = Math.max(0, (usableH - total) - minOuter*2);
  const gap = leftover > 0 ? leftover / 2 : 0;
  const y0 = pad + minOuter + fontSize;

  ctx.fillStyle = color;

  lines.forEach((text, i) => {
    const chars = [...text];
    const gaps = Math.max(1, chars.length - 1);
    const rawW = ctx.measureText(chars.join("")).width;
    const spacing = gaps > 0 ? Math.max(0, (usableW - rawW) / gaps) : 0;

    const baseX = pad;
    const y = y0 + i * (lineH(fontSize) + gap);

    let x = baseX;
    for (const ch of chars) {
      ctx.fillText(ch, x, y);
      x += ctx.measureText(ch).width + spacing;
    }
  });

  const tex = new THREE.CanvasTexture(cnv);
  tex.colorSpace = THREE.SRGBColorSpace;
  // 품질/아티팩트 완화
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}
