import { useState } from 'react'
import { ChevronLeft, ChevronRight, Diamond, Trash2 } from 'lucide-react'
import { atKey, channels, channelNames, easings, inClip, toFrame, type Channel, type Easing, type Position } from './animation'
import { type Layer } from './model'

export interface AnimationControls {
  time:number
  pendingPosition?:Position
  autoKey:boolean
  setAutoKey:(active:boolean)=>void
  record:(key:Channel,easing?:Easing)=>void
  recordPosition:(easing:Easing)=>void
  erase:(key:Channel)=>void
  changeEasing:(key:Channel,easing:Easing)=>void
  seek:(time:number)=>void
}
export default function AnimationPanel({layer,time,pendingPosition,autoKey,setAutoKey,record,recordPosition,erase,changeEasing,seek}:{layer:Layer}&AnimationControls){
  const [channel,setChannel]=useState<Channel>('x')
  const [defaultEasing,setDefaultEasing]=useState<Easing>('Linear')
  const keyframe=atKey(layer,channel,time)
  const frame=toFrame(time), start=toFrame(layer.start), end=toFrame(layer.end)
  const frames=(layer.tracks?.[channel]??[]).map(key=>start+key.frame).filter(frame=>frame>=start&&frame<end)
  const previous=frames.filter(value=>value<frame).at(-1)
  const next=frames.find(value=>value>frame)
  return <section className="animation-controls">
    <h3>アニメーション</h3>
    <label className="checkbox"><input type="checkbox" checked={autoKey} onChange={e=>setAutoKey(e.target.checked)}/>キーフレームを自動登録</label>
    <label className="field"><span>対象プロパティ</span><select aria-label="対象プロパティ" value={channel} onChange={e=>setChannel(e.target.value as Channel)}>
      {channelNames.filter(key=>key!=='fontSize'||layer.kind==='text').map(key=><option key={key} value={key}>{channels[key]}</option>)}
    </select></label>
    <label className="field"><span>イージング</span><select aria-label="イージング" value={keyframe?.easing??defaultEasing} onChange={e=>{
      const value=e.target.value as Easing
      if(keyframe)changeEasing(channel,value)
      else setDefaultEasing(value)
    }}>{easings.map(easing=><option key={easing}>{easing}</option>)}</select></label>
    <div className="key-actions">
      <button type="button" aria-label="前のキーフレーム" disabled={previous===undefined} onClick={()=>seek(previous!/30)}><ChevronLeft/></button>
      <button type="button" className={'key-add'+(keyframe?' toggled':'')} disabled={!inClip(layer,time)||!!keyframe}
        onClick={()=>record(channel,defaultEasing)}><Diamond/>{keyframe?'登録済み':'キーを追加'}</button>
      <button type="button" aria-label="キーフレームを削除" disabled={!keyframe} onClick={()=>erase(channel)}><Trash2/></button>
      <button type="button" aria-label="次のキーフレーム" disabled={next===undefined} onClick={()=>seek(next!/30)}><ChevronRight/></button>
    </div>
    <button type="button" className="position-key" disabled={!inClip(layer,time)||(!pendingPosition&&!!atKey(layer,'x',time)&&!!atKey(layer,'y',time))}
      onClick={()=>recordPosition(defaultEasing)}><Diamond/>位置（X・Y）のキーを追加</button>
    <p className="animation-hint">{pendingPosition?'位置が未登録です。「位置（X・Y）のキーを追加」で確定します。':!inClip(layer,time)?'再生ヘッドをクリップ内に移動してください。':keyframe?'この位置のプロパティを編集できます。':'イージングは選んだキーに到達する区間に適用されます。'}</p>
  </section>
}
