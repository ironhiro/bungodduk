"use client";

import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";

type Config = {
  sizeMin: number;
  sizeMax: number;
  speedMul: number;     // 이동 속도 배율 (프레임마다 적용)
  rotMul: number;       // 회전 속도 배율 (프레임마다 적용)
  splitDeflect: number;
  bounceDeflect: number;
  cubeAlpha: number;    // CSS 변수로 반영
  glitchMs: number;     // 글리치 지속
};

type Bounds = { w: number; h: number };

const BASE = {
  SPEED_RANGE: [300, 600] as [number, number], // px/s (base 값)
  ROT_RANGE: [80, 200] as [number, number],    // deg/s (base 값)
  MAX_CUBES: 64,
};
const MIN_SIZE = 1;

const CubeStage = forwardRef<{ reset: () => void }, { config: Config }>(
  ({ config }, ref) => {
    const stageRef = useRef<HTMLDivElement | null>(null);
    const glitchRef = useRef<HTMLDivElement | null>(null);

    const cubesRef = useRef<Cube[]>([]);
    const rafIdRef = useRef<number | null>(null);
    const lastTsRef = useRef<number>(0);
    const glitchingRef = useRef<boolean>(false);

    // 배경 알파는 CSS 변수로 즉시 반영
    useEffect(() => {
      document.documentElement.style.setProperty("--cube-alpha", String(config.cubeAlpha));
    }, [config.cubeAlpha]);

    // 외부에서 재시작
    useImperativeHandle(ref, () => ({
      reset: () => {
        if (glitchingRef.current) return;
        destroyAll();
        cubesRef.current = [makeRandomCube()];
        lastTsRef.current = 0;
        if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = requestAnimationFrame(animate);
      },
    }));

    // 마운트 시 1회 시작
    useEffect(() => {
      destroyAll();
      cubesRef.current = [makeRandomCube()];
      lastTsRef.current = 0;
      rafIdRef.current = requestAnimationFrame(animate);

      const onResize = () => {
        const b = getBounds();
        cubesRef.current.forEach((c) => {
          c.x = Math.max(0, Math.min(b.w - c.size, c.x));
          c.y = Math.max(0, Math.min(b.h - c.size, c.y));
          c.resizeText();
        });
      };
      window.addEventListener("resize", onResize);
      return () => {
        window.removeEventListener("resize", onResize);
        if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
        destroyAll();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ===== Cube =====
    class Cube {
      size: number;
      x: number;
      y: number;
      // ⚠️ base 속도/회전값 (배율은 tick 때 곱해 사용)
      vx: number;
      vy: number;
      rx: number;
      ry: number;
      rxSpeed: number;
      rySpeed: number;
      justBouncedCooldown: number;

      entity: HTMLDivElement;
      cube: HTMLDivElement;
      faces: Record<string, HTMLDivElement>;

      constructor(o: { size: number; x: number; y: number; vx: number; vy: number; rxSpeed: number; rySpeed: number; }) {
        this.size = o.size;
        this.x = o.x;
        this.y = o.y;
        this.vx = o.vx;
        this.vy = o.vy;
        this.rx = Math.random() * 360;
        this.ry = Math.random() * 360;
        this.rxSpeed = o.rxSpeed;
        this.rySpeed = o.rySpeed;
        this.justBouncedCooldown = 0;

        this.entity = document.createElement("div");
        this.entity.className = "cube-entity";
        this.entity.style.width = `${this.size}px`;
        this.entity.style.height = `${this.size}px`;

        this.cube = document.createElement("div");
        this.cube.className = "cube";
        this.entity.appendChild(this.cube);

        const faces: Record<string, HTMLDivElement> = {};
        for (const key of ["front","back","right","left","top","bottom"]) {
          const face = document.createElement("div");
          face.className = "face";
          const lines = document.createElement("div");
          lines.className = "lines";
          ["붕 오 떡","어 볶","빵 뎅 이"].forEach(txt => {
            const line = document.createElement("span");
            line.className = "line";
            line.textContent = txt;
            lines.appendChild(line);
          });
          face.appendChild(lines);
          faces[key] = face;
          this.cube.appendChild(face);
        }
        this.faces = faces;

        stageRef.current?.appendChild(this.entity);
        this.updateFaceTransforms();
        this.fitTextAll();
        this.updateDom(0);
      }

      updateFaceTransforms() {
        const tz = this.size / 2;
        this.faces.front.style.transform  = `rotateY(0deg) translateZ(${tz}px)`;
        this.faces.back.style.transform   = `rotateY(180deg) translateZ(${tz}px)`;
        this.faces.right.style.transform  = `rotateY(90deg) translateZ(${tz}px)`;
        this.faces.left.style.transform   = `rotateY(-90deg) translateZ(${tz}px)`;
        this.faces.top.style.transform    = `rotateX(90deg) translateZ(${tz}px)`;
        this.faces.bottom.style.transform = `rotateX(-90deg) translateZ(${tz}px)`;
      }

      updateDom(dt: number) {
        // 회전: base * 현재 배율
        this.rx = (this.rx + this.rxSpeed * config.rotMul * dt) % 360;
        this.ry = (this.ry + this.rySpeed * config.rotMul * dt) % 360;

        this.entity.style.transform = `translate3d(${this.x}px, ${this.y}px, 0)`;
        const rotStr = `rotateX(${this.rx}deg) rotateY(${this.ry}deg)`;
        this.cube.style.setProperty("--rot", rotStr);
        this.cube.style.transform = rotStr;
      }

      tick(dt: number, bounds: Bounds) {
        this.justBouncedCooldown = Math.max(0, this.justBouncedCooldown - dt * 1000);

        // 이동: base * 현재 배율
        this.x += this.vx * config.speedMul * dt;
        this.y += this.vy * config.speedMul * dt;

        let bounced = false;
        let axis: "x" | "y" | null = null;

        if (this.x < 0) {
          this.x = 0;
          this.vx = Math.abs(this.vx) + Math.sign(this.vx || 1) * config.bounceDeflect * Math.random();
          bounced = true; axis = "x";
        } else if (this.x + this.size > bounds.w) {
          this.x = bounds.w - this.size;
          this.vx = -Math.abs(this.vx) - Math.sign(this.vx || 1) * config.bounceDeflect * Math.random();
          bounced = true; axis = "x";
        }
        if (this.y < 0) {
          this.y = 0;
          this.vy = Math.abs(this.vy) + Math.sign(this.vy || 1) * config.bounceDeflect * Math.random();
          bounced = true; axis = "y";
        } else if (this.y + this.size > bounds.h) {
          this.y = bounds.h - this.size;
          this.vy = -Math.abs(this.vy) - Math.sign(this.vy || 1) * config.bounceDeflect * Math.random();
          bounced = true; axis = "y";
        }

        if (bounced && this.justBouncedCooldown <= 0) {
          this.cube.classList.remove("hit"); void this.cube.offsetWidth; this.cube.classList.add("hit");

          const tilt = 10 + Math.random() * 30;
          if (axis === "x") this.rySpeed += (Math.random() > 0.5 ? 1 : -1) * tilt;
          else this.rxSpeed += (Math.random() > 0.5 ? 1 : -1) * tilt;

          this.justBouncedCooldown = 120;

          spawnImpact(this.x + this.size / 2, this.y + this.size / 2);
          this.splitOnWallBounce(axis!);
        }

        this.updateDom(dt);
      }

      splitOnWallBounce(axis: "x" | "y") {
        if (this.size <= MIN_SIZE) { triggerGlitchAndReset(); return; }
        const half = Math.floor(this.size / 2);
        if (half < MIN_SIZE || cubesRef.current.length >= BASE.MAX_CUBES) {
          triggerGlitchAndReset(); return;
        }

        const base = {
          size: half,
          x: this.x + (this.size - half) / 2,
          y: this.y + (this.size - half) / 2,
          rxSpeed: this.rxSpeed * (0.85 + Math.random() * 0.5),
          rySpeed: this.rySpeed * (0.85 + Math.random() * 0.5),
        };

        let a: Cube, b: Cube;
        if (axis === "x") {
          // 가로 벽 → 상/하 분열 (반대축)
          const mag = Math.max(Math.abs(this.vy), config.splitDeflect);
          a = new Cube({ ...base, vx: this.vx, vy:  mag });
          b = new Cube({ ...base, vx: this.vx, vy: -mag });
        } else {
          // 세로 벽 → 좌/우 분열 (반대축)
          const mag = Math.max(Math.abs(this.vx), config.splitDeflect);
          a = new Cube({ ...base, vx:  mag, vy: this.vy });
          b = new Cube({ ...base, vx: -mag, vy: this.vy });
        }

        const idx = cubesRef.current.indexOf(this);
        if (idx !== -1) cubesRef.current.splice(idx, 1);
        this.destroy();

        a.updateFaceTransforms();
        b.updateFaceTransforms();
        cubesRef.current.push(a, b);
      }

      resizeText() { this.fitTextAll(); }
      destroy() { this.entity.remove(); }

      // === 텍스트 레이아웃 ===
      fitTextAll() {
        const faceList = Object.values(this.faces);
        const cs = getComputedStyle(faceList[0]);
        const padX = px(cs.paddingLeft) + px(cs.paddingRight);
        const padY = px(cs.paddingTop) + px(cs.paddingBottom);
        const usableW = this.size - padX;
        const usableH = this.size - padY;

        let fontSize = Math.max(10, this.size * 0.20);
        const lineH = (fs: number) => fs * 1.05;
        while ((lineH(fontSize) * 3) > usableH && fontSize > 6) fontSize -= 1;

        faceList.forEach(face => {
          const els = Array.from(face.querySelectorAll<HTMLSpanElement>(".line"));
          els.forEach(l => { l.style.fontSize = `${fontSize}px`; l.style.letterSpacing = "0px"; });

          const maxRaw = Math.max(...els.map(measureTextWidth));
          while (maxRaw > usableW && fontSize > 6) {
            fontSize -= 1;
            els.forEach(l => { l.style.fontSize = `${fontSize}px`; });
          }

          const total = lineH(fontSize) * 3;
          const minOuter = Math.max(4, this.size * 0.02);
          let leftover = Math.max(0, (usableH - total) - minOuter * 2);
          const gap = leftover > 0 ? leftover / 2 : 0;
          const wrap = face.querySelector<HTMLDivElement>(".lines")!;
          wrap.style.gap = `${gap}px`;
          wrap.style.paddingTop = `${minOuter}px`;
          wrap.style.paddingBottom = `${minOuter}px`;

          els.forEach(l => {
            const text = l.textContent ?? "";
            const chars = [...text];
            const gaps = Math.max(1, chars.length - 1);
            const rawW = measureTextWidth(l);
            let spacing = (usableW - rawW) / gaps;
            if (!isFinite(spacing) || spacing < 0) spacing = 0;
            l.style.letterSpacing = `${spacing}px`;
            l.style.display = "block";
            l.style.width = `${usableW}px`;
            l.style.textAlign = "left";
          });
        });
      }
    }

    // ===== 유틸 =====
    const px = (v: string) => parseFloat(v || "0");
    function measureTextWidth(lineEl: HTMLElement) {
      const meas = document.createElement("span");
      meas.textContent = lineEl.textContent || "";
      const cs = getComputedStyle(lineEl);
      meas.style.position = "absolute";
      meas.style.visibility = "hidden";
      meas.style.whiteSpace = "pre";
      meas.style.fontFamily = cs.fontFamily;
      meas.style.fontSize = cs.fontSize;
      meas.style.fontWeight = cs.fontWeight;
      document.body.appendChild(meas);
      const w = meas.getBoundingClientRect().width;
      meas.remove();
      return w;
    }
    const randIn = ([a, b]: [number, number]) => a + Math.random() * (b - a);
    const randSign = () => (Math.random() < 0.5 ? -1 : 1);
    const getBounds = (): Bounds => {
      const el = stageRef.current!;
      return { w: el.clientWidth, h: el.clientHeight };
    };

    function spawnImpact(x: number, y: number) {
      const dot = document.createElement("div");
      dot.className = "impact";
      dot.style.left = `${x}px`;
      dot.style.top = `${y}px`;
      stageRef.current?.appendChild(dot);
      dot.addEventListener("animationend", () => dot.remove(), { once: true });
    }

    function makeRandomCube(): Cube {
      const b = getBounds();
      const sizeMin = Math.min(config.sizeMin, config.sizeMax);
      const sizeMax = Math.max(config.sizeMin, config.sizeMax);
      const size = Math.floor(randIn([sizeMin, sizeMax]));

      const x = Math.max(0, Math.min(b.w - size, Math.random() * (b.w - size)));
      const y = Math.max(0, Math.min(b.h - size, Math.random() * (b.h - size)));

      const speedRange: [number, number] = BASE.SPEED_RANGE; // base 값 생성
      const rotRange: [number, number]   = BASE.ROT_RANGE;   // base 값 생성

      const vx = randSign() * randIn(speedRange);
      const vy = randSign() * randIn(speedRange);
      const rx = randIn(rotRange) * randSign();
      const ry = randIn(rotRange) * randSign();

      return new Cube({ size, x, y, vx, vy, rxSpeed: rx, rySpeed: ry });
    }

    function destroyAll() {
      cubesRef.current.forEach((c) => c.destroy());
      cubesRef.current = [];
    }

    function triggerGlitchAndReset() {
      if (glitchingRef.current) return;
      glitchingRef.current = true;
      if (rafIdRef.current) { cancelAnimationFrame(rafIdRef.current); rafIdRef.current = null; }

      const g = glitchRef.current!;
      g.classList.remove("active"); void g.offsetWidth; g.classList.add("active");

      destroyAll();

      setTimeout(() => {
        g.classList.remove("active");
        cubesRef.current.push(makeRandomCube());
        glitchingRef.current = false;
        if (!rafIdRef.current) rafIdRef.current = requestAnimationFrame(animate);
      }, config.glitchMs);
    }

    const animate = (ts: number) => {
      if (!lastTsRef.current) lastTsRef.current = ts;
      const dt = Math.min(0.032, (ts - lastTsRef.current) / 1000);
      lastTsRef.current = ts;

      const bounds = getBounds();
      const snapshot = cubesRef.current.slice();
      for (let i = 0; i < snapshot.length; i++) {
        const c = snapshot[i];
        if (!c) continue;
        c.tick(dt, bounds); // ← tick에서 매번 최신 config 사용
      }

      if (!glitchingRef.current && cubesRef.current.some((c) => c.size <= MIN_SIZE)) {
        triggerGlitchAndReset();
        return;
      }

      rafIdRef.current = requestAnimationFrame(animate);
    };

    return (
      <>
        <div id="stage" ref={stageRef} aria-label="3D Cube Stage" />
        <div id="glitch" ref={glitchRef} aria-hidden="true" />
      </>
    );
  }
);

export default CubeStage;
