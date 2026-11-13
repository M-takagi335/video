import { useCallback, useState } from 'react'
import { demo, type Project } from './model'
type Edit = (project:Project)=>Project
export function useProject(){
  const [state,set] = useState(()=>({past:[] as Project[], project:demo(), future:[] as Project[]}))
  const commit = useCallback((edit:Edit)=>set(s=>{
    const project=edit(s.project)
    return project===s.project?s:{project,past:[...s.past.slice(-79),s.project],future:[]}
  }),[])
  const undo=useCallback(()=>set(s=>s.past.length?{project:s.past[s.past.length-1],past:s.past.slice(0,-1),future:[s.project,...s.future]}:s),[])
  const redo=useCallback(()=>set(s=>s.future.length?{project:s.future[0],past:[...s.past,s.project],future:s.future.slice(1)}:s),[])
  return {...state,commit,undo,redo}
}
