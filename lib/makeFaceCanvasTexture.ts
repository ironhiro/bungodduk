import * as THREE from "three";

// 따옴표 보정
function quoteFamily(f: string) {
  const s = f.trim();
  if (!s) return s;
  // 이미 따옴표가 있으면 그대로
  if (s.startsWith("'") || s.startsWith('"')) return s;
  // 공백/특수문자 포함 시 따옴표로 감싸기
  return /[^a-zA-Z0-9_-]/.test(s) ? `"${s}"` : s;
}

// CSS 변수/후보군에서 실제 사용 가능한 패밀리명 고르기
async function resolveLoadedFamily(prefer?: string) {
  // 다음 순서로 시도
  const cssVar =
    getComputedStyle(document.documentElement).getPropertyValue(
      "--font-black-han-sans"
    )?.trim();
  const candidates = [
    prefer?.trim(),
    cssVar,
    "Black Han Sans", // 공용 이름
  ].filter(Boolean) as string[];

  // 적당한 크기 하나 지정해서 load/check
  for (const fam of candidates) {
    const q = quoteFamily(fam);
    try {
      if ((document as any).fonts) {
        await (document as any).fonts.load(`400 64px ${q}`);
        const ok = (document as any).fonts.check(`400 32px ${q}`);
        if (ok) return q;
      }
    } catch {
      // 계속 다음 후보 시도
    }
  }
  // 다 실패하면 마지막 후보 반환
  return quoteFamily(candidates[candidates.length - 1] || "sans-serif");
}


export async function makeFaceCanvasTextureAsync(opts: {
  lines: string[];
  w: number; h: number; pad: number;
  bgRGBA: [number, number, number, number];
  color: string;
  fontFamily?: string;   // "'Black Han Sans', sans-serif"
}) {
  const { lines, w, h, pad, bgRGBA, color, fontFamily } = opts;

  // ★ 실사용 패밀리명 확정 + 로드 대기
  const fam = await resolveLoadedFamily(fontFamily);

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

  const setFont = (fs:number) => (ctx.font = `900 ${fs}px "Black Han Sans"`);
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
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}
