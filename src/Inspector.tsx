import { useState } from 'react'
import { Layers3, SlidersHorizontal } from 'lucide-react'
import { clamp, fonts, frame, type Layer, type Project } from './model'

function NumberField({label,value,min,max,step=1,disabled=false,change}:{label:string;value:number;min:number;max:number;step?:number;disabled?:boolean;change:(n:number)=>void}){
  const [draft,setDraft]=useState<string|null>(null)
  return <label className="field"><span>{label}</span><input aria-label={label} type="number" min={min} max={max} step={step} disabled={disabled}
    value={draft ?? Number(value.toFixed(3))}
    onChange={e=>setDraft(e.target.value)}
    onBlur={()=>{if(draft!==null && draft.trim() && Number.isFinite(Number(draft)))change(clamp(Number(draft),min,max));setDraft(null)}}
    onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur()}}/></label>
}
export default function Inspector({project,layer,count,editLayer,editProject}:{project:Project;layer?:Layer;count:number;editLayer:(p:Partial<Layer>)=>void;editProject:(p:Partial<Project>)=>void}){
  const [custom,setCustom]=useState(false)
  const [tab,setTab]=useState<'layer'|'canvas'>('layer')
  const ratio=project.width*9===project.height*16?'16:9':project.width*16===project.height*9?'9:16':project.width===project.height?'1:1':'custom'
  const dimensions:Record<string,[number,number]>={'16:9':[1280,720],'9:16':[720,1280],'1:1':[1080,1080]}
  const number=(label:string,key:'x'|'y'|'w'|'h'|'rotation'|'opacity'|'fontSize'|'strokeWidth',min:number,max:number)=>layer&&
    <NumberField label={label} value={layer[key]} min={min} max={max} change={n=>editLayer({[key]:n})}/>
  return <aside className="inspector">
    <div className="panel-tabs"><button className={tab==='layer'?'active':''} onClick={()=>setTab('layer')}><SlidersHorizontal/>プロパティ</button>
      <button className={tab==='canvas'?'active':''} onClick={()=>setTab('canvas')}>キャンバス</button></div>
    <div className="inspector-content">
    {tab==='canvas'?<>
      <section><h3>キャンバス設定</h3><label className="field"><span>画面比率</span><select aria-label="画面比率" value={custom?'custom':ratio} onChange={e=>{
        const size=dimensions[e.target.value]
        setCustom(!size)
        if(size)editProject({width:size[0],height:size[1]})

      }}><option>16:9</option><option>9:16</option><option>1:1</option><option value="custom">カスタム</option></select></label>
      <div className="field-pair"><NumberField label="幅 (px)" value={project.width} min={64} max={8192} change={width=>editProject({width:Math.round(width)})}/>
      <NumberField label="高さ (px)" value={project.height} min={64} max={8192} change={height=>editProject({height:Math.round(height)})}/></div>
      <label className="field"><span>背景色</span><input type="color" value={project.background} onChange={e=>editProject({background:e.target.value})}/></label>
      <NumberField label="長さ (秒)" value={project.duration} min={1} max={600} step={.1} change={duration=>editProject({duration:frame(duration)})}/></section>
    </>:layer && count===1?<fieldset key={layer.id} disabled={layer.locked}>
      <section className="layer-heading"><Layers3 size={17}/><input aria-label="レイヤー名" key={layer.name} defaultValue={layer.name} onBlur={e=>{if(e.target.value.trim() && e.target.value!==layer.name)editLayer({name:e.target.value.trim()})}} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur()}}/></section>
      <section><h3>トランスフォーム</h3><div className="field-pair">{number('X 座標','x',-16384,16384)}{number('Y 座標','y',-16384,16384)}
      {number('幅','w',8,8192)}{number('高さ','h',8,8192)}{number('回転 (°)','rotation',-3600,3600)}{number('不透明度 (%)','opacity',0,100)}</div></section>
      <section><h3>{layer.kind==='text'?'テキスト':'スタイル'}</h3>
        {layer.kind==='text' && <>
          <textarea aria-label="テキスト内容" key={layer.text} defaultValue={layer.text} onBlur={e=>{if(e.target.value!==layer.text)editLayer({text:e.target.value})}}/>
          <label className="field"><span>フォント</span><select value={layer.font} onChange={e=>editLayer({font:e.target.value})}>{fonts.map(font=><option key={font} style={{fontFamily:font}}>{font}</option>)}</select></label>
          <div className="field-pair">{number('文字サイズ','fontSize',6,1024)}<label className="field"><span>文字揃え</span><select value={layer.align} onChange={e=>editLayer({align:e.target.value as Layer['align']})}><option value="left">左</option><option value="center">中央</option><option value="right">右</option></select></label></div>
          <label className="checkbox"><input type="checkbox" checked={layer.bold} onChange={e=>editLayer({bold:e.target.checked})}/>太字</label>
        </>}
        <div className="field-pair"><label className="field"><span>色</span><input type="color" value={layer.color} onChange={e=>editLayer({color:e.target.value})}/></label>
        <label className="field"><span>枠線の色</span><input type="color" value={layer.stroke} onChange={e=>editLayer({stroke:e.target.value})}/></label></div>
        {layer.kind!=='text' && layer.kind!=='line' && <label className="checkbox"><input type="checkbox" checked={layer.fill} onChange={e=>editLayer({fill:e.target.checked})}/>塗りつぶし</label>}
        {number('枠線の太さ','strokeWidth',0,100)}
      </section>
      <section><h3>クリップ</h3><div className="field-pair">
        <NumberField label="開始 (秒)" value={layer.start} min={0} max={layer.end-1/30} step={1/30} change={n=>editLayer({start:frame(n)})}/>
        <NumberField label="終了 (秒)" value={layer.end} min={layer.start+1/30} max={project.duration} step={1/30} change={n=>editLayer({end:frame(n)})}/>
      </div></section>
    </fieldset>:<div className="empty"><Layers3 size={26}/><p>{count?count+' レイヤーを選択中':'レイヤーを選択してください'}</p></div>}
    </div>
  </aside>
}

