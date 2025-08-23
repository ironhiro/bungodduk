"use client";
import { OrthographicCamera } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect } from "react";

export default function ResponsiveOrtho() {
 const { size } = useThree();
  const W = size.width;
  const H = size.height;

  return (
    <OrthographicCamera
      makeDefault
      manual
      left={0}
      right={W}
      top={H}
      bottom={0}
      near={-1000}
      far={1000}
      position={[0, 0, 10]}
    />
  );
}