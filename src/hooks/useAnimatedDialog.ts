import { useCallback, useEffect, useRef } from 'react'
import type { AnimationEvent, MouseEvent, SyntheticEvent } from 'react'
import { prefersReducedMotion } from '../motion'

const EXIT_FALLBACK_MS = 400

/**
 * 原生 <dialog> 的开合动画控制。
 *
 * 关闭路径（关闭按钮 / Esc / 点遮罩）都走 requestClose：先挂 closing 类播退场，
 * 靠 animationend 收尾，所以 reduced-motion 把动画压成 0.01ms 时会立刻关掉，
 * 而不用干等一个固定 timeout。fallback 只是 animationend 没来时的保险。
 *
 * 配套的 CSS 类在 index.css 的 .report-dialog 里。
 */
export function useAnimatedDialog(open: boolean, onClosed: () => void) {
  const ref = useRef<HTMLDialogElement>(null)
  const fallback = useRef<number | null>(null)

  const clearFallback = useCallback(() => {
    if (fallback.current !== null) {
      window.clearTimeout(fallback.current)
      fallback.current = null
    }
  }, [])

  const finishClose = useCallback(() => {
    clearFallback()
    const dialog = ref.current
    if (!dialog) return
    dialog.classList.remove('closing')
    if (dialog.open) dialog.close()
    onClosed()
  }, [clearFallback, onClosed])

  const requestClose = useCallback(() => {
    const dialog = ref.current
    if (!dialog || !dialog.open) {
      onClosed()
      return
    }
    if (dialog.classList.contains('closing')) return

    if (prefersReducedMotion()) {
      finishClose()
      return
    }

    dialog.classList.add('closing')
    fallback.current = window.setTimeout(finishClose, EXIT_FALLBACK_MS)
  }, [finishClose, onClosed])

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return

    if (open) {
      clearFallback()
      dialog.classList.remove('closing')
      if (!dialog.open) dialog.showModal()
    } else if (dialog.open) {
      clearFallback()
      dialog.classList.remove('closing')
      dialog.close()
    }
  }, [open, clearFallback])

  useEffect(() => clearFallback, [clearFallback])

  const handlers = {
    onCancel: (event: SyntheticEvent<HTMLDialogElement>) => {
      event.preventDefault()
      requestClose()
    },
    // 内容包在内层元素里，所以点到 dialog 自身就是点到了遮罩
    onClick: (event: MouseEvent<HTMLDialogElement>) => {
      if (event.target === ref.current) requestClose()
    },
    onAnimationEnd: (event: AnimationEvent<HTMLDialogElement>) => {
      if (event.target !== ref.current) return
      if (ref.current?.classList.contains('closing')) finishClose()
    },
  }

  return { ref, requestClose, handlers }
}
