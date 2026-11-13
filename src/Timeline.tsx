import { useRef, useState, type PointerEvent } from 'react'
import { ChevronDown, ChevronUp, Eye, EyeOff, Grip, Lock, Unlock, Magnet, Minus, Plus, Type, Shapes } from 'lucide-react'
import { clamp, frame, timecode, type Layer } from './model'
import { retime } from './editor'
import { channels, keysAt, keyTimes, moveKeys, toFrame, type Channel } from './animation'

interface Props {
  layers:Layer[]; duration:number; time:number; selected:string[]; snap:boolean; channel:Channel;
  pause:()=>void; setSnap:(s:boolean)=>void; seek:(t:number)=>void; select:(id:string,multi?:boolean)=>void;
  toggle:(id:string,key:'locked'|'hidden')=>void; preview:(layers:Layer[])=>void; finish:(layers?:Layer[])=>void;
}
const trackHeader=212
export default function Timeline({layers,duration,time,selected,snap,setSnap,seek,select,toggle,preview,finish,pause,channel}:Props){
  const [height,setHeight]=useState(274)
  const [fold,setFold]=useState(false)
  const [scale,setScale]=useState(65)
  const scroll=useRef<HTMLDivElement>(null)
  const drag=useRef<{x:number; layer:Layer; layers:Layer[]; mode:'move'|'start'|'end'; result?:Layer[]} | null>(null)
  const keyDrag=useRef<{x:number; pointerId:number; from:number; to:number; layer:Layer; keys:Channel[]; moved:boolean} | null>(null)
  const [keyPreview,setKeyPreview]=useState<{id:string;frame:number}>()
  const head=useRef(false)
  const resize=useRef<{y:number; height:number}|null>(null)
  const tickStep=scale<25?5:scale<50?2:1
  const ticks=Array.from({length:Math.floor(duration/tickStep)+1},(_,i)=>i*tickStep)
  function seekAt(e:PointerEvent){
    const el=scroll.current!
    seek(frame(clamp((e.clientX-el.getBoundingClientRect().left+el.scrollLeft-trackHeader)/scale,0,duration)))
  }
  function startClip(e:PointerEvent,l:Layer,mode:'move'|'start'|'end'){
    if(e.button!==0)return
    e.stopPropagation()
    select(l.id,e.shiftKey)
    if(l.locked || e.shiftKey)return
    pause()
    drag.current={x:e.clientX,layer:l,layers,mode}
    scroll.current!.setPointerCapture(e.pointerId)
  }
  function startKey(e:PointerEvent,layer:Layer,from:number,individual:boolean){
    if(e.button!==0)return
    e.stopPropagation()
    const keys=keysAt(layer,from).filter(key=>!individual||key===channel)
    if(layer.locked || !keys.length){select(layer.id);seek(from/30);return}
    pause()
    keyDrag.current={x:e.clientX,pointerId:e.pointerId,from,to:from,layer,keys,moved:false}
    scroll.current!.setPointerCapture(e.pointerId)
  }
  function move(e:PointerEvent){
    const marker=keyDrag.current
    if(marker && marker.pointerId===e.pointerId){
      const dx=e.clientX-marker.x
      if(Math.abs(dx)>=3)marker.moved=true
      if(marker.moved){
        const raw=marker.from+dx/scale*30
        marker.to=clamp(Math.round(raw/(snap?15:1))*(snap?15:1),toFrame(marker.layer.start),toFrame(marker.layer.end)-1)
        setKeyPreview({id:marker.layer.id,frame:marker.to})
      }
      return
    }
    if(head.current)seekAt(e)
    const g=drag.current
    if(!g || (!g.result && Math.abs(e.clientX-g.x)<3))return
    const raw=(e.clientX-g.x)/scale
    const anchor=g.mode==='end'?g.layer.end:g.layer.start
    const delta=snap?Math.round((anchor+raw)*2)/2-anchor:raw
    const layer=retime(g.layer,delta,g.mode,duration)
    g.result=g.layers.map(l=>l.id===layer.id?layer:l)
    preview(g.result)
  }
  function end(cancel=false){
    const marker=keyDrag.current
    if(marker){
      keyDrag.current=null
      setKeyPreview(undefined)
      if(cancel)return
      const next=marker.moved?moveKeys(marker.layer,marker.from,marker.to,marker.keys):marker.layer
      if(next!==marker.layer)finish(layers.map(layer=>layer.id===next.id?next:layer))
      select(marker.layer.id)
      seek((next===marker.layer?marker.from:marker.to)/30)
      return
    }
    head.current=false
    const result=drag.current?.result
    drag.current=null
    if(result)finish(cancel?undefined:result)
  }
  return <section className="timeline" aria-label="タイムライン" style={{height:fold?46:height}}>
    {!fold && <div className="timeline-resize" aria-label="タイムラインの高さを変更" role="separator" aria-orientation="horizontal" tabIndex={0}
      onKeyDown={e=>{if(e.key==='ArrowUp'||e.key==='ArrowDown'){e.preventDefault();setHeight(h=>clamp(h+(e.key==='ArrowUp'?20:-20),144,window.innerHeight*.65))}}}
      onPointerDown={e=>{resize.current={y:e.clientY,height};e.currentTarget.setPointerCapture(e.pointerId)}}
      onPointerMove={e=>{const g=resize.current;if(g)setHeight(clamp(g.height+g.y-e.clientY,144,window.innerHeight*.65))}}
      onPointerUp={()=>{resize.current=null}} onPointerCancel={()=>{resize.current=null}}><Grip size={14}/></div>}
    <div className="timeline-bar"><button className="timeline-title" aria-expanded={!fold} onClick={()=>setFold(v=>!v)}>{fold?<ChevronUp/>:<ChevronDown/>}タイムライン</button>
      <span className="counter">{timecode(time)} <i>/</i> {timecode(duration)}</span>
      <div className="spacer"/><button aria-label="スナップ" aria-pressed={snap} className={snap?'toggled':''} onClick={()=>setSnap(!snap)}><Magnet/></button>
      <button aria-label="タイムライン縮小" onClick={()=>setScale(v=>clamp(v-15,10,200))}><Minus/></button>
      <input aria-label="タイムラインズーム" type="range" min="10" max="200" value={scale} onChange={e=>setScale(+e.target.value)}/>
      <button aria-label="タイムライン拡大" onClick={()=>setScale(v=>clamp(v+15,10,200))}><Plus/></button>
    </div>
    {!fold && <div ref={scroll} className="track-scroll" onPointerMove={move} onPointerUp={()=>end()}
      onPointerCancel={()=>end(true)} onLostPointerCapture={()=>{if(drag.current || head.current || keyDrag.current)end(true)}}>
      <div className="track-content" style={{width:trackHeader+duration*scale,minWidth:'100%'}}>
        <div className="ruler-row"><span className="track-label ruler-label">レイヤー <small>{layers.length}</small></span>
          <div className="ruler" onPointerDown={e=>{if(e.button!==0)return;head.current=true;seekAt(e);scroll.current!.setPointerCapture(e.pointerId)}}>
            {ticks.map(t=><span key={t} style={{left:t*scale}}>{Math.floor(t/60)}:{String(t%60).padStart(2,'0')}</span>)}
          </div></div>
        {layers.map(l=><div className={'track-row '+(selected.includes(l.id)?'chosen':'')} key={l.id}>
          <div className="track-label">
            <button className="layer-name" onClick={e=>select(l.id,e.shiftKey)}>{l.kind==='text'?<Type/>:<Shapes/>}<span>{l.name}</span></button>
            <button aria-label={l.hidden?'表示':'非表示'} title={l.hidden?'表示':'非表示'} onClick={()=>toggle(l.id,'hidden')}>{l.hidden?<EyeOff/>:<Eye/>}</button>
            <button aria-label={l.locked?'ロック解除':'ロック'} title={l.locked?'ロック解除':'ロック'} onClick={()=>toggle(l.id,'locked')}>{l.locked?<Lock/>:<Unlock/>}</button>
          </div>
          <div className="track-lane" style={{backgroundSize:`${scale*tickStep}px 100%`}} onPointerDown={e=>{if(e.button!==0)return;head.current=true;seekAt(e);scroll.current!.setPointerCapture(e.pointerId)}}>
            <div className={`clip ${l.kind==='text'?'text-clip':'shape-clip'} ${l.hidden?'hidden-clip':''}`}
              aria-label={l.name+' クリップ'} style={{left:l.start*scale,width:(l.end-l.start)*scale}} onPointerDown={e=>startClip(e,l,'move')}>
              <span>{l.kind==='text'?<Type/>:<Shapes/>}{l.name}</span>
              <div className="trim start" aria-label="開始位置を調整" onPointerDown={e=>startClip(e,l,'start')}/>
              <div className="trim end" aria-label="終了位置を調整" onPointerDown={e=>startClip(e,l,'end')}/>
            </div>
            {keyTimes(l).map(frame=>{
              const keys=keysAt(l,frame)
              const timeLabel=timecode(frame/30)
              return <div className="key-slot" key={frame} style={{left:Math.max(5,frame/30*scale)}}>
                <button type="button" className={'key-marker'+(toFrame(time)===frame?' current':'')}
                  title={timeLabel+' · '+keys.map(key=>channels[key]).join('、')}
                  aria-label={l.name+' のキーフレーム '+timeLabel}
                  onPointerDown={e=>startKey(e,l,frame,false)}
                  onClick={e=>{if(e.detail===0){select(l.id);seek(frame/30)}}}/>
                {keys.length>1 && <span className="key-count">{keys.length}</span>}
                {selected.includes(l.id) && keys.includes(channel) && <button type="button" className="axis-marker"
                  title={channels[channel]+'だけを移動'}
                  aria-label={l.name+' の '+channels[channel]+' キー '+timeLabel}
                  onPointerDown={e=>startKey(e,l,frame,true)}
                  onClick={e=>{if(e.detail===0)seek(frame/30)}}/>}
              </div>
            })}
            {keyPreview?.id===l.id && <span className="key-ghost" style={{left:Math.max(5,keyPreview.frame/30*scale)}}/>}
          </div>
        </div>)}
        <div className="playhead" style={{left:trackHeader+time*scale}}/>
      </div>
    </div>}
  </section>
}
