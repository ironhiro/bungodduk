"use client";
import * as THREE from "three";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";

export type CubeData = { id:number; size:number; x:number; y:number; rx:number; ry:number; };

export function CubeMesh({ id, getData, W, H, materials }:{
  id:number;
  getData:()=>CubeData;
  W:number; H:number;
  materials: THREE.Material[];
}){
  const groupRef = useRef<THREE.Group>(null!);
  const boxRef = useRef<THREE.Mesh>(null!);

  useFrame(()=>{
    const d = getData(); if(!d) return;
    const gx = d.x + d.size/2;
    const gy = H - (d.y + d.size/2);
    groupRef.current.position.set(gx, gy, 0);
    groupRef.current.rotation.set(THREE.MathUtils.degToRad(d.rx), THREE.MathUtils.degToRad(d.ry), 0);
    if(boxRef.current){
      boxRef.current.scale.set(d.size, d.size, d.size);
    }
  });

  return (
    <group ref={groupRef}>
      <mesh ref={boxRef} material={materials}>
        <boxGeometry args={[1,1,1]} />
      </mesh>
    </group>
  );
}
