import { useCallback, useEffect, useRef, useState } from 'react'
import { clamp } from './model'
import { toFrame } from './animation'

export function usePlayback(duration:number){
  const [time,setTime]=useState(0)
  const [playing,setPlaying]=useState(false)
  const clock=useRef<{time:number;stamp:number}|null>(null)
  const request=useRef<number|undefined>(undefined)
  const pause=useCallback(()=>{
    clock.current=null
    if(request.current!==undefined)cancelAnimationFrame(request.current)
    request.current=undefined
    setPlaying(false)
  },[])
  const seek=(value:number)=>{
    pause()
    setTime(clamp(toFrame(value)/30,0,duration))
  }
  const current=clamp(time,0,duration)
  function toggle(){
    if(clock.current){pause();return}
    const start=current>=duration?0:current
    setTime(start)
    clock.current={time:start,stamp:performance.now()}
    setPlaying(true)
    const advance=(now:number)=>{
      const origin=clock.current
      if(!origin)return
      const elapsed=origin.time+(now-origin.stamp)/1000
      if(elapsed>=duration){setTime(duration);pause();return}
      setTime(Math.floor(elapsed*30+1e-7)/30)
      request.current=requestAnimationFrame(advance)
    }
    request.current=requestAnimationFrame(advance)
  }
  useEffect(()=>{
    pause()
    setTime(value=>Math.min(value,duration))
    return ()=>{
      clock.current=null
      if(request.current!==undefined)cancelAnimationFrame(request.current)
    }
  },[duration,pause])
  return {current,playing,pause,seek,toggle}
}
