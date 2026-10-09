import { useCallback, useEffect, useRef, useState } from 'react'
import alertSoundUrl from '../assets/alerts-error.mp3'
import type { Alert } from '../types'

const SOUND_KEY = 'alert-screen.sound'

export type AlertSound = {
  muted: boolean
  /** 浏览器拦截了自动播放。需要用户先与页面交互一次才会解锁。 */
  blocked: boolean
  toggleMuted: () => void
}

function readMuted(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) === 'off'
  } catch {
    return false
  }
}

function writeMuted(muted: boolean): void {
  try {
    if (muted) localStorage.setItem(SOUND_KEY, 'off')
    else localStorage.removeItem(SOUND_KEY)
  } catch {
    /* ignore quota / disabled */
  }
}

/**
 * 巡检回来发现「新的」异常时播一声提示音。
 *
 * 「新」的判定是拿本轮的异常 alertKey 集合和上一轮比：出现没见过的 key 才响。
 * 同样的异常一直存在不会重复响，否则 30 秒一次、一天不停。用 alertKey 而不是
 * 整行内容，是因为摘要文案变了不算出现新告警。
 *
 * 首轮结果里的异常相对空集合都是「新」的，所以打开页面就会响一次。
 *
 * `queried` 用来区分「还没拿到结果」和「结果就是空的」：重新查询前 confirm 会先把
 * rows 清空，如果这时候拿空集合去推进基线，等新结果回来时所有异常都会被当成新的
 * 再响一遍。
 */
export function useAlertSound(rows: Alert[], queried: boolean): AlertSound {
  const [muted, setMuted] = useState(readMuted)
  const [blocked, setBlocked] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const seenRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!queried) return

    const abnormalKeys = new Set(
      rows.filter((row) => row.code === 1).map((row) => row.alertKey),
    )

    let hasNew = false
    for (const key of abnormalKeys) {
      if (!seenRef.current.has(key)) {
        hasNew = true
        break
      }
    }
    // 静音时也要推进基线，否则一解除静音就会把当前存在的异常全部补响一遍
    seenRef.current = abnormalKeys

    if (!hasNew || muted) return

    const audio = audioRef.current ?? new Audio(alertSoundUrl)
    audioRef.current = audio
    audio.currentTime = 0
    // play() 被自动播放策略拦下时是 Promise reject 而不是抛异常。
    // 只有 NotAllowedError 才算「被拦截」，否则音频文件没加载到（404、被代理拦掉）
    // 也会被误报成自动播放问题，而用户点遍全屏也不会好。
    audio.play().catch((err: unknown) => {
      if (err instanceof DOMException && err.name === 'NotAllowedError') setBlocked(true)
    })
  }, [rows, queried, muted])

  // 用户与页面交互过之后，浏览器的粘性激活会永久解锁该文档，不需要再播放什么来「测试」
  useEffect(() => {
    if (!blocked) return
    const unlock = () => setBlocked(false)
    document.addEventListener('pointerdown', unlock, { once: true })
    return () => document.removeEventListener('pointerdown', unlock)
  }, [blocked])

  const toggleMuted = useCallback(() => {
    setMuted((current) => {
      writeMuted(!current)
      return !current
    })
  }, [])

  return { muted, blocked, toggleMuted }
}
