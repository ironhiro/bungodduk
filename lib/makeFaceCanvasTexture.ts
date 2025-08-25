import * as THREE from "three";

function quoteFamily(f: string){
  const s = f.trim();
  if(!s) return s;
  if(s.startsWith("'")||s.startsWith("\"")) return s;
  return /[^a-zA-Z0-9_-]/.test(s) ? `"${s}"` : s;
}

async function resolveLoadedFamily(prefer?: string){
  const cssVar = getComputedStyle(document.documentElement).getPropertyValue("--font-black-han-sans")?.trim();
  const candidates = [prefer?.trim(), cssVar, "Black Han Sans"].filter(Boolean) as string[];
  for(const fam of candidates){
    const q = quoteFamily(fam);
    try{
      if((document as any).fonts){
        await (document as any).fonts.load(`400 64px ${q}`);
        const ok = (document as any).fonts.check(`400 32px ${q}`);
        if(ok) return q;
      }
    }catch{}
  }
  return quoteFamily(candidates[candidates.length-1] || "sans-serif");
}

export async function makeFaceCanvasTextureAsync(opts: {
  lines: string[];
  w: number; h: number; pad: number;
  bgRGBA: [number,number,number,number];
  color: string;
  fontFamily?: string;
}){
  const { lines, w, h, pad, bgRGBA, color, fontFamily } = opts;
  const fam = await resolveLoadedFamily(fontFamily);

  const cnv = document.createElement("canvas");
  cnv.width = w; cnv.height = h;
  const ctx = cnv.getContext("2d")!;
  ctx.clearRect(0,0,w,h);

  ctx.fillStyle = `rgba(${bgRGBA[0]},${bgRGBA[1]},${bgRGBA[2]},${bgRGBA[3]/255})`;
  ctx.fillRect(0,0,w,h);

  const usableW = w - pad*2;
  const usableH = h - pad*2;

  let fontSize = Math.floor(h*0.2);
  const lineH = (fs:number)=> fs*1.05;
  const setFont = (fs:number)=> (ctx.font = `900 ${fs}px ${fam}`);
  ctx.textBaseline="alphabetic"; ctx.textAlign="left";
  setFont(fontSize);
  while(lineH(fontSize)*3 > usableH && fontSize>6){ fontSize--; setFont(fontSize); }

  const widthOf = (t:string)=> ctx.measureText(t.split("").join("")).width;
  while(Math.max(...lines.map(widthOf)) > usableW && fontSize>6){ fontSize--; setFont(fontSize); }

  const total = lineH(fontSize)*3;
  const minOuter = Math.max(4, h*0.02);
  const leftover = Math.max(0, (usableH - total) - minOuter*2);
  const gap = leftover>0 ? leftover/2 : 0;
  const y0 = pad + minOuter + fontSize;

  ctx.fillStyle = color;

  lines.forEach((text,i)=>{
    const chars = [...text];
    const gaps = Math.max(1, chars.length-1);
    const rawW = widthOf(text);
    const spacing = gaps>0 ? Math.max(0, (usableW - rawW)/gaps) : 0;
    const baseX = pad;
    const y = y0 + i*(lineH(fontSize)+gap);
    let x = baseX;
    for(const ch of chars){
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
