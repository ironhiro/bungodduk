"use client";

import { forwardRef, useImperativeHandle, useMemo, useRef, useState, useEffect } from "react";
import { useThree, useFrame, } from "@react-three/fiber";
import * as THREE from "three";
import { CubeMesh } from "@/components/CubeMesh";
import { makeFaceCanvasTextureAsync } from "@/lib/makeFaceCanvasTexture";

export type CubeConfig = {
  sizeMin: number; sizeMax: number;
  speedMul: number; rotMul: number;
  splitDeflect: number; bounceDeflect: number;
  cubeAlpha: number; glitchMs: number;
};

export type CubeFieldRef = { reset: () => void };

type CubeData = {
  id: number;
  size: number;
  x: number; y: number;
  vx: number; vy: number;               // base 속도 (배율은 매 프레임 곱)
  rx: number; ry: number;
  rxSpeed: number; rySpeed: number;     // base 회전 속도
  cooldown: number;                     // 벽 튕김 연속 처리 방지(ms)
};

const MIN_SIZE = 1;
let idSeq = 1;

export const CubeField = forwardRef<CubeFieldRef, { config: CubeConfig }>(
  ({ config }, ref) => {
    const { size: viewport } = useThree();         // 화면 크기
    const W = viewport.width;
    const H = viewport.height;
    const [cubes, setCubes] = useState<CubeData[]>(() => [makeRandomCube(config, viewport.width, viewport.height)]);
    const glitchingRef = useRef(false);

   const [materials, setMaterials] = useState<THREE.Material[] | null>(null);

    useEffect(() => {
    let alive = true;
    (async () => {
        const tex = await makeFaceCanvasTextureAsync({
        lines: ["붕 오 떡", "어 볶", "빵 뎅 이"],
        w: 1024, h: 1024, pad: 64,
        bgRGBA: [255, 212, 0, Math.round(config.cubeAlpha * 255)],
        color: "#000000",
        fontFamily: "'Black Han Sans'"
        });
        if (!alive) return;
        const mat = new THREE.MeshBasicMaterial({
        map: tex, transparent: true, depthWrite: false, alphaTest: 0.01
        });
        setMaterials([0,1,2,3,4,5].map(() => mat));
    })();
    return () => { alive = false; };
    }, [config.cubeAlpha]);
    // 외부 reset API
    useImperativeHandle(ref, () => ({
      reset() {
        if (glitchingRef.current) return;
        setCubes([makeRandomCube(config, viewport.width, viewport.height)]);
      }
    }), [config, viewport.width, viewport.height]);

    // 메인 루프
    useFrame((_, dt) => {
      const dts = Math.min(dt, 0.032);
      const W = viewport.width;
      const H = viewport.height;

      let changed = false;
      let next = cubes.map(c => ({ ...c }));

      for (let i = 0; i < next.length; i++) {
        const c = next[i];

        // 이동/회전: base * 배율 (슬라이더 변경 즉시 다음 프레임 반영)
        c.x += c.vx * config.speedMul * dts;
        c.y += c.vy * config.speedMul * dts;
        c.rx = (c.rx + c.rxSpeed * config.rotMul * dts) % 360;
        c.ry = (c.ry + c.rySpeed * config.rotMul * dts) % 360;
        c.cooldown = Math.max(0, c.cooldown - dts * 1000);

        let bounced = false;
        let axis: "x" | "y" | null = null;

        if (c.x < 0) { c.x = 0; c.vx = Math.abs(c.vx) + Math.sign(c.vx || 1) * config.bounceDeflect * Math.random(); bounced = true; axis = "x"; }
        else if (c.x + c.size > W) { c.x = W - c.size; c.vx = -Math.abs(c.vx) - Math.sign(c.vx || 1) * config.bounceDeflect * Math.random(); bounced = true; axis = "x"; }

        if (c.y < 0) { c.y = 0; c.vy = Math.abs(c.vy) + Math.sign(c.vy || 1) * config.bounceDeflect * Math.random(); bounced = true; axis = "y"; }
        else if (c.y + c.size > H) { c.y = H - c.size; c.vy = -Math.abs(c.vy) - Math.sign(c.vy || 1) * config.bounceDeflect * Math.random(); bounced = true; axis = "y"; }

        if (bounced && c.cooldown <= 0) {
          c.cooldown = 120;

          // 벽에서만 분열(반대축)
          const res = trySplit(c, axis!, config);
          if (res) {
            next.splice(i, 1, res.a, res.b);
            changed = true;
          }
        }
      }

      // 글리치 조건
      if (!glitchingRef.current && next.some(c => c.size <= MIN_SIZE)) {
        glitchingRef.current = true;
        setCubes([]); // 리스트 비움 (구조 변화)
        const g = document.getElementById("glitch");
        if (g) { g.classList.remove("active"); void g.offsetWidth; g.classList.add("active"); }
        setTimeout(() => {
        if (g) g.classList.remove("active");
        // materials 준비 전이면 먼저 materials가 준비되었는지 확인
        const ready = true; // materials가 null 아닌지 체크 가능
        setCubes([makeRandomCube(config, W, H)]);
        glitchingRef.current = false;
        }, config.glitchMs);
        return;
        }

      if (changed) setCubes(next);
      else if (next !== cubes) setCubes(next);
    });

    return (
      <>
        {materials && cubes.map(c => (
        <CubeMesh key={c.id} d={c} W={W} H={H} materials={materials} />
        ))}
      </>
    );
  }
);

