import { useEffect, useRef, useState } from 'react'
import { prefersReducedMotion } from '../motion'

/** 计数滚动的时长。够长到能看出在动，够短到不会挡住读数。 */
const DURATION = 420

/** easeOutCubic：起手快、收尾慢，数字停下时不会「撞」在终值上。 */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

/**
 * 让数字从上一个值滚到新值。
 *
 * 初值直接取目标值而不是 0：首屏渲染时若从 0 滚上来，每次刷新页面都会重播
 * 一遍入场动画，看起来像是数据在跳。真正需要动画的是「值变了」这件事。
 *
 * 开了 prefers-reduced-motion 就跳过动画，直接落到终值。
 */
export function useCountUp(value: number): number {
  const [display, setDisplay] = useState(() => (prefersReducedMotion() ? value : 0))
  const currentRef = useRef(display)

  useEffect(() => {
    const from = currentRef.current
    if (from === value) return

    if (prefersReducedMotion()) {
      currentRef.current = value
      setDisplay(value)
      return
    }

    let frame = 0
    const start = performance.now()
    const step = (now: number) => {
      const progress = Math.min((now - start) / DURATION, 1)
      const next = Math.round(from + (value - from) * easeOutCubic(progress))
      currentRef.current = next
      setDisplay(next)
      if (progress < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [value])

  return display
}

export default useCountUp
