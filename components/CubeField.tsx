"use client";

import { forwardRef, useImperativeHandle, useRef, useState, useEffect } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CubeMesh, CubeData } from "@/components/CubeMesh";
import { ImpactMesh, ImpactData } from "@/components/ImpactMesh";
import { makeFaceCanvasTextureAsync } from "@/lib/makeFaceCanvasTexture";

export type CubeConfig = {
  sizeMin:number; sizeMax:number;
  speedMul:number; rotMul:number;
  splitDeflect:number; bounceDeflect:number;
  cubeAlpha:number; glitchMs:number;
};

export type CubeFieldRef = { reset:()=>void };

const MIN_SIZE = 1;
let idSeq = 1;

export const CubeField = forwardRef<CubeFieldRef, { config: CubeConfig }>(({ config }, ref)=>{
  const { size: viewport, clock } = useThree();
  const W = viewport.width, H = viewport.height;

  // simulation data in ref
  const cubesRef = useRef<CubeData[]>([]);
  const [ids, setIds] = useState<number[]>([]);

  // impact list
  const impactsRef = useRef<ImpactData[]>([]);
  const [impactIds, setImpactIds] = useState<number[]>([]);
  const impactSeqRef = useRef(1);

  const glitchingRef = useRef(false);
  const materialsRef = useRef<THREE.Material[] | null>(null);
  const [materialsReady, setMaterialsReady] = useState(false);

  // load materials once (depends on cubeAlpha for background alpha)
  useEffect(()=>{
    let alive = true;
    (async()=>{
      const tex = await makeFaceCanvasTextureAsync({
        lines:["붕 오 떡","어 볶","빵 뎅 이"],
        w:1024, h:1024, pad:64,
        bgRGBA:[255,212,0, Math.round(config.cubeAlpha*255) ],
        color:"#000000"
      });
      if(!alive) return;
      const mat = new THREE.MeshBasicMaterial({ map:tex, transparent:true, depthWrite:false, alphaTest:0.01 });
      materialsRef.current = [0,1,2,3,4,5].map(()=>mat);
      setMaterialsReady(true);
    })();
    return ()=>{ alive=false; };
  },[config.cubeAlpha]);

  // initial seed
  useEffect(()=>{
    if(!materialsReady) return;
    const seed = makeRandomCube(config, W, H);
    cubesRef.current = [seed];
    setIds([seed.id]);
  },[materialsReady,W,H,config]);

  // API
  useImperativeHandle(ref, ()=> ({
    reset(){
      if(glitchingRef.current) return;
      const seed = makeRandomCube(config, W, H);
      cubesRef.current = [seed];
      setIds([seed.id]);
    }
  }),[W,H,config]);

  // spawn impact
  const spawnImpact = (x:number,y:number)=>{
    const id = impactSeqRef.current++;
    const d: ImpactData = { id, x, y, start: clock.getElapsedTime(), life: 0.45, size: 28 };
    impactsRef.current = [...impactsRef.current, d];
    setImpactIds(prev=>[...prev, id]);
  };

  useFrame((_, dt)=>{
    if(!materialsRef.current || ids.length===0 || glitchingRef.current) return;

    const dts = Math.min(dt, 0.032);
    const cur = cubesRef.current;
    const next = cur.map(c=> ({...c}));
    let structureChanged = false;

    for(let i=0;i<next.length;i++){
      const c = next[i];
      // motion
      c.x += c.vx * config.speedMul * dts;
      c.y += c.vy * config.speedMul * dts;
      c.rx = (c.rx + c.rxSpeed * config.rotMul * dts) % 360;
      c.ry = (c.ry + c.rySpeed * config.rotMul * dts) % 360;
      (c as any).cooldown = Math.max(0, ((c as any).cooldown ?? 0) - dts*1000);

      let bounced=false; let axis: "x"|"y"|null = null;
      if(c.x < 0){ c.x=0; c.vx = Math.abs(c.vx) + Math.sign(c.vx||1) * config.bounceDeflect * Math.random(); bounced=true; axis="x"; }
      else if(c.x + c.size > W){ c.x = W - c.size; c.vx = -Math.abs(c.vx) - Math.sign(c.vx||1)*config.bounceDeflect*Math.random(); bounced=true; axis="x"; }

      if(c.y < 0){ c.y=0; c.vy = Math.abs(c.vy) + Math.sign(c.vy||1) * config.bounceDeflect * Math.random(); bounced=true; axis="y"; }
      else if(c.y + c.size > H){ c.y = H - c.size; c.vy = -Math.abs(c.vy) - Math.sign(c.vy||1)*config.bounceDeflect*Math.random(); bounced=true; axis="y"; }

      if(bounced && ((c as any).cooldown ?? 0) <= 0){
        (c as any).cooldown = 120;
        spawnImpact(c.x + c.size/2, c.y + c.size/2);
        const res = trySplit(c, axis!, config);
        if(res){
          next.splice(i,1,res.a,res.b);
          structureChanged = true;
          i++; // skip next inserted to avoid immediate re-processing
        }
      }
    }

    // glitch if any too small
    if(!glitchingRef.current && next.some(c=> c.size<=MIN_SIZE)){
      glitchingRef.current = true;
      cubesRef.current = [];
      setIds([]);
      const g = document.getElementById("glitch");
      if(g){ g.classList.remove("active"); void g.offsetWidth; g.classList.add("active"); }
      setTimeout(()=>{
        if(g) g.classList.remove("active");
        const seed = makeRandomCube(config, W, H);
        cubesRef.current = [seed];
        setIds([seed.id]);
        glitchingRef.current = false;
      }, config.glitchMs);
      return;
    }

    // cleanup impacts
    const now = clock.getElapsedTime();
    const before = impactsRef.current;
    const after = before.filter(it => now - it.start < it.life);
    if(after.length !== before.length){
      impactsRef.current = after;
      setImpactIds(after.map(i=>i.id));
    }

    cubesRef.current = next;
    if(structureChanged) setIds(next.map(c=>c.id));
  });

  if(!materialsRef.current) return null;

  return (
    <>
      {ids.map(id=> (
        <CubeMesh key={id} id={id} getData={()=> cubesRef.current.find(c=>c.id===id)!} W={W} H={H} materials={materialsRef.current!} />
      ))}
      {impactIds.map(id=> (
        <ImpactMesh key={id} W={W} H={H} getData={()=> impactsRef.current.find(i=>i.id===id)} />
      ))}
    </>
  );
});

