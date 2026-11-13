import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Circle, Copy, Grid2X2, Minus, MoveUpRight, Plus, Redo2, Scan, Shapes, Square, Star, Trash2, Triangle, Type, Undo2, WandSparkles } from 'lucide-react'
import Canvas from './Canvas'
import Inspector from './Inspector'
import Timeline from './Timeline'
import { useProject } from './useProject'
import { clamp, frame, makeLayer, shapes, timecode, type Kind, type Layer, type Project } from './model'
import { editProject, reorder } from './editor'
const icons={circle:Circle,ellipse:Circle,rect:Square,rounded:Square,triangle:Triangle,polygon:Shapes,star:Star,line:Minus,arrow:MoveUpRight}
export default function App(){
  const {project,past,future,commit,undo,redo}=useProject()
  const [selected,setSelected]=useState(['title'])
  const [draft,setDraft]=useState<Layer[]>()
  const [time,setTime]=useState(0)
  const [grid,setGrid]=useState(false)
  const [snap,setSnap]=useState(false)
  const [zoom,setZoom]=useState(100)
  const clipboard=useRef<Layer[]>([])
  const layers=draft??project.layers
  const selection=layers.filter(l=>selected.includes(l.id))
  const current=clamp(time,0,project.duration)
  function select(id:string|null,multi=false){
    setSelected(ids=>!id?[]:multi?ids.includes(id)?ids.filter(v=>v!==id):[...ids,id]:[id])
  }
  function finish(next?:Layer[]){
    setDraft(undefined)
    if(next)commit(p=>({...p,layers:next}))
  }
  function add(kind:Kind){
    const start=Math.min(current,frame(project.duration-1/30))
    const layer=makeLayer(kind,project.width/2,project.height/2,start,Math.min(project.duration,frame(start+4)))
    commit(p=>({...p,layers:[layer,...p.layers]}))
    select(layer.id)
  }
  function change(patch:Partial<Project>){commit(p=>editProject(p,patch))}
  function editLayer(patch:Partial<Layer>){
    commit(p=>({...p,layers:p.layers.map(l=>l.id===selection[0]?.id&&!l.locked?{...l,...patch}:l)}))
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
      return {...l,id:crypto.randomUUID(),name:l.name+' コピー',x:l.x+24,y:l.y+24,locked:false,start:Math.min(l.start,frame(end-1/30)),end}
    })
    commit(p=>({...p,layers:[...copies,...p.layers]}))
    setSelected(copies.map(l=>l.id))
  }
  function step(direction:number){setTime(frame(clamp(current+direction/30,0,project.duration)))}
  useEffect(()=>{
    const keyboard=(e:KeyboardEvent)=>{
      if(e.target instanceof HTMLElement && e.target.closest('input,textarea,select,[contenteditable]'))return
      const mod=e.ctrlKey||e.metaKey
      const key=e.key.toLowerCase()
      if(mod && key==='z'){e.preventDefault();e.shiftKey?redo():undo()}
      else if(mod && key==='y'){e.preventDefault();redo()}
      else if(mod && key==='d'){e.preventDefault();duplicate()}
      else if(mod && key==='c' && selection.length){e.preventDefault();clipboard.current=selection}
      else if(mod && key==='v' && clipboard.current.length){e.preventDefault();duplicate(clipboard.current)}
      else if(key==='delete'||key==='backspace'){e.preventDefault();remove()}
      else if(key==='escape')select(null)
      else if(key==='arrowleft'||key==='arrowright'){e.preventDefault();step(key==='arrowleft'?-1:1)}
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
            <Canvas project={project} layers={layers} selected={selected} time={current} grid={grid} snap={snap} select={select} preview={setDraft} finish={finish}/>
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
          <span className="counter">{timecode(current)}</span>
          <button title="次のフレーム" aria-label="次のフレーム" onClick={()=>step(1)}><ArrowRight/></button>
          <div className="spacer"/><span className="fps">30 fps</span>
        </div>
      </section>
      <Inspector project={project} layer={selection[0]} count={selection.length} editLayer={editLayer} editProject={change}/>
    </div>
    <Timeline layers={layers} duration={project.duration} time={current} selected={selected} snap={snap} setSnap={setSnap} seek={setTime}
      select={select} toggle={toggle} preview={setDraft} finish={finish}/>
  </main>
}
