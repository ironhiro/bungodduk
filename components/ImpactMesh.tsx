"use client";

import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { makeImpactTexture } from "@/lib/makeImpactTexture";

export type ImpactData = {
  id: number;
  x: number; // 화면 좌표계 (좌상단 0,0)
  y: number;
  start: number; // 초 단위
  life: number;  // 생명(초)
  size: number;  // 시작 크기(px)
};

export function ImpactMesh({
  getData, W, H,
}: {
  getData: () => ImpactData | undefined;
  W: number; H: number;
}) {
  const spriteRef = useRef<THREE.Sprite>(null!);

  const material = useMemo(() => {
    const tex = makeImpactTexture(256);
    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return mat;
  }, []);

  // 스프라이트는 기본 크기가 1 → 픽셀 기준으로 보이게 scale 조정
  useEffect(() => {
    if (!spriteRef.current) return;
    spriteRef.current.scale.set(1, 1, 1);
  }, []);

  useFrame((state) => {
    const d = getData();
    if (!d) return;
    const now = state.clock.getElapsedTime();
    const t = (now - d.start) / d.life;            // 0 → 1
    const clamped = Math.max(0, Math.min(1, t));

    // 위치 (화면 좌표 → 씬 좌표)
    const gx = d.x;
    const gy = H - d.y; // y 뒤집기
    spriteRef.current.position.set(gx, gy, 0);

    // 크기(확장) & 투명도(페이드아웃)
    const s = d.size * (1 + clamped * 1.8);        // 1→2.8배
    spriteRef.current.scale.set(s, s, 1);

    const opacity = (1 - clamped) * 0.9;           // 0.9 → 0
    (spriteRef.current.material as THREE.SpriteMaterial).opacity = opacity;
  });

  return <sprite ref={spriteRef} material={material} />;
}