// helpers
function randIn(a:[number,number]){ return a[0] + Math.random()*(a[1]-a[0]); }
function randSign(){ return Math.random()<0.5 ? -1 : 1; }

function makeRandomCube(cfg: CubeConfig, W:number, H:number): CubeData & {vx:number; vy:number; rxSpeed:number; rySpeed:number}{
  const sizeMin = Math.min(cfg.sizeMin, cfg.sizeMax);
  const sizeMax = Math.max(cfg.sizeMin, cfg.sizeMax);
  const size = Math.floor(randIn([sizeMin, sizeMax]));
  const x = Math.max(0, Math.min(W - size, Math.random()*(W - size)));
  const y = Math.max(0, Math.min(H - size, Math.random()*(H - size)));
  const vx = randSign()*randIn([300,600]);
  const vy = randSign()*randIn([300,600]);
  const rxSpeed = randSign()*randIn([80,200]);
  const rySpeed = randSign()*randIn([80,200]);
  return { id: ++idSeq, size, x, y, rx: Math.random()*360, ry: Math.random()*360, vx, vy, rxSpeed, rySpeed };
}

function trySplit(c: any, axis:"x"|"y", cfg: CubeConfig){
  if(c.size <= MIN_SIZE) return null;
  const half = Math.floor(c.size/2);
  if(half < MIN_SIZE) return null;
  const base = {
    size: half,
    x: c.x + (c.size - half)/2,
    y: c.y + (c.size - half)/2,
    rxSpeed: c.rxSpeed * (0.85 + Math.random()*0.5),
    rySpeed: c.rySpeed * (0.85 + Math.random()*0.5),
    rx: c.rx, ry: c.ry
  };
  let a:any, b:any;
  if(axis==="x"){
    const mag = Math.max(Math.abs(c.vy), cfg.splitDeflect);
    a = { id: ++idSeq, ...base, vx: c.vx, vy:  mag };
    b = { id: ++idSeq, ...base, vx: c.vx, vy: -mag };
  }else{
    const mag = Math.max(Math.abs(c.vx), cfg.splitDeflect);
    a = { id: ++idSeq, ...base, vx:  mag, vy: c.vy };
    b = { id: ++idSeq, ...base, vx: -mag, vy: c.vy };
  }
  return { a, b };
}
