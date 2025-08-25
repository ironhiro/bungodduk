"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  panelOpen: boolean; setPanelOpen: (v:boolean)=>void;
  sizeMin:number; setSizeMin:(n:number)=>void;
  sizeMax:number; setSizeMax:(n:number)=>void;
  speedMul:number; setSpeedMul:(n:number)=>void;
  rotMul:number; setRotMul:(n:number)=>void;
  splitDeflect:number; setSplitDeflect:(n:number)=>void;
  bounceDeflect:number; setBounceDeflect:(n:number)=>void;
  cubeAlpha:number; setCubeAlpha:(n:number)=>void;
  glitchSec:number; setGlitchSec:(n:number)=>void;
  onReset:()=>void;
};

export default function SettingsPanel(p:Props){
  const bodyRef = useRef<HTMLDivElement|null>(null);
  const [warn,setWarn]=useState("");

  const allowMax = useMemo(()=>{
    const pad=24; const w = typeof window!=="undefined"? window.innerWidth:1200;
    const h = typeof window!=="undefined"? window.innerHeight:800;
    return Math.max(20, Math.min(w,h)-pad);
  },[]);

  useEffect(()=>{
    const b = bodyRef.current!;
    if(p.panelOpen){
      b.classList.remove("collapsed"); b.classList.add("expanded");
      b.style.height="0px"; requestAnimationFrame(()=> b.style.height = b.scrollHeight+"px");
    }else{
      b.classList.remove("expanded"); b.classList.add("collapsed");
      b.style.height = b.scrollHeight+"px"; requestAnimationFrame(()=> b.style.height="0px");
    }
  },[p.panelOpen]);

  useEffect(()=>{
    const b = bodyRef.current!;
    const onEnd=(e:TransitionEvent)=>{ if(e.propertyName!=="height") return; if(p.panelOpen) b.style.height="auto"; };
    b.addEventListener("transitionend", onEnd);
    return ()=> b.removeEventListener("transitionend", onEnd);
  },[p.panelOpen]);

  const ok = useMemo(()=>{
    let msg=""; if(p.sizeMin>p.sizeMax) msg="최소값이 최대값보다 큽니다.";
    if(p.sizeMin>allowMax||p.sizeMax>allowMax){ msg = (msg? msg+" ":"")+"화면 크기 제한: 최대 "+Math.floor(allowMax)+"px"; }
    setWarn(msg); return msg==="";
  },[p.sizeMin,p.sizeMax,allowMax]);

  return (
    <aside className="panel" id="panel">
      <header className="panel__header">
        <span>⚙️ 설정</span>
        <button id="panelToggle" aria-expanded={p.panelOpen} onClick={()=>p.setPanelOpen(!p.panelOpen)}>{p.panelOpen? "▾":"▸"}</button>
      </header>
      <div className="panel__body panel-collapsible expanded" id="panelBody" ref={bodyRef}>
        <div className="field">
          <label>초기 크기 (px)</label>
          <div className="row">
            <input id="sizeMin" type="number" min={20} max={2000} value={p.sizeMin} onChange={e=>p.setSizeMin(Number(e.target.value))}/>
            <span>~</span>
            <input id="sizeMax" type="number" min={20} max={2400} value={p.sizeMax} onChange={e=>p.setSizeMax(Number(e.target.value))}/>
          </div>
          <div className="hint">초기 크기 변경은 <b>재시작</b>을 눌렀을 때 적용됩니다.</div>
          <div className={"hint "+(ok? "":"error")} aria-live="polite">{warn}</div>
        </div>

        <div className="field">
          <label>이동 속도 배율</label>
          <input id="speedMul" type="range" min={0.5} max={3} step={0.1} value={p.speedMul} onChange={e=>p.setSpeedMul(Number(e.target.value))}/>
          <output>{p.speedMul.toFixed(2)}×</output>
        </div>

        <div className="field">
          <label>회전 속도 배율</label>
          <input id="rotMul" type="range" min={0.5} max={4} step={0.1} value={p.rotMul} onChange={e=>p.setRotMul(Number(e.target.value))}/>
          <output>{p.rotMul.toFixed(2)}×</output>
        </div>

        <div className="field">
          <label>분열 반발 속도 (px/s)</label>
          <input id="splitDeflect" type="range" min={60} max={600} step={10} value={p.splitDeflect} onChange={e=>p.setSplitDeflect(Number(e.target.value))}/>
          <output>{Math.round(p.splitDeflect)}</output>
        </div>

        <div className="field">
          <label>벽 튕김 틀기 (px/s)</label>
          <input id="bounceDeflect" type="range" min={0} max={200} step={5} value={p.bounceDeflect} onChange={e=>p.setBounceDeflect(Number(e.target.value))}/>
          <output>{Math.round(p.bounceDeflect)}</output>
        </div>

        <div className="field">
          <label>큐브 배경 불투명도</label>
          <input id="cubeAlpha" type="range" min={0.1} max={1} step={0.05} value={p.cubeAlpha} onChange={e=>p.setCubeAlpha(Number(e.target.value))}/>
          <output>{p.cubeAlpha.toFixed(2)}</output>
        </div>

        <div className="field">
          <label>글리치 지속 (초)</label>
          <input id="glitchSec" type="range" min={0.2} max={10} step={0.2} value={p.glitchSec} onChange={e=>p.setGlitchSec(Number(e.target.value))}/>
          <output>{p.glitchSec.toFixed(1)}s</output>
        </div>

        <div className="panel__actions">
          <button id="btnReset" disabled={!ok} onClick={p.onReset}>초기화/재시작</button>
        </div>
      </div>
    </aside>
  );
}
