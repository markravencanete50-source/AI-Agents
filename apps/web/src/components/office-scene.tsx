'use client';
import { Component, useRef, useState, useEffect, type ReactNode } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { RoundedBox, Html, ContactShadows, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { agents, type AgentId } from '@office/contracts';

const stations:[number,number][]=[[-4.9,-3.2],[-5.1,2.7],[-3.1,3.7],[-5.2,-.8],[-3.3,-.8],[-5.2,1],[-3.3,1],[2.3,-3.3],[4.3,-3.3],[6.3,-3.3],[2.3,-1.3],[4.3,-1.3],[6.3,-1.3],[4.3,.9],[6.3,.9]];
function Block({size,position,color,radius=.06}:{size:[number,number,number];position:[number,number,number];color:string;radius?:number}){return <RoundedBox args={size} radius={radius} smoothness={3} position={position}><meshStandardMaterial color={color} roughness={.7}/></RoundedBox>;}
function Plant({position}:{position:[number,number,number]}){return <group position={position}><mesh position={[0,.18,0]}><cylinderGeometry args={[.2,.15,.35,12]}/><meshStandardMaterial color="#dbded6"/></mesh>{[0,1,2].map(i=><mesh key={i} position={[Math.sin(i*2)*.12,.55+i*.11,Math.cos(i*2)*.1]} rotation={[.2,0,.2]}><sphereGeometry args={[.26,8,8]}/><meshStandardMaterial color={i===1?'#6b8772':'#8aa28b'}/></mesh>)}</group>;}
function Robot({index,active,selected,onSelect,reduced,labelsReady}:{index:number;active:boolean;selected:boolean;onSelect:(id:AgentId)=>void;reduced:boolean;labelsReady:boolean}){
 const group=useRef<THREE.Group>(null);const arm=useRef<THREE.Group>(null);const [x,z]=stations[index];const a=agents[index];
 useFrame(({clock},delta)=>{if(!group.current)return;const t=clock.elapsedTime+index*.7;
  const walking=active&&!reduced&&Math.sin(t*.12+index)>.7;
  const targetX=x+(walking?Math.sin(t*.65)*.38:0),targetZ=z+.9+(walking?Math.cos(t*.65)*.25:0);
  group.current.position.x=THREE.MathUtils.damp(group.current.position.x,targetX,3,delta);group.current.position.z=THREE.MathUtils.damp(group.current.position.z,targetZ,3,delta);
  group.current.position.y=.33+(reduced?0:Math.sin(t*(walking?5:1.7))*(walking?.035:.008));
  group.current.rotation.y=THREE.MathUtils.damp(group.current.rotation.y,walking?Math.sin(t)*.3:Math.PI,3,delta);
  if(arm.current)arm.current.rotation.x=reduced?-.2:active?-.45+Math.sin(t*6)*.1:Math.sin(t*1.5)*.05;
 });
 return <group ref={group} position={[x,.33,z+.9]} onClick={e=>{e.stopPropagation();onSelect(a.id);}}>
  <Block size={[.4,.4,.3]} position={[0,.52,0]} color={a.color} radius={.13}/>
  <Block size={[.52,.4,.37]} position={[0,.93,0]} color={a.color} radius={.15}/>
  <Block size={[.39,.23,.035]} position={[0,.96,.18]} color="#233b37" radius={.08}/>
  {[-.095,.095].map(v=><mesh key={v} position={[v,.99,.208]}><sphereGeometry args={[.027,10,10]}/><meshBasicMaterial color={active?'#bdffe1':'#d1e4dc'}/></mesh>)}
  <mesh position={[0,1.18,0]}><sphereGeometry args={[.035,8,8]}/><meshStandardMaterial color="#b7c6bf"/></mesh>
  <group ref={arm} position={[-.28,.65,0]}><Block size={[.11,.29,.12]} position={[0,-.09,0]} color={a.color} radius={.04}/></group>
  <Block size={[.11,.29,.12]} position={[.28,.56,0]} color={a.color} radius={.04}/>
  {[-.12,.12].map(v=><group key={v}><Block size={[.12,.23,.13]} position={[v,.2,0]} color={a.color} radius={.035}/><Block size={[.17,.08,.23]} position={[v,.09,.025]} color="#33453e" radius={.035}/></group>)}
  {selected&&<mesh rotation={[-Math.PI/2,0,0]} position={[0,.015,0]}><ringGeometry args={[.36,.42,40]}/><meshBasicMaterial color="#266b52" transparent opacity={.85}/></mesh>}
  {labelsReady&&<Html position={[0,1.48,0]} center style={{pointerEvents:'auto'}}><button className={`scene-label ${selected?'selected':''}`} onClick={()=>onSelect(a.id)} aria-label={`Select ${a.name}, ${a.role}`}><i style={{background:a.color}}/>{a.short}{active&&<span className="label-dot"/>}</button></Html>}
 </group>;
}
function Desk({index,active}:{index:number;active:boolean}){const [x,z]=stations[index];return <group position={[x,.32,z]}>
 <Block size={[1.45,.09,.8]} position={[0,.62,0]} color="#fafaf6"/>
 {[-.57,.57].map(v=><Block key={v} size={[.06,.57,.55]} position={[v,.29,0]} color="#c5ccc6" radius={.015}/>)}
 <Block size={[.57,.4,.055]} position={[0,.96,-.1]} color="#495a54" radius={.025}/>
 <Block size={[.51,.33,.01]} position={[0,.96,-.066]} color={active?'#c8e2d7':'#dce5df'} radius={.01}/>
 {[0,1,2].map(i=><Block key={i} size={[i===0?.24:.37,.012,.012]} position={[-.04,.99-i*.065,-.055]} color={active?'#72a993':'#bccbc2'} radius={.003}/>)}
 <Block size={[.045,.2,.045]} position={[0,.71,-.1]} color="#71857a" radius={.01}/>
 <Block size={[.4,.025,.13]} position={[0,.685,.16]} color="#dae0d9" radius={.018}/>
 <mesh position={[.5,.69,.1]}><cylinderGeometry args={[.055,.045,.1,12]}/><meshStandardMaterial color="#b79878"/></mesh>
 </group>;}
class SceneBoundary extends Component<{children:ReactNode;fallback:ReactNode},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return {failed:true};}render(){return this.state.failed?this.props.fallback:this.props.children;}}
function FitCamera({zoom}:{zoom:number}){useFrame(({camera,size})=>{if(camera instanceof THREE.OrthographicCamera){const target=Math.min(size.width/19,size.height/13)*(zoom/45);if(camera.zoom!==target){camera.zoom=target;camera.updateProjectionMatrix();}}});return null;}
export default function OfficeScene({activeIds,selected,onSelect,zoom,reduced}:{activeIds:AgentId[];selected:AgentId;onSelect:(id:AgentId)=>void;zoom:number;reduced:boolean}){
 const [supported,setSupported]=useState(true),[labelsReady,setLabelsReady]=useState(false),[visible,setVisible]=useState(true);
 useEffect(()=>{const c=document.createElement('canvas');const gl=c.getContext('webgl2');if(!gl){const timer=setTimeout(()=>setSupported(false),0);return()=>clearTimeout(timer);}else gl.getExtension('WEBGL_lose_context')?.loseContext();},[]);
 useEffect(()=>{const change=()=>setVisible(!document.hidden);document.addEventListener('visibilitychange',change);return()=>document.removeEventListener('visibilitychange',change);},[]);
 const fallback=<div className="floor-fallback"><span>Office floor</span><p>Use the team list to follow and select your agents.</p><div>{agents.map(a=><button key={a.id} onClick={()=>onSelect(a.id)}><i style={{background:a.color}}/>{a.name}<small>{a.short}</small></button>)}</div></div>;
 if(!supported)return fallback;
 return <SceneBoundary fallback={fallback}><Canvas onCreated={()=>setTimeout(()=>setLabelsReady(true),0)} frameloop={visible?'always':'never'} dpr={[1,1.35]} orthographic camera={{position:[12,15,18],zoom:zoom,near:.1,far:100}} gl={{antialias:true,powerPreference:'low-power'}} aria-label="Animated AI company office. Select agents using the team list or desk labels.">
  <FitCamera zoom={zoom}/><color attach="background" args={['#edf0eb']}/><ambientLight intensity={1.6}/><directionalLight position={[5,12,6]} intensity={2.2}/><directionalLight position={[-8,5,-3]} intensity={.7} color="#d5eee5"/>
  <group position={[0,-.16,0]}><Block size={[16,.35,10.7]} position={[.15,0,.1]} color="#d0d8ce" radius={.2}/><Block size={[15.8,.12,10.5]} position={[.15,.2,.1]} color="#83b2a0" radius={.2}/><Block size={[15.65,.13,10.35]} position={[.15,.3,.1]} color="#f0f1e9" radius={.2}/></group>
  <Block size={[4.25,.06,4.2]} position={[-4.25,.31,.1]} color="#e1e8e7" radius={.14}/>
  <Block size={[6,.06,6.7]} position={[4.35,.31,-1.2]} color="#e9e3ed" radius={.14}/>
  <Block size={[4.3,.06,2.3]} position={[-4.2,.31,3.15]} color="#efe4d0" radius={.14}/>
  <Block size={[2.4,.07,1.05]} position={[-.55,.87,1]} color="#d7bd94" radius={.2}/>
  {[-1.4,.2].map(x=><Block key={x} size={[.14,.55,.55]} position={[x,.58,1]} color="#bcc6ba"/>)}
  {[-1.15,-.4,.35].map(x=><group key={x}><Block size={[.48,.08,.42]} position={[x,.6,2]} color="#b6c9bb"/><Block size={[.48,.4,.08]} position={[x,.83,2.17]} color="#b6c9bb"/></group>)}
  <Block size={[.55,.04,.35]} position={[-.6,.93,1]} color="#fafbf5"/><Block size={[.2,.015,.12]} position={[-.1,.93,1]} color="#708b75"/>
  <Block size={[1.6,.6,.56]} position={[1.25,.61,3.4]} color="#c1c9b4" radius={.15}/><Block size={[1.6,.45,.14]} position={[1.25,.96,3.66]} color="#c1c9b4" radius={.08}/>
  <Block size={[.7,.35,.65]} position={[1.25,.5,2.6]} color="#eee5d4" radius={.12}/>
  <Plant position={[-6.8,.3,-4]}/><Plant position={[7.35,.3,3.9]}/><Plant position={[-1.95,.3,-3.5]}/><Plant position={[-6.85,.3,4]}/>
  <Block size={[2.6,1.65,.1]} position={[.2,1.32,-4.5]} color="#f9faf4" radius={.06}/><Block size={[2.3,1.25,.012]} position={[.2,1.35,-4.44]} color="#dbe4d9"/>
  {[0,1,2].map(i=><Block key={i} size={[1.6-i*.2,.035,.012]} position={[.2,1.68-i*.25,-4.425]} color="#abc2b0" radius={.012}/>)}
  {agents.map((a,i)=><group key={a.id}><Desk index={i} active={activeIds.includes(a.id)}/><Robot index={i} active={activeIds.includes(a.id)} selected={selected===a.id} onSelect={onSelect} reduced={reduced} labelsReady={labelsReady}/></group>)}
  <ContactShadows position={[0,-.04,0]} opacity={.25} scale={23} blur={2.5} far={10} resolution={256} frames={1}/>
  <OrbitControls makeDefault enablePan={false} enableZoom={false} minPolarAngle={.5} maxPolarAngle={1.1} minAzimuthAngle={-.4} maxAzimuthAngle={.9} target={[.2,.1,0]}/>
 </Canvas></SceneBoundary>;
}
