import { useCallback, useEffect, useRef, useState } from 'react'
import alertSoundUrl from '../assets/alerts-error.mp3'
import type { Alert } from '../types'

const SOUND_KEY = 'alert-screen.sound'

export type V4AlertSound = {
  muted: boolean
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
    /* localStorage 不可用时仍保留当前页面内的静音状态。 */
  }
}

/** V4 按成功巡检批次提示：该批次只要存在异常就播放一次。 */
export function useV4AlertSound(
  rows: Alert[],
  queried: boolean,
  refreshTick: number,
): V4AlertSound {
  const [muted, setMuted] = useState(readMuted)
  const [blocked, setBlocked] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const handledTickRef = useRef<number | null>(null)

  useEffect(() => {
    if (!queried || handledTickRef.current === refreshTick) return

    handledTickRef.current = refreshTick
    if (muted || !rows.some((row) => row.code === 1)) return

    const audio = audioRef.current ?? new Audio(alertSoundUrl)
    audioRef.current = audio
    audio.currentTime = 0
    audio.play().then(
      () => setBlocked(false),
      (error: unknown) => {
        if (error instanceof DOMException && error.name === 'NotAllowedError') {
          setBlocked(true)
        }
      },
    )
  }, [muted, queried, refreshTick, rows])

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