// === 분열 로직: 가로 벽 → 상/하, 세로 벽 → 좌/우 ===
function trySplit(c: CubeData, axis: "x" | "y", cfg: CubeConfig) {
  if (c.size <= MIN_SIZE) return null;
  const half = Math.floor(c.size / 2);
  if (half < MIN_SIZE) return null;

  const base = {
    size: half,
    x: c.x + (c.size - half) / 2,
    y: c.y + (c.size - half) / 2,
    rxSpeed: c.rxSpeed * (0.85 + Math.random() * 0.5),
    rySpeed: c.rySpeed * (0.85 + Math.random() * 0.5),
    rx: c.rx, ry: c.ry,
    cooldown: 0
  };

  let a: CubeData, b: CubeData;
  if (axis === "x") {
    const mag = Math.max(Math.abs(c.vy), cfg.splitDeflect);
    a = { id: ++idSeq, ...base, vx: c.vx, vy:  mag };
    b = { id: ++idSeq, ...base, vx: c.vx, vy: -mag };
  } else {
    const mag = Math.max(Math.abs(c.vx), cfg.splitDeflect);
    a = { id: ++idSeq, ...base, vx:  mag, vy: c.vy };
    b = { id: ++idSeq, ...base, vx: -mag, vy: c.vy };
  }
  return { a, b };
}

// === 랜덤 큐브 생성 ===
function makeRandomCube(cfg: CubeConfig, W: number, H: number): CubeData {
  const sizeMin = Math.min(cfg.sizeMin, cfg.sizeMax);
  const sizeMax = Math.max(cfg.sizeMin, cfg.sizeMax);
  const size = Math.floor(randIn([sizeMin, sizeMax]));

  const x = Math.max(0, Math.min(W - size, Math.random() * (W - size)));
  const y = Math.max(0, Math.min(H - size, Math.random() * (H - size)));

  const vx = randSign() * randIn([300, 600]);
  const vy = randSign() * randIn([300, 600]);
  const rxSpeed = randSign() * randIn([80, 200]);
  const rySpeed = randSign() * randIn([80, 200]);

  return { id: ++idSeq, size, x, y, vx, vy, rx: Math.random()*360, ry: Math.random()*360, rxSpeed, rySpeed, cooldown: 0 };
}

const randIn = ([a,b]:[number,number]) => a + Math.random()*(b-a);
const randSign = () => Math.random() < .5 ? -1 : 1;
