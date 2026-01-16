"use client";

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CubeMesh, type CubeData } from "@/components/CubeMesh";
import { ImpactMesh, type ImpactData } from "@/components/ImpactMesh";
import { makeFaceCanvasTextureAsync } from "@/lib/makeFaceCanvasTexture";

// Constants
const MIN_SIZE = 1;
const CUBE_FACES = 6;
const IMPACT_LIFE = 0.45;
const IMPACT_SIZE = 28;
const COOLDOWN_MS = 120;
const MAX_DELTA = 0.032;
const VELOCITY_RANGE = [300, 600] as const;
const ROTATION_SPEED_RANGE = [80, 200] as const;

// Types
export interface CubeConfig {
  readonly sizeMin: number;
  readonly sizeMax: number;
  readonly speedMul: number;
  readonly rotMul: number;
  readonly splitDeflect: number;
  readonly bounceDeflect: number;
  readonly cubeAlpha: number;
  readonly glitchMs: number;
}

export interface CubeFieldRef {
  reset: () => void;
}

interface CubeFieldProps {
  readonly config: CubeConfig;
}

// Module-level state
let idSeq = 1;

export const CubeField = forwardRef<CubeFieldRef, CubeFieldProps>(
  function CubeField({ config }, ref) {
    const { size: viewport, clock } = useThree();
    const { width: W, height: H } = viewport;

    // Simulation data (stored in ref to avoid re-renders per frame)
    const cubesRef = useRef<CubeData[]>([]);
    const [ids, setIds] = useState<number[]>([]);

    // Impact effects
    const impactsRef = useRef<ImpactData[]>([]);
    const [impactIds, setImpactIds] = useState<number[]>([]);
    const impactSeqRef = useRef(1);

    // State flags
    const glitchingRef = useRef(false);
    const materialsRef = useRef<THREE.Material[] | null>(null);
    const [materialsReady, setMaterialsReady] = useState(false);

    // Load materials (depends on cubeAlpha for background alpha)
    useEffect(() => {
      const controller = new AbortController();

      const loadMaterials = async () => {
        const tex = await makeFaceCanvasTextureAsync({
          lines: ["붕 오 떡", "어 볶", "빵 뎅 이"],
          w: 1_024,
          h: 1_024,
          pad: 64,
          bgRGBA: [255, 212, 0, Math.round(config.cubeAlpha * 255)],
          color: "#000000",
        });

        if (controller.signal.aborted) return;

        const mat = new THREE.MeshBasicMaterial({
          map: tex,
          transparent: true,
          depthWrite: false,
          alphaTest: 0.01,
        });
        materialsRef.current = Array.from({ length: CUBE_FACES }, () => mat);
        setMaterialsReady(true);
      };

      loadMaterials();
      return () => controller.abort();
    }, [config.cubeAlpha]);

    // Initial seed
    useEffect(() => {
      if (!materialsReady) return;
      const seed = makeRandomCube(config, W, H);
      cubesRef.current = [seed];
      setIds([seed.id]);
    }, [materialsReady, W, H, config]);

    // Expose reset API
    useImperativeHandle(
      ref,
      () => ({
        reset() {
          if (glitchingRef.current) return;
          const seed = makeRandomCube(config, W, H);
          cubesRef.current = [seed];
          setIds([seed.id]);
        },
      }),
      [W, H, config]
    );

    // Spawn impact effect
    const spawnImpact = useCallback(
      (x: number, y: number) => {
        const id = impactSeqRef.current++;
        const impact: ImpactData = {
          id,
          x,
          y,
          start: clock.getElapsedTime(),
          life: IMPACT_LIFE,
          size: IMPACT_SIZE,
        };
        impactsRef.current = [...impactsRef.current, impact];
        setImpactIds((prev) => [...prev, id]);
      },
      [clock]
    );

    // Main simulation loop
    useFrame((_, dt) => {
      if (!materialsRef.current || ids.length === 0 || glitchingRef.current) {
        return;
      }

      const deltaTime = Math.min(dt, MAX_DELTA);
      const next = cubesRef.current.map((c) => ({ ...c }));
      let structureChanged = false;

      for (let i = 0; i < next.length; i++) {
        const cube = next[i];

        // Update position
        cube.x += cube.vx * config.speedMul * deltaTime;
        cube.y += cube.vy * config.speedMul * deltaTime;

        // Update rotation
        cube.rx = (cube.rx + cube.rxSpeed * config.rotMul * deltaTime) % 360;
        cube.ry = (cube.ry + cube.rySpeed * config.rotMul * deltaTime) % 360;

        // Update cooldown
        cube.cooldown = Math.max(0, (cube.cooldown ?? 0) - deltaTime * 1_000);

        // Check wall collisions
        let bounced = false;
        let axis: "x" | "y" | null = null;

        // Left/Right walls
        if (cube.x < 0) {
          cube.x = 0;
          cube.vx =
            Math.abs(cube.vx) +
            Math.sign(cube.vx || 1) * config.bounceDeflect * Math.random();
          bounced = true;
          axis = "x";
        } else if (cube.x + cube.size > W) {
          cube.x = W - cube.size;
          cube.vx =
            -Math.abs(cube.vx) -
            Math.sign(cube.vx || 1) * config.bounceDeflect * Math.random();
          bounced = true;
          axis = "x";
        }

        // Top/Bottom walls
        if (cube.y < 0) {
          cube.y = 0;
          cube.vy =
            Math.abs(cube.vy) +
            Math.sign(cube.vy || 1) * config.bounceDeflect * Math.random();
          bounced = true;
          axis = "y";
        } else if (cube.y + cube.size > H) {
          cube.y = H - cube.size;
          cube.vy =
            -Math.abs(cube.vy) -
            Math.sign(cube.vy || 1) * config.bounceDeflect * Math.random();
          bounced = true;
          axis = "y";
        }

        // Handle split on bounce
        if (bounced && (cube.cooldown ?? 0) <= 0) {
          cube.cooldown = COOLDOWN_MS;
          spawnImpact(cube.x + cube.size / 2, cube.y + cube.size / 2);

          const splitResult = trySplit(cube, axis!, config);
          if (splitResult) {
            next.splice(i, 1, splitResult.a, splitResult.b);
            structureChanged = true;
            i++; // Skip next inserted to avoid immediate re-processing
          }
        }
      }

      // Trigger glitch effect if any cube is too small
      if (!glitchingRef.current && next.some((c) => c.size <= MIN_SIZE)) {
        glitchingRef.current = true;
        cubesRef.current = [];
        setIds([]);

        const glitchEl = document.getElementById("glitch");
        if (glitchEl) {
          glitchEl.classList.remove("active");
          void glitchEl.offsetWidth; // Force reflow
          glitchEl.classList.add("active");
        }

        setTimeout(() => {
          glitchEl?.classList.remove("active");
          const seed = makeRandomCube(config, W, H);
          cubesRef.current = [seed];
          setIds([seed.id]);
          glitchingRef.current = false;
        }, config.glitchMs);
        return;
      }

      // Cleanup expired impacts
      const now = clock.getElapsedTime();
      const activeImpacts = impactsRef.current.filter(
        (impact) => now - impact.start < impact.life
      );

      if (activeImpacts.length !== impactsRef.current.length) {
        impactsRef.current = activeImpacts;
        setImpactIds(activeImpacts.map((i) => i.id));
      }

      cubesRef.current = next;
      if (structureChanged) {
        setIds(next.map((c) => c.id));
      }
    });

    if (!materialsRef.current) return null;

    return (
      <>
        {ids.map((id) => (
          <CubeMesh
            key={id}
            id={id}
            getData={() => cubesRef.current.find((c) => c.id === id)!}
            W={W}
            H={H}
            materials={materialsRef.current!}
          />
        ))}
        {impactIds.map((id) => (
          <ImpactMesh
            key={id}
            W={W}
            H={H}
            getData={() => impactsRef.current.find((i) => i.id === id)}
          />
        ))}
      </>
    );
  }
);

