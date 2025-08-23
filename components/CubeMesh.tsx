"use client";

import * as THREE from "three";
import { memo } from "react";

type CubeData = {
  id: number;
  size: number;
  x: number; y: number;
  rx: number; ry: number;
};

export function CubeMesh({ d, W, H, materials }: { d: CubeData; W:number; H:number; materials: THREE.Material[] }) {
  // 화면 좌표계처럼 쓰기 위해:
  // position = (x + size/2, -(y + size/2), 0)
  // 회전은 rx/ry(도 → 라디안)
  return (
    <group
        position={[d.x + d.size/2, H - (d.y + d.size/2), 0]} // ← H - (...) 로 바꾸면 직관적
        rotation={[THREE.MathUtils.degToRad(d.rx), THREE.MathUtils.degToRad(d.ry), 0]}
        >
        <mesh material={materials}>
            <boxGeometry args={[d.size, d.size, d.size]} />
        </mesh>
        </group>
  );
}

export default memo(CubeMesh);
