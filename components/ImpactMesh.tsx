"use client";
import * as THREE from "three";
import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { makeImpactTexture } from "@/lib/makeImpactTexture";

const IMPACT_TEXTURE_SIZE = 256;
const SCALE_MULTIPLIER = 1.8;
const OPACITY_MULTIPLIER = 0.9;

export interface ImpactData {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly start: number;
  readonly life: number;
  readonly size: number;
}

interface ImpactMeshProps {
  readonly getData: () => ImpactData | undefined;
  readonly W: number;
  readonly H: number;
}

export function ImpactMesh({ getData, H }: ImpactMeshProps) {
  const spriteRef = useRef<THREE.Sprite>(null!);

  const material = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: makeImpactTexture(IMPACT_TEXTURE_SIZE),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    []
  );

  useFrame((state) => {
    const d = getData();
    if (!d) return;

    const now = state.clock.getElapsedTime();
    const t = Math.min(1, Math.max(0, (now - d.start) / d.life));

    spriteRef.current.position.set(d.x, H - d.y, 0);

    const scale = d.size * (1 + t * SCALE_MULTIPLIER);
    spriteRef.current.scale.set(scale, scale, 1);

    (spriteRef.current.material as THREE.SpriteMaterial).opacity =
      (1 - t) * OPACITY_MULTIPLIER;
  });

  return <sprite ref={spriteRef} material={material} />;
}
