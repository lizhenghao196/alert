import { useCallback, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { prefersReducedMotion } from '../motion'
import type { Alert } from '../types'

type Props = {
  row: Alert | null
  onClose: () => void
}

const EXIT_FALLBACK_MS = 400

function ReportDialog({ row, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const fallback = useRef<number | null>(null)

  const clearFallback = () => {
    if (fallback.current !== null) {
      window.clearTimeout(fallback.current)
      fallback.current = null
    }
  }

  const finishClose = useCallback(() => {
    clearFallback()
    const dialog = ref.current
    if (!dialog) return
    dialog.classList.remove('closing')
    if (dialog.open) dialog.close()
    onClose()
  }, [onClose])

  /**
   * 所有关闭路径（按钮 / Esc / 点遮罩）都走这里，先播退场动画再真正 close()。
   * 退场靠 animationend 收尾，所以 reduced-motion 下动画被压成 0.01ms 时
   * 弹窗会立刻关掉，而不用干等一个固定的 timeout。
   */
  const requestClose = useCallback(() => {
    const dialog = ref.current
    if (!dialog || !dialog.open) {
      onClose()
      return
    }
    if (dialog.classList.contains('closing')) return

    if (prefersReducedMotion()) {
      finishClose()
      return
    }

    dialog.classList.add('closing')
    fallback.current = window.setTimeout(finishClose, EXIT_FALLBACK_MS)
  }, [finishClose, onClose])

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return

    if (row) {
      clearFallback()
      dialog.classList.remove('closing')
      if (!dialog.open) dialog.showModal()
    } else if (dialog.open) {
      clearFallback()
      dialog.classList.remove('closing')
      dialog.close()
    }
  }, [row])

  useEffect(() => clearFallback, [])

  return (
    <dialog
      ref={ref}
      className="report-dialog m-auto max-h-[82vh] w-[min(820px,calc(100vw-48px))] overflow-hidden rounded-2xl border border-line bg-panel text-fg shadow-pop"
      onCancel={(event) => {
        event.preventDefault()
        requestClose()
      }}
      onClick={(event) => {
        // 内容包在内层 div 里，所以点到 dialog 自身就是点到了遮罩
        if (event.target === ref.current) requestClose()
      }}
      onAnimationEnd={(event) => {
        if (event.target !== ref.current) return
        if (ref.current?.classList.contains('closing')) finishClose()
      }}
    >
      {row ? (
        <div className="flex max-h-[82vh] flex-col">
          <header className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
            <div className="min-w-0">
              <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-fg-mute tabular-nums">
                {row.alertKey}
              </div>
              <h3 className="mt-1.5 text-[18px] font-semibold text-fg">
                {row.systemId} · 告警报告
              </h3>
            </div>
            <button
              type="button"
              onClick={requestClose}
              aria-label="关闭"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-line text-fg-soft transition-colors duration-200 hover:bg-raise hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            >
              <X size={15} strokeWidth={2} />
            </button>
          </header>

          <div className="report-md overflow-y-auto px-6 py-5">
            <ReactMarkdown>{row.msg}</ReactMarkdown>
          </div>
        </div>
      ) : null}
    </dialog>
  )
}

export default ReportDialog
