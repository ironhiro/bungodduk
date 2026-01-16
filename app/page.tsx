"use client";
import { Canvas } from "@react-three/fiber";
import { Suspense, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import ResponsiveOrtho from "@/components/ResponsiveOrtho";
import { CubeField, CubeFieldRef, CubeConfig } from "@/components/CubeField";
import SettingsPanel from "@/components/SettingsPanel";
import "@/styles/cube.css";

export default function Page(){
  const [cfg,setCfg] = useState<CubeConfig>({
    sizeMin: 250, sizeMax: 400,
    speedMul: 1.8, rotMul: 2.0,
    splitDeflect: 220, bounceDeflect: 40,
    cubeAlpha: 0.7, glitchMs: 5000
  });
  const [panelOpen,setPanelOpen]=useState(true);
  const fieldRef = useRef<CubeFieldRef>(null);

  const onCreated = useCallback(({ scene }: { scene: THREE.Scene }) => {
    scene.background = new THREE.Color("#273e81");
  }, []);

  return (
    <>
      <Canvas orthographic dpr={[1, Math.min(2, typeof window!=="undefined"? window.devicePixelRatio:1)]} style={{position:"fixed", inset:0}} onCreated={onCreated}>
        <ResponsiveOrtho />
        <Suspense fallback={null}>
          <CubeField ref={fieldRef} config={cfg} />
        </Suspense>
      </Canvas>

      <div id="glitch" aria-hidden="true" />

      <SettingsPanel
        panelOpen={panelOpen} setPanelOpen={setPanelOpen}
        sizeMin={cfg.sizeMin} setSizeMin={v=>setCfg(s=>({...s,sizeMin:v}))}
        sizeMax={cfg.sizeMax} setSizeMax={v=>setCfg(s=>({...s,sizeMax:v}))}
        speedMul={cfg.speedMul} setSpeedMul={v=>setCfg(s=>({...s,speedMul:v}))}
        rotMul={cfg.rotMul} setRotMul={v=>setCfg(s=>({...s,rotMul:v}))}
        splitDeflect={cfg.splitDeflect} setSplitDeflect={v=>setCfg(s=>({...s,splitDeflect:v}))}
        bounceDeflect={cfg.bounceDeflect} setBounceDeflect={v=>setCfg(s=>({...s,bounceDeflect:v}))}
        cubeAlpha={cfg.cubeAlpha} setCubeAlpha={v=>setCfg(s=>({...s,cubeAlpha:v}))}
        glitchSec={cfg.glitchMs/1000} setGlitchSec={sec=>setCfg(s=>({...s,glitchMs: Math.floor(sec*1000)}))}
        onReset={()=> fieldRef.current?.reset()}
      />
    </>
  );
}
