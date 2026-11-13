export const shapes = { circle:'円', ellipse:'楕円', rect:'長方形', rounded:'角丸', triangle:'三角形', polygon:'多角形', star:'星', line:'直線', arrow:'矢印' } as const
export type Kind = 'text' | keyof typeof shapes
export interface Layer {
  id:string; kind:Kind; name:string; text:string; x:number; y:number; w:number; h:number; rotation:number;
  color:string; opacity:number; fontSize:number; font:string; bold:boolean; align:'left'|'center'|'right';
  stroke:string; strokeWidth:number; fill:boolean; start:number; end:number; hidden:boolean; locked:boolean;
}
export interface Project { name:string; width:number; height:number; duration:number; background:string; layers:Layer[] }
export const clamp = (n:number, min:number, max:number) => Math.max(min, Math.min(max, n))
export const frame = (n:number) => Math.round(n * 30) / 30
export const fonts = ['Arial','Yu Gothic','Meiryo','Hiragino Sans','Yu Mincho','Georgia','Courier New']
export function makeLayer(kind:Kind, x:number, y:number, start:number, end:number, overrides:Partial<Layer> = {}):Layer {
  return {id:crypto.randomUUID(), kind, name:kind==='text'?'テキスト':shapes[kind], text:'テキスト', x,y,
    w:kind==='text'?400:160,h:kind==='text'?100:kind==='ellipse'?96:160,rotation:0,
    color:kind==='text'?'#f5f2ff':'#9a7bff',opacity:100,fontSize:64,font:'Arial',bold:true,align:'center',
    stroke:'#a28cff',strokeWidth:0,fill:true,start,end,hidden:false,locked:false,...overrides}
}
export function demo():Project {
  return {name:'無題のプロジェクト',width:1280,height:720,duration:15,background:'#100c24',layers:[
    makeLayer('text',640,360,0,12,{id:'title',name:'タイトル',text:'AFTER\nGLOW',fontSize:165,w:820,h:324,color:'#f5eeff'}),
    makeLayer('text',640,572,0,15,{name:'サブタイトル',text:'M O T I O N   S T U D I O',fontSize:22,w:600,h:40,color:'#ccb9ff'}),
    makeLayer('ellipse',640,361,0,15,{name:'オービット',w:1000,h:308,rotation:-20,stroke:'#b99aff',strokeWidth:3,fill:false}),
    makeLayer('ellipse',640,361,0,15,{name:'オービット 2',w:940,h:370,rotation:23,stroke:'#7452e0',strokeWidth:2,fill:false}),
    makeLayer('star',1020,173,0,15,{name:'スター',w:64,h:64,color:'#dbbfff',rotation:13}),
    makeLayer('circle',640,360,0,15,{name:'背景アクセント',w:680,h:680,color:'#32206a',opacity:100}),
  ]}
}
export const timecode = (seconds:number) => {
  const f = Math.round(seconds*30)
  return [Math.floor(f/1800),Math.floor(f/30)%60,f%30].map(n=>String(n).padStart(2,'0')).join(':')
}

