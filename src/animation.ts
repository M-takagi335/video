import { clamp, type Layer } from './model'

export const channels = {
  x:'X 座標', y:'Y 座標', w:'幅', h:'高さ', rotation:'回転', opacity:'不透明度',
  fontSize:'文字サイズ', color:'色',
} as const
export type Channel = keyof typeof channels
export const channelNames = Object.keys(channels) as Channel[]

const bounce = (t:number):number => {
  if(t<1/2.75)return 7.5625*t*t
  if(t<2/2.75)return 7.5625*(t-1.5/2.75)**2+.75
  if(t<2.5/2.75)return 7.5625*(t-2.25/2.75)**2+.9375
  return 7.5625*(t-2.625/2.75)**2+.984375
}
const curves = {
  Linear:(t:number)=>t,
  'Ease In':(t:number)=>t*t,
  'Ease Out':(t:number)=>1-(1-t)**2,
  'Ease In Out':(t:number)=>t<.5?2*t*t:1-2*(1-t)**2,
  Back:(t:number)=>1+2.70158*(t-1)**3+1.70158*(t-1)**2,
  Bounce:bounce,
  Elastic:(t:number)=>t===0||t===1?t:2**(-10*t)*Math.sin((10*t-.75)*2*Math.PI/3)+1,
}
export type Easing = keyof typeof curves
export const easings = Object.keys(curves) as Easing[]
export interface Keyframe<T> { frame:number; value:T; easing:Easing }
export type Tracks = { [K in Channel]?: Keyframe<Layer[K]>[] }

export const toFrame = (seconds:number)=>Math.round(seconds*30)
export const localFrame = (layer:Layer,time:number)=>toFrame(time)-toFrame(layer.start)
export const inClip = (layer:Layer,time:number)=>localFrame(layer,time)>=0 && toFrame(time)<toFrame(layer.end)
export const atKey = <K extends Channel>(layer:Layer,key:K,time:number)=>
  layer.tracks?.[key]?.find(entry=>entry.frame===localFrame(layer,time))

function interpolate(a:number|string,b:number|string,t:number):number|string {
  if(typeof a==='number' && typeof b==='number')return a+(b-a)*t
  const from=parseInt(String(a).slice(1),16), to=parseInt(String(b).slice(1),16)
  const rgb=[16,8,0].map(shift=>{
    const base=(from>>shift)&255
    return clamp(Math.round(base+(((to>>shift)&255)-base)*t),0,255).toString(16).padStart(2,'0')
  })
  return '#'+rgb.join('')
}

function valueAt<K extends Channel>(layer:Layer,key:K,frame:number):Layer[K] {
  const track:Keyframe<Layer[K]>[] | undefined=layer.tracks?.[key]
  if(!track?.length)return layer[key]
  let low=0, high=track.length
  while(low<high){
    const mid=(low+high)>>>1
    if(track[mid].frame<frame)low=mid+1
    else high=mid
  }
  const next=track[low], prev=track[low-1]
  if(!next)return prev.value
  if(!prev || next.frame===frame)return next.value
  const t=curves[next.easing]((frame-prev.frame)/(next.frame-prev.frame))
  const value=interpolate(prev.value,next.value,t)
  if(typeof value==='number'){
    if(key==='opacity')return clamp(value,0,100) as Layer[K]
    if(key==='w'||key==='h'||key==='fontSize')return Math.max(key==='fontSize'?6:8,value) as Layer[K]
  }
  return value as Layer[K]
}

export function evaluate(layer:Layer,time:number):Layer {
  if(!layer.tracks)return layer
  const frame=localFrame(layer,time)
  const result={...layer}
  for(const key of channelNames)Object.assign(result,{[key]:valueAt(layer,key,frame)})
  return result
}

export function setKey<K extends Channel>(layer:Layer,key:K,time:number,value:Layer[K],easing?:Easing):Layer {
  if(layer.locked || !inClip(layer,time))return layer
  const frame=localFrame(layer,time)
  const track:Keyframe<Layer[K]>[]=layer.tracks?.[key]??[]
  const existing=track.find(entry=>entry.frame===frame)
  const next={frame,value,easing:easing??existing?.easing??'Linear' as Easing}
  const entries=[...track.filter(entry=>entry.frame!==frame),next].sort((a,b)=>a.frame-b.frame)
  return {...layer,tracks:{...layer.tracks,[key]:entries}}
}

export function removeKey(layer:Layer,key:Channel,time:number):Layer {
  if(layer.locked || !atKey(layer,key,time))return layer
  const frame=localFrame(layer,time)
  return {...layer,tracks:{...layer.tracks,[key]:layer.tracks?.[key]?.filter(entry=>entry.frame!==frame)}}
}

export function applyLayerEdit(layer:Layer,patch:Partial<Layer>,time:number,auto:boolean):Layer {
  if(layer.locked)return layer
  const base={...patch}
  let next=layer
  for(const key of channelNames){
    const value=patch[key]
    if(value===undefined)continue
    if(inClip(layer,time) && (auto || atKey(layer,key,time)))next=setKey(next,key,time,value)
    else if(!layer.tracks?.[key]?.length)continue
    delete base[key]
  }
  return Object.keys(base).length?{...next,...base}:next
}

export function applyCanvasEdit(layer:Layer,before:Layer,after:Layer,time:number,auto:boolean):Layer {
  if(layer.locked)return layer
  const patch:Partial<Layer>={}
  for(const key of channelNames){
    if(before[key]!==after[key])Object.assign(patch,{[key]:after[key]})
  }
  const next=applyLayerEdit(layer,patch,time,auto)
  if(auto || !inClip(layer,time))return next

  // An off-key canvas move translates the animated path without creating keys.
  const dx=patch.x!==undefined && layer.tracks?.x?.length && !atKey(layer,'x',time)?patch.x-before.x:0
  const dy=patch.y!==undefined && layer.tracks?.y?.length && !atKey(layer,'y',time)?patch.y-before.y:0
  return dx || dy?offsetPosition(next,dx,dy):next
}

export function keyTimes(layer:Layer):number[] {
  const start=toFrame(layer.start), end=toFrame(layer.end)
  const frames=Object.values(layer.tracks??{}).flatMap(track=>track?.map(key=>key.frame+start)??[])
  return [...new Set(frames)].filter(frame=>frame>=start&&frame<end).sort((a,b)=>a-b)
}

// Preserve project-relative key positions when trimming the left edge.
export function withTrimmedStart(layer:Layer,start:number):Layer {
  const shift=toFrame(layer.start)-toFrame(start)
  const tracks=layer.tracks?Object.fromEntries(Object.entries(layer.tracks).map(([key,entries])=>
    [key,entries?.map(entry=>({...entry,frame:entry.frame+shift}))])):undefined
  return {...layer,start,tracks}
}

export function offsetPosition(layer:Layer,dx:number,dy:number):Layer {
  const tracks=layer.tracks
  return {...layer,x:layer.x+dx,y:layer.y+dy,tracks:tracks&&{
    ...tracks,
    ...(dx&&tracks.x?{x:tracks.x.map(key=>({...key,value:key.value+dx}))}:{}),
    ...(dy&&tracks.y?{y:tracks.y.map(key=>({...key,value:key.value+dy}))}:{}),
  }}
}
