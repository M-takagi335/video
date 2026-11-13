import { useRef, type PointerEvent } from 'react'
import { clamp, type Layer, type Project } from './model'
const star = Array.from({length:10},(_,i)=>{
  const angle=i*Math.PI/5-Math.PI/2
  const radius=i%2?22:50
  return [Math.cos(angle)*radius, Math.sin(angle)*radius].join(',')
}).join(' ')

function Artwork({layer:l}:{layer:Layer}){
  const {w,h,color,stroke,strokeWidth}=l
  const left=-w/2, top=-h/2
  const paint={fill:l.fill?color:'none',stroke,strokeWidth,vectorEffect:'non-scaling-stroke' as const}
  switch(l.kind){
    case 'text': {
      const lines=l.text.split('\n')
      const x=l.align==='left'?left:l.align==='right'?w/2:0
      const anchor=l.align==='left'?'start':l.align==='right'?'end':'middle'
      return <text x={x} textAnchor={anchor} fill={color} stroke={stroke} strokeWidth={strokeWidth} paintOrder="stroke fill"
        fontFamily={l.font+', sans-serif'} fontSize={l.fontSize} fontWeight={l.bold?800:400} dominantBaseline="central">
        {lines.map((line,i)=><tspan key={i} x={x} y={(i-(lines.length-1)/2)*l.fontSize*.92}>{line || '\u00a0'}</tspan>)}
      </text>
    }
    case 'circle': case 'ellipse': return <ellipse {...paint} rx={w/2} ry={h/2}/>
    case 'rect': case 'rounded': return <rect {...paint} x={left} y={top} width={w} height={h} rx={l.kind==='rounded'?Math.min(w,h)*.2:0}/>
    case 'triangle': return <polygon {...paint} points={`0,${top} ${w/2},${h/2} ${left},${h/2}`}/>
    case 'polygon': return <polygon {...paint} points={`${left},0 ${left/2},${top} ${w/4},${top} ${w/2},0 ${w/4},${h/2} ${left/2},${h/2}`}/>
    case 'star': return <polygon {...paint} points={star} transform={`scale(${w/100} ${h/100})`}/>
    case 'line': return <line x1={left} x2={w/2} stroke={color} strokeWidth={Math.max(4,strokeWidth)}/>
    case 'arrow': return <polygon {...paint} points={`${left},${-h*.13} ${w*.15},${-h*.13} ${w*.15},${top} ${w/2},0 ${w*.15},${h/2} ${w*.15},${h*.13} ${left},${h*.13}`}/>
  }
}
type Mode = 'move' | 'rotate' | 'resize'
interface Props {
  project:Project; selected:string[]; time:number; grid:boolean; snap:boolean;
  select:(id:string|null, multi?:boolean)=>void; preview:(layers:Layer[])=>void;
  finish:(layers?:Layer[])=>void; layers:Layer[]; pause:()=>void;
}
export default function Canvas({project,selected,time,grid,snap,select,preview,finish,layers,pause}:Props){
  const svg=useRef<SVGSVGElement>(null)
  const gesture=useRef<{start:DOMPoint; layer:Layer; initial:Layer[]; ids:string[]; mode:Mode; sx:number; sy:number; result?:Layer[]} | null>(null)
  const {width,height}=project
  const point=(e:PointerEvent)=>new DOMPoint(e.clientX,e.clientY).matrixTransform(svg.current!.getScreenCTM()!.inverse())
  function begin(e:PointerEvent,l:Layer,mode:Mode,sx=1,sy=1){
    if(e.button!==0)return
    e.stopPropagation()
    if(mode==='move' && (e.shiftKey || !selected.includes(l.id))) select(l.id,e.shiftKey)
    if(l.locked || e.shiftKey)return
    pause()
    gesture.current={start:point(e),layer:l,initial:layers,ids:selected.includes(l.id)?selected:[l.id],mode,sx,sy}
    svg.current!.setPointerCapture(e.pointerId)
  }
  function move(e:PointerEvent){
    const g=gesture.current
    if(!g)return
    const p=point(e), l=g.layer, dx=p.x-g.start.x, dy=p.y-g.start.y
    if(!g.result && Math.hypot(dx,dy)<1)return
    const theta=l.rotation*Math.PI/180
    const localX=dx*Math.cos(theta)+dy*Math.sin(theta)
    const localY=-dx*Math.sin(theta)+dy*Math.cos(theta)
    const w=clamp(l.w+localX*g.sx,8,8192), h=clamp(l.h+localY*g.sy,8,8192)
    const shiftX=(w-l.w)*g.sx/2, shiftY=(h-l.h)*g.sy/2
    const angle=(v:DOMPoint)=>Math.atan2(v.y-l.y,v.x-l.x)*180/Math.PI
    const deltaX=snap?Math.round((l.x+dx)/20)*20-l.x:dx
    const deltaY=snap?Math.round((l.y+dy)/20)*20-l.y:dy
    g.result=g.initial.map(item=>{
      if(item.locked)return item
      if(g.mode==='move' && g.ids.includes(item.id))return {...item,x:Math.round(item.x+deltaX),y:Math.round(item.y+deltaY)}
      if(item.id!==l.id)return item
      if(g.mode==='rotate')return {...item,rotation:Math.round(l.rotation+(angle(p)-angle(g.start)+540)%360-180)}
      if(g.mode==='resize')return {...item,w:Math.round(w),h:Math.round(h),
        x:Math.round(l.x+shiftX*Math.cos(theta)-shiftY*Math.sin(theta)),
        y:Math.round(l.y+shiftX*Math.sin(theta)+shiftY*Math.cos(theta)),
        fontSize:l.kind==='text'?clamp(Math.round(l.fontSize*Math.min(w/l.w,h/l.h)),6,1024):l.fontSize}
      return item
    })
    preview(g.result)
  }
  function end(cancel=false){
    const result=gesture.current?.result
    gesture.current=null
    finish(cancel?undefined:result)
  }
  const visible=layers.filter(l=>!l.hidden && time>=l.start && time<l.end)
  const unit=Math.min(width,height)/720
  return <svg ref={svg} viewBox={`0 0 ${width} ${height}`} aria-label="編集キャンバス" className="artboard"
    onPointerDown={e=>{if(e.button===0)select(null)}} onPointerMove={move} onPointerUp={()=>end()} onPointerCancel={()=>end(true)}
    onLostPointerCapture={()=>{if(gesture.current)end(true)}}>
    <defs><pattern id="canvas-grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#fff" strokeOpacity=".18"/></pattern></defs>
    <rect width={width} height={height} fill={project.background}/>
    {[...visible].reverse().map(l=><g key={l.id} data-layer={l.name} transform={`translate(${l.x} ${l.y}) rotate(${l.rotation})`}
      opacity={l.opacity/100} className={l.locked?'locked':'art-layer'} onPointerDown={e=>begin(e,l,'move')}>
      {l.kind==='text' && <rect x={-l.w/2} y={-l.h/2} width={l.w} height={l.h} fill="transparent"/>}
      <Artwork layer={l}/>
    </g>)}
    {grid && <g pointerEvents="none"><rect width={width} height={height} fill="url(#canvas-grid)"/><path d={`M${width/2} 0V${height} M0 ${height/2}H${width}`} stroke="#ad92ff" strokeOpacity=".65" vectorEffect="non-scaling-stroke"/></g>}
    {visible.filter(l=>selected.includes(l.id)).map(l=><g key={l.id} transform={`translate(${l.x} ${l.y}) rotate(${l.rotation})`} className="selection">
      <rect x={-l.w/2} y={-l.h/2} width={l.w} height={l.h}/>
      {!l.locked && selected.length===1 && <>
        <path d={`M0 ${-l.h/2}v${-28*unit}`}/>
        <circle aria-label="回転ハンドル" cx={0} cy={-l.h/2-28*unit} r={7*unit} onPointerDown={e=>begin(e,l,'rotate')}/>
        {[-1,1].flatMap(sx=>[-1,1].map(sy=><rect key={`${sx},${sy}`} aria-label="サイズ変更ハンドル"
          x={sx*l.w/2-7*unit} y={sy*l.h/2-7*unit} width={14*unit} height={14*unit}
          className="resize-handle" onPointerDown={e=>begin(e,l,'resize',sx,sy)}/>))}
      </>}
    </g>)}
  </svg>
}