// Helper functions
const randIn = (range: readonly [number, number]): number =>
  range[0] + Math.random() * (range[1] - range[0]);

const randSign = (): 1 | -1 => (Math.random() < 0.5 ? -1 : 1);

function makeRandomCube(cfg: CubeConfig, W: number, H: number): CubeData {
  const sizeMin = Math.min(cfg.sizeMin, cfg.sizeMax);
  const sizeMax = Math.max(cfg.sizeMin, cfg.sizeMax);
  const size = Math.floor(randIn([sizeMin, sizeMax]));

  const x = Math.max(0, Math.min(W - size, Math.random() * (W - size)));
  const y = Math.max(0, Math.min(H - size, Math.random() * (H - size)));

  return {
    id: ++idSeq,
    size,
    x,
    y,
    rx: Math.random() * 360,
    ry: Math.random() * 360,
    vx: randSign() * randIn(VELOCITY_RANGE),
    vy: randSign() * randIn(VELOCITY_RANGE),
    rxSpeed: randSign() * randIn(ROTATION_SPEED_RANGE),
    rySpeed: randSign() * randIn(ROTATION_SPEED_RANGE),
  };
}

interface SplitResult {
  readonly a: CubeData;
  readonly b: CubeData;
}

function trySplit(
  cube: CubeData,
  axis: "x" | "y",
  cfg: CubeConfig
): SplitResult | null {
  if (cube.size <= MIN_SIZE) return null;

  const half = Math.floor(cube.size / 2);
  if (half < MIN_SIZE) return null;

  const base = {
    size: half,
    x: cube.x + (cube.size - half) / 2,
    y: cube.y + (cube.size - half) / 2,
    rxSpeed: cube.rxSpeed * (0.85 + Math.random() * 0.5),
    rySpeed: cube.rySpeed * (0.85 + Math.random() * 0.5),
    rx: cube.rx,
    ry: cube.ry,
  };

  if (axis === "x") {
    const mag = Math.max(Math.abs(cube.vy), cfg.splitDeflect);
    return {
      a: { id: ++idSeq, ...base, vx: cube.vx, vy: mag },
      b: { id: ++idSeq, ...base, vx: cube.vx, vy: -mag },
    };
  }

  const mag = Math.max(Math.abs(cube.vx), cfg.splitDeflect);
  return {
    a: { id: ++idSeq, ...base, vx: mag, vy: cube.vy },
    b: { id: ++idSeq, ...base, vx: -mag, vy: cube.vy },
  };
}
