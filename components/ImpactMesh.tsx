"use client";
import * as THREE from "three";
import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { makeImpactTexture } from "@/lib/makeImpactTexture";

export type ImpactData = { id:number; x:number; y:number; start:number; life:number; size:number; };

export function ImpactMesh({ getData, W, H }:{ getData:()=>ImpactData|undefined; W:number; H:number; }){
  const spriteRef = useRef<THREE.Sprite>(null!);
  const material = useMemo(()=> new THREE.SpriteMaterial({
      map: makeImpactTexture(256),
      transparent:true, depthWrite:false, blending:THREE.AdditiveBlending
  }),[]);

  useFrame((state)=>{
    const d = getData(); if(!d) return;
    const now = state.clock.getElapsedTime();
    const t = Math.min(1, Math.max(0, (now - d.start)/d.life));
    const gx = d.x, gy = H - d.y;
    spriteRef.current.position.set(gx, gy, 0);
    const s = d.size * (1 + t*1.8);
    spriteRef.current.scale.set(s, s, 1);
    (spriteRef.current.material as THREE.SpriteMaterial).opacity = (1 - t)*0.9;
  });

  return <sprite ref={spriteRef} material={material} />;
}
