import { useCallback, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

export const THEME_KEY = 'alert-screen.theme'

function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark'
}

export function systemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/**
 * 只返回用户手动选过的主题。区分「没选过」和「选过」是本模块的关键：
 * 没选过时应当实时跟随系统，选过之后系统变化就不再影响页面。
 */
export function storedTheme(): Theme | null {
  try {
    const raw = localStorage.getItem(THEME_KEY)
    return isTheme(raw) ? raw : null
  } catch {
    return null
  }
}

export function readTheme(): Theme {
  return storedTheme() ?? systemTheme()
}

export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme)
}

function persistTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    /* ignore quota / disabled */
  }
}

const SWITCH_MS = 360

export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(readTheme)

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      if (storedTheme()) return
      const next = systemTheme()
      applyTheme(next)
      setTheme(next)
    }
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  const toggle = useCallback(() => {
    const root = document.documentElement
    // 读 DOM 而不是闭包里的 state：首帧主题是 index.html 的内联脚本写上去的，
    // 以实际生效的值为准才不会第一次点击就跳错方向。
    const next: Theme = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'

    root.classList.add('theme-switching')
    window.setTimeout(() => root.classList.remove('theme-switching'), SWITCH_MS)

    persistTheme(next)
    applyTheme(next)
    setTheme(next)
  }, [])

  return [theme, toggle]
}
