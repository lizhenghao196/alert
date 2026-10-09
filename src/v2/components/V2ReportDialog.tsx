import { X } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { useAnimatedDialog } from '../../hooks/useAnimatedDialog'
import { safeHref } from '../../url'
import type { Alert } from '../../types'

type Props = {
  row: Alert | null
  onClose: () => void
}

function V2ReportDialog({ row, onClose }: Props) {
  const { ref, requestClose, handlers } = useAnimatedDialog(Boolean(row), onClose)
  const href = row ? safeHref(row.href) : ''

  return (
    <dialog
      ref={ref}
      {...handlers}
      className="report-dialog v2-report m-auto max-h-[86vh] w-[min(880px,calc(100vw-40px))] border border-term-rule-strong bg-term-bg text-term-fg"
    >
      {row ? (
        <div className="flex max-h-[86vh] flex-col">
          <header className="flex items-start justify-between gap-4 border-b border-term-rule-strong px-5 py-3.5">
            <div className="min-w-0">
              <div className="v2-mono text-[10px] tracking-[0.16em] text-term-fg-mute">
                {row.alertKey}
              </div>
              <h2 className="mt-1.5 truncate text-[15px] font-medium text-term-fg">
                {row.systemId || '未标注系统'} 告警报告
              </h2>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              {href ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="v2-mono text-[11px] text-term-fg-dim transition-colors duration-100 hover:text-term-amber"
                >
                  原始告警详情
                </a>
              ) : null}
              <button
                type="button"
                onClick={requestClose}
                aria-label="关闭"
                className="grid h-7 w-7 place-items-center border border-term-rule text-term-fg-dim transition-colors duration-100 hover:bg-term-hover hover:text-term-fg"
              >
                <X size={14} strokeWidth={1.75} />
              </button>
            </div>
          </header>

          <div className="v2-report-md overflow-y-auto px-5 py-4">
            <ReactMarkdown>{row.msg}</ReactMarkdown>
          </div>
        </div>
      ) : null}
    </dialog>
  )
}

export default V2ReportDialog
