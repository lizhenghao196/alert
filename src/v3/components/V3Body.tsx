import AlertKeyLink from '../../components/AlertKeyLink'
import SummaryTooltip from '../../components/SummaryTooltip'
import { safeHref } from '../../url'
import type { Alert, FilterStatus } from '../../types'

type Props = {
  rows: Alert[]
  filter: FilterStatus
  onOpenReport: (row: Alert) => void
}

function statusOf(code: number): { label: string; tone: string } {
  if (code === 1) return { label: 'ABN', tone: 'text-term-alert' }
  if (code === 0) return { label: 'OK', tone: 'text-term-ok' }
  return { label: 'UNK', tone: 'text-term-fg-mute' }
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/**
 * v3 主体：按严重度分区。
 *
 * 异常走瓦片，摘要能读；正常走紧凑单行，保持密度。两侧不再是同一种呈现，
 * 因为异常需要空间、正常需要密度，这两件事本来就冲突。
 *
 * 分区内部的尺寸是固定的，只有条数会变：异常从 3 条变 4 条时，是新增一格，
 * 不是把已有的三格挤小。
 */
function V3Body({ rows, filter, onOpenReport }: Props) {
  const abnormal = rows.filter((row) => row.code === 1)
  // 「正常」区 = 不是异常，与 KPI 的计数口径、以及「正常」筛选保持一致。
  // 未知状态码的行也落在这里，但行内会如实显示 UNK，不会冒充正常。
  const rest = rows.filter((row) => row.code !== 1)

  const showAbnormal = filter !== 'normal'
  const showRest = filter !== 'abnormal'

  return (
    <>
      {showAbnormal ? (
        <section>
          <SectionBar label="异常" count={abnormal.length} tone="alert" />
          {abnormal.length > 0 ? (
            <div className="v3-board">
              {abnormal.map((row, index) => (
                <Cell
                  key={`${row.alertKey}:${row.systemId}:${index}`}
                  row={row}
                  onOpenReport={() => onOpenReport(row)}
                />
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {showRest ? (
        <section>
          <SectionBar label="正常" count={rest.length} tone="ok" />
          {rest.length > 0 ? (
            <ul className="v3-rows">
              {rest.map((row, index) => (
                <CompactRow
                  key={`${row.alertKey}:${row.systemId}:${index}`}
                  row={row}
                  onOpenReport={() => onOpenReport(row)}
                />
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}
    </>
  )
}

function SectionBar({
  label,
  count,
  tone,
}: {
  label: string
  count: number
  tone: 'alert' | 'ok'
}) {
  const hot = tone === 'alert' && count > 0

  return (
    <div className={`v3-bar${hot ? ' v3-bar-alert' : ''}`}>
      <span
        className={`v2-label ${tone === 'alert' ? 'text-term-alert' : 'text-term-ok'}`}
      >
        {label}
      </span>
      <span className="v2-mono ml-auto text-[11px] tabular-nums text-term-fg-dim">
        {pad(count)}
      </span>
    </div>
  )
}

function Cell({ row, onOpenReport }: { row: Alert; onOpenReport: () => void }) {
  const status = statusOf(row.code)
  const summary = row.summary || '暂无告警描述'

  return (
    <article className="v3-cell">
      <div className="flex items-baseline gap-2.5">
        <span
          className={`v2-mono text-[11px] font-semibold tracking-[0.1em] ${status.tone}`}
        >
          {status.label}
        </span>
        <span className="v2-mono truncate text-[13px] text-term-fg">
          {row.systemId || '--'}
        </span>
        {row.type ? (
          <span className="v2-mono ml-auto shrink-0 text-[10.5px] text-term-fg-mute">
            {row.type}
          </span>
        ) : null}
      </div>

      <div className="v3-cell-summary mt-3">
        <SummaryTooltip text={summary} className="line-clamp-3" tone="terminal" />
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-term-rule pt-2.5">
        <span className="v2-mono truncate text-[10.5px] text-term-fg-mute">
          <AlertKeyLink
            alertKey={row.alertKey}
            eventUrl={row.event_url}
            className="transition-colors duration-100 hover:text-term-amber hover:underline"
          />
        </span>
        <Actions row={row} onOpenReport={onOpenReport} />
      </div>
    </article>
  )
}

function CompactRow({ row, onOpenReport }: { row: Alert; onOpenReport: () => void }) {
  const status = statusOf(row.code)
  const summary = row.summary || '暂无告警描述'

  return (
    <li className="v3-row">
      <span className={`v2-mono text-[11px] font-semibold tracking-[0.1em] ${status.tone}`}>
        {status.label}
      </span>
      <span className="v2-mono truncate text-[12.5px] text-term-fg">
        {row.systemId || '--'}
      </span>
      <span className="v2-mono truncate text-[11.5px] text-term-fg-dim">
        <AlertKeyLink
          alertKey={row.alertKey}
          eventUrl={row.event_url}
          className="transition-colors duration-100 hover:text-term-amber hover:underline"
        />
      </span>
      <span className="text-[12.5px] text-term-fg-dim">
        <SummaryTooltip text={summary} className="line-clamp-1" tone="terminal" />
      </span>
      <span className="flex justify-end">
        <Actions row={row} onOpenReport={onOpenReport} />
      </span>
    </li>
  )
}

function Actions({ row, onOpenReport }: { row: Alert; onOpenReport: () => void }) {
  const href = safeHref(row.href)

  return (
    <span className="v2-mono inline-flex shrink-0 items-center gap-4 text-[11px]">
      {row.msg ? (
        <button
          type="button"
          onClick={onOpenReport}
          className="text-term-fg-dim transition-colors duration-100 hover:text-term-amber"
        >
          报告
        </button>
      ) : (
        <span className="text-term-fg-mute">--</span>
      )}
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-term-fg-dim transition-colors duration-100 hover:text-term-amber"
        >
          详情
        </a>
      ) : (
        <span className="text-term-fg-mute">--</span>
      )}
    </span>
  )
}

/** 骨架要跟最终形状一致：上面几格瓦片，下面几行紧凑行。 */
export function V3BodySkeleton() {
  return (
    <>
      <div className="v3-bar">
        <span className="v2-skel animate-shimmer block h-[9px] w-[68px]" />
      </div>
      <div className="v3-board">
        {[0, 1, 2, 3].map((n) => (
          <div key={n} className="v3-cell">
            <span className="v2-skel animate-shimmer block h-[11px] w-[120px]" />
            <div className="v3-cell-summary mt-3 flex flex-col gap-2">
              <span className="v2-skel animate-shimmer block h-[9px] w-full" />
              <span className="v2-skel animate-shimmer block h-[9px] w-[88%]" />
              <span className="v2-skel animate-shimmer block h-[9px] w-[62%]" />
            </div>
            <div className="mt-auto flex pt-2.5">
              <span className="v2-skel animate-shimmer block h-[9px] w-[150px]" />
            </div>
          </div>
        ))}
      </div>
      <div className="v3-bar">
        <span className="v2-skel animate-shimmer block h-[9px] w-[68px]" />
      </div>
      <ul className="v3-rows">
        {[0, 1, 2, 3, 4, 5].map((n) => (
          <li key={n} className="v3-row">
            {['42px', '80px', '140px', '100%', '76px'].map((w, i) => (
              <span key={i} className="v2-skel animate-shimmer block" style={{ width: w }} />
            ))}
          </li>
        ))}
      </ul>
    </>
  )
}

export default V3Body
