import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Circle, Copy, Grid2X2, Minus, MoveUpRight, Plus, Play, Pause, Redo2, Scan, Shapes, Square, Star, Trash2, Triangle, Type, Undo2, WandSparkles } from 'lucide-react'
import Canvas, { type CanvasEdit } from './Canvas'
import Inspector from './Inspector'
import Timeline from './Timeline'
import { useProject } from './useProject'
import { clamp, frame, makeLayer, shapes, timecode, type Kind, type Layer, type Project } from './model'
import { editProject, reorder } from './editor'
import { applyCanvasEdit, applyLayerEdit, atKey, evaluate, keyTimes, offsetPosition, removeKey, setKey, toFrame, withTrimmedStart, type Channel, type Easing } from './animation'
import { usePlayback } from './usePlayback'

const icons={circle:Circle,ellipse:Circle,rect:Square,rounded:Square,triangle:Triangle,polygon:Shapes,star:Star,line:Minus,arrow:MoveUpRight}
export default function App(){
  const {project,past,future,commit,undo,redo}=useProject()
  const [selected,setSelected]=useState(['title'])
  const [draft,setDraft]=useState<Layer[]>()
  const [canvasDraft,setCanvasDraft]=useState<Layer[]>()
  const {current,playing,pause,seek,toggle:togglePlayback}=usePlayback(project.duration)
  const [autoKey,setAutoKey]=useState(false)
  const [grid,setGrid]=useState(false)
  const [snap,setSnap]=useState(false)
  const [zoom,setZoom]=useState(100)
  const clipboard=useRef<Layer[]>([])
  const layers=draft??project.layers
  const selection=layers.filter(l=>selected.includes(l.id))
  const canvasLayers=layers.map(layer=>evaluate(layer,current))
  const selectedLayer=selection[0]
  function select(id:string|null,multi=false){
    setSelected(ids=>!id?[]:multi?ids.includes(id)?ids.filter(v=>v!==id):[...ids,id]:[id])
  }
  function finish(next?:Layer[]){
    setDraft(undefined)
    if(next)commit(p=>next.every((layer,i)=>layer===p.layers[i])?p:{...p,layers:next})
  }
  function canvasChange(edit:CanvasEdit,layers:Layer[]){
    const changed=new Map(edit.before.flatMap((before,i)=>{
      const after=edit.after[i]
      return before===after?[]:[[before.id,{before,after}] as const]
    }))
    return layers.map(layer=>{
      const pose=changed.get(layer.id)
      return pose?applyCanvasEdit(layer,pose.before,pose.after,edit.time,autoKey):layer
    })
  }
  function finishCanvas(edit?:CanvasEdit){
    setCanvasDraft(undefined)
    if(edit)commit(p=>{
      const layers=canvasChange(edit,p.layers)
      return layers.every((layer,i)=>layer===p.layers[i])?p:{...p,layers}
    })
  }
  function add(kind:Kind){
    const start=Math.min(current,frame(project.duration-1/30))
    const layer=makeLayer(kind,project.width/2,project.height/2,start,Math.min(project.duration,frame(start+4)))
    commit(p=>({...p,layers:[layer,...p.layers]}))
    select(layer.id)
  }
  function change(patch:Partial<Project>){commit(p=>editProject(p,patch))}
  function editLayer(patch:Partial<Layer>){
    pause()
    updateSelected(l=>{
      const updated=patch.start===undefined?l:withTrimmedStart(l,patch.start)
      return applyLayerEdit(updated,patch,current,autoKey)
    })
  }
  function updateSelected(edit:(layer:Layer)=>Layer){
    const id=selectedLayer?.id
    if(!id)return
    commit(p=>{
      const index=p.layers.findIndex(l=>l.id===id)
      if(index<0)return p
      const layer=edit(p.layers[index])
      if(layer===p.layers[index])return p
      return {...p,layers:p.layers.map((item,i)=>i===index?layer:item)}
    })
  }
  function record(key:Channel,easing?:Easing){
    pause()
    updateSelected(l=>setKey(l,key,current,evaluate(l,current)[key],easing))
  }
  function recordPosition(easing:Easing){
    pause()
    updateSelected(layer=>{
      const {x,y}=evaluate(layer,current)
      const withX=atKey(layer,'x',current)?layer:setKey(layer,'x',current,x,easing)
      return atKey(layer,'y',current)?withX:setKey(withX,'y',current,y,easing)
    })
  }
  function erase(key:Channel){
    pause()
    updateSelected(l=>removeKey(l,key,current))
  }
  function changeEasing(key:Channel,easing:Easing){
    pause()
    updateSelected(l=>{
      const keyframe=atKey(l,key,current)
      return keyframe?setKey(l,key,current,keyframe.value,easing):l
    })
  }
  function toggle(id:string,key:'locked'|'hidden'){
    commit(p=>({...p,layers:p.layers.map(l=>l.id===id?{...l,[key]:!l[key]}:l)}))
  }
  function remove(){
    if(!selection.some(l=>!l.locked))return
    commit(p=>({...p,layers:p.layers.filter(l=>l.locked || !selected.includes(l.id))}))
    setSelected(selection.filter(l=>l.locked).map(l=>l.id))
  }
  function duplicate(items=selection){
    if(!items.length)return
    const copies=items.map(l=>{
      const end=Math.min(l.end,project.duration)
      const copy=withTrimmedStart(offsetPosition(l,24,24),Math.min(l.start,frame(end-1/30)))
      return {...copy,id:crypto.randomUUID(),name:l.name+' コピー',locked:false,end}
    })
    commit(p=>({...p,layers:[...copies,...p.layers]}))
    setSelected(copies.map(l=>l.id))
  }
  function step(direction:number){seek(current+direction/30)}
  function stepKey(direction:number){
    pause()
    if(selection.length!==1)return
    const frames=keyTimes(selection[0])
    const currentFrame=toFrame(current)
    const target=direction<0?frames.filter(frame=>frame<currentFrame).at(-1):frames.find(frame=>frame>currentFrame)
    if(target!==undefined)seek(target/30)
  }
  useEffect(()=>{
    const keyboard=(e:KeyboardEvent)=>{
      if(e.target instanceof HTMLElement && (e.target.isContentEditable || e.target.closest('input,textarea,select')))return
      const mod=e.ctrlKey||e.metaKey
      const key=e.key.toLowerCase()
      if(mod && key==='z'){e.preventDefault();e.shiftKey?redo():undo()}
      else if(mod && key==='y'){e.preventDefault();redo()}
      else if(mod && key==='d'){e.preventDefault();duplicate()}
      else if(mod && key==='c' && selection.length){e.preventDefault();clipboard.current=selection}
      else if(mod && key==='v' && clipboard.current.length){e.preventDefault();duplicate(clipboard.current)}
      else if(key==='delete'||key==='backspace'){e.preventDefault();remove()}
      else if(e.code==='Space' && !(e.target instanceof HTMLElement && e.target.closest('button'))){e.preventDefault();if(!e.repeat)togglePlayback()}
      else if(key==='escape')select(null)
      else if(key==='arrowleft'||key==='arrowright'){
        e.preventDefault()
        const direction=key==='arrowleft'?-1:1
        if(e.altKey)stepKey(direction)
        else step(direction)
      }
    }
    window.addEventListener('keydown',keyboard)
    return ()=>window.removeEventListener('keydown',keyboard)
  })
  return <main className="studio">
    <header className="topbar">
      <div className="brand"><div className="logo"><WandSparkles size={18}/></div>Motion Studio</div>
      <div className="top-divider"/>
      <input className="project-name" aria-label="プロジェクト名" key={project.name} defaultValue={project.name}
        onBlur={e=>{const name=e.target.value.trim()||project.name;if(name!==project.name)change({name});else e.target.value=name}}
        onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur()}}/>
      <span className="session"><i/>セッション編集中</span>
      <div className="spacer"/>
      <button title="元に戻す (Ctrl+Z)" aria-label="元に戻す" disabled={!past.length} onClick={undo}><Undo2/></button>
      <button title="やり直す (Ctrl+Shift+Z)" aria-label="やり直す" disabled={!future.length} onClick={redo}><Redo2/></button>
    </header>
    <div className="workspace">
      <aside className="library">
        <div className="panel-title"><Shapes/>素材</div>
        <div className="library-content">
          <h3>テキスト</h3>
          <button className="primary" onClick={()=>add('text')}><Type/>テキストを追加<Plus size={15}/></button>
          <h3>図形</h3>
          <div className="shape-grid">{Object.entries(shapes).map(([kind,label])=>{
            const Icon=icons[kind as keyof typeof icons]
            return <button key={kind} onClick={()=>add(kind as Kind)}><Icon className={'shape-icon '+kind}/><span>{label}</span></button>
          })}</div>
        </div>
        <div className="library-footer">Shift + クリックで複数選択</div>
      </aside>
      <section className="viewer" aria-label="キャンバスワークスペース">
        <div className="viewer-bar"><span>プレビュー</span><span className="dimensions">{project.width} × {project.height}</span><div className="spacer"/>
          <button title="グリッドと中央ガイド" aria-label="グリッドと中央ガイド" aria-pressed={grid} className={grid?'toggled':''} onClick={()=>setGrid(v=>!v)}><Grid2X2/></button>
          <button title="縮小" aria-label="キャンバス縮小" onClick={()=>setZoom(v=>clamp(v-25,25,200))}><Minus/></button>
          <button title="表示サイズに合わせる" onClick={()=>setZoom(100)}><Scan/>{zoom}%</button>
          <button title="拡大" aria-label="キャンバス拡大" onClick={()=>setZoom(v=>clamp(v+25,25,200))}><Plus/></button>
        </div>
        <div className="viewport">
          <div className="canvas-fit" style={{'--ratio':project.width/project.height,'--zoom':zoom/100} as React.CSSProperties}>
            <Canvas project={project} layers={canvasDraft??canvasLayers} selected={selected} time={current} grid={grid} snap={snap} select={select} preview={next=>setCanvasDraft(canvasChange(next,project.layers).map(layer=>evaluate(layer,current)))} finish={finishCanvas} pause={pause}/>
          </div>
        </div>
        <div className="viewer-footer">
          <div className="action-group">
            <button title="レイヤーを上へ" aria-label="レイヤーを上へ" disabled={!selection.length} onClick={()=>commit(p=>({...p,layers:reorder(p.layers,selected,-1)}))}><ArrowUp/></button>
            <button title="レイヤーを下へ" aria-label="レイヤーを下へ" disabled={!selection.length} onClick={()=>commit(p=>({...p,layers:reorder(p.layers,selected,1)}))}><ArrowDown/></button>
            <button title="複製 (Ctrl+D)" aria-label="複製" disabled={!selection.length} onClick={()=>duplicate()}><Copy/></button>
            <button title="削除 (Delete)" aria-label="削除" disabled={!selection.some(l=>!l.locked)} onClick={remove}><Trash2/></button>
          </div><div className="spacer"/>
          <button title="前のフレーム" aria-label="前のフレーム" onClick={()=>step(-1)}><ArrowLeft/></button>
          <button className="transport-play" disabled={!!canvasDraft || !!draft} title={playing?'一時停止 (Space)':'再生 (Space)'} aria-label={playing?'一時停止':'再生'} onClick={togglePlayback}>{playing?<Pause/>:<Play/>}</button>
          <span className="counter" aria-label="プレビュー時刻">{timecode(current)}</span>
          <button title="次のフレーム" aria-label="次のフレーム" onClick={()=>step(1)}><ArrowRight/></button>
          <div className="spacer"/><span className="fps">30 fps</span>
        </div>
      </section>
      <Inspector project={project} layer={selectedLayer} count={selection.length} editLayer={editLayer} editProject={change}
        time={current} autoKey={autoKey} setAutoKey={setAutoKey} record={record} recordPosition={recordPosition} erase={erase} changeEasing={changeEasing} seek={seek}/>
    </div>
    <Timeline layers={layers} duration={project.duration} time={current} selected={selected} snap={snap} setSnap={setSnap} seek={seek} pause={pause}
      select={select} toggle={toggle} preview={setDraft} finish={finish}/>
  </main>
}
