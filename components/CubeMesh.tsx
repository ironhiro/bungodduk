"use client";

import * as THREE from "three";
import { memo, useRef } from "react";
import { useFrame } from "@react-three/fiber";

type CubeData = {
  id: number;
  size: number;
  x: number; y: number;
  rx: number; ry: number;
};

export function CubeMesh({ id, getData, W, H, materials }: {
  id: number;
  getData: () => CubeData;
  W: number; H: number;
  materials: THREE.Material[];
}) {
  const groupRef = useRef<THREE.Group>(null!);
  const boxRef = useRef<THREE.Mesh>(null!);

  useFrame(() => {
    const d = getData();
    console.log(d);
    if (!d) return;
    // 위치/회전 즉시 반영
    const gx = d.x + d.size / 2;
    const gy = H - (d.y + d.size / 2);
    groupRef.current.position.set(gx, gy, 0);
    groupRef.current.rotation.set(
      THREE.MathUtils.degToRad(d.rx),
      THREE.MathUtils.degToRad(d.ry),
      0
    );
    // 크기가 변할 수 있으면 (분열 등) 지오메트리 스케일로 처리
    groupRef.current.scale.set(1,1,1);
    if (boxRef.current) {
      boxRef.current.scale.set(d.size, d.size, d.size); // boxGeometry args 대신 scale
    }
  });

  return (
    <group ref={groupRef}>
      <mesh ref={boxRef} material={materials}>
        {/* 단위 1 박스 → scale로 크기 반영 */}
        <boxGeometry args={[1,1,1]} />
      </mesh>
    </group>
  );
}


export default memo(CubeMesh);
