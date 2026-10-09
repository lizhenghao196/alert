import { ExternalLink, FileText } from 'lucide-react'
import AlertKeyLink from './AlertKeyLink'
import SummaryTooltip from './SummaryTooltip'
import type { Alert } from '../types'

type Props = {
  row: Alert
  index: number
  onOpenReport: () => void
}

function safeHref(value: string): string {
  try {
    const url = new URL(value)
    if (!['http:', 'https:'].includes(url.protocol)) return ''
    if (url.username || url.password) return ''
    return url.href
  } catch {
    return ''
  }
}

function AlertCard({ row, index, onOpenReport }: Props) {
  const isAbnormal = row.code === 1
  const isNormal = row.code === 0

  const edge = isAbnormal
    ? 'border-l-abnormal'
    : isNormal
      ? 'border-l-normal'
      : 'border-l-fg-mute'

  const stateText = isAbnormal ? '异常' : isNormal ? '正常' : `未知状态 (${row.code})`

  const statePill = isAbnormal
    ? 'border-abnormal/25 bg-abnormal/10 text-abnormal'
    : isNormal
      ? 'border-normal/25 bg-normal/10 text-normal'
      : 'border-line bg-raise text-fg-mute'

  const href = safeHref(row.href)
  const summary = row.summary || '暂无告警描述'

  // 错峰入场。封顶 12 个 × 24ms：卡片很多时不至于让最后一张等太久。
  const delay = Math.min(index, 12) * 24

  return (
    <article
      style={{ animationDelay: `${delay}ms` }}
      className={[
        'alert-card animate-card-in flex min-w-0 flex-col rounded-xl border border-l-[3px] border-line p-3.5 shadow-card',
        'transition-[transform,box-shadow,border-color] duration-200',
        'hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lift',
        edge,
        isAbnormal ? 'is-abnormal' : '',
      ].join(' ')}
    >
      <div className="flex items-start gap-2">
        <h3 className="min-w-0 text-[15px] font-semibold break-words text-fg">
          {row.systemId || '未标注系统'}
        </h3>
        {row.type ? (
          <span className="max-w-[140px] truncate rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent">
            {row.type}
          </span>
        ) : null}
        <span
          className={[
            'ml-auto shrink-0 rounded-md border px-2 py-1 text-[11px] font-medium',
            statePill,
          ].join(' ')}
        >
          {stateText}
        </span>
      </div>

      <div className="mt-1.5 break-words font-mono text-xs tabular-nums text-fg-soft">
        <AlertKeyLink
          alertKey={row.alertKey}
          eventUrl={row.event_url}
          className="transition-colors duration-200 hover:text-accent hover:underline"
        />
      </div>

      <div className="relative mt-2.5 overflow-hidden rounded-lg bg-raise/70 px-3 py-2 text-[13px] leading-5 text-fg-soft">
        <SummaryTooltip text={summary} className="line-clamp-2 break-words" />
      </div>

      <footer className="mt-3 flex items-center justify-between gap-4 border-t border-line/80 pt-2.5 text-xs">
        {row.msg ? (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-md px-1 py-1 font-medium text-fg-soft transition-colors duration-200 hover:bg-accent/10 hover:text-accent"
            onClick={onOpenReport}
          >
            <FileText size={12} strokeWidth={2} />
            查看报告
          </button>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-fg-mute">
            <FileText size={12} strokeWidth={2} />
            等待报告
          </span>
        )}

        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1 text-fg-soft transition-colors duration-200 hover:text-accent"
          >
            告警详情
            <ExternalLink size={11} strokeWidth={2} />
          </a>
        ) : (
          <span className="shrink-0 text-fg-mute">暂无详情链接</span>
        )}
      </footer>
    </article>
  )
}

export default AlertCard
