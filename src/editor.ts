import { clamp, frame, type Layer, type Project } from './model'
export const frameLength=1/30
export function editProject(project:Project, patch:Partial<Project>):Project {
  const next={...project,...patch}
  if(next.duration!==project.duration)next.layers=next.layers.map(layer=>{
    const end=Math.min(layer.end,next.duration)
    return {...layer,start:Math.min(layer.start,frame(end-frameLength)),end}
  })
  return next
}
export function retime(layer:Layer, delta:number, mode:'move'|'start'|'end', duration:number):Layer {
  if(mode==='start')return {...layer,start:frame(clamp(layer.start+delta,0,layer.end-frameLength))}
  if(mode==='end')return {...layer,end:frame(clamp(layer.end+delta,layer.start+frameLength,duration))}
  const shift=clamp(frame(delta),-layer.start,duration-layer.end)
  return {...layer,start:frame(layer.start+shift),end:frame(layer.end+shift)}
}
export function reorder(layers:Layer[], ids:string[], direction:number):Layer[]{
  const next=[...layers]
  const indexes=next.map((_,i)=>i)
  if(direction>0)indexes.reverse()
  indexes.forEach(i=>{
    const target=i+direction
    if(ids.includes(next[i].id) && next[target] && !ids.includes(next[target].id)){
      [next[i],next[target]]=[next[target],next[i]]
    }
  })
  return next
}
