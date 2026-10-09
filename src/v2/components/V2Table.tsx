import AlertKeyLink from '../../components/AlertKeyLink'
import SummaryTooltip from '../../components/SummaryTooltip'
import { safeHref } from '../../url'
import type { Alert } from '../../types'

type Props = {
  rows: Alert[]
  onOpenReport: (row: Alert) => void
}

/**
 * 状态码 → 行内短标签 + 悬浮说明。
 *
 * 标签沿用终端的等宽大写缩写（ABN / OK / UNK），这是模式二的排版语言；
 * 缩写本身不直观，所以每个都带 title：悬浮就能看到「ABN = 异常」这类中文含义。
 */
function statusOf(code: number): { label: string; tone: string; hint: string } {
  if (code === 1) return { label: 'ABN', tone: 'text-term-alert', hint: '异常' }
  if (code === 0) return { label: 'OK', tone: 'text-term-ok', hint: '正常' }
  return { label: 'UNK', tone: 'text-term-fg-mute', hint: '未知状态' }
}

/**
 * 列宽写在 th 上而不是 colgroup：table-layout: fixed 会取首行（th）的宽度，
 * 窄屏时把 th 和对应的 td 一起 display:none，整列才会真正塌掉。
 */
function Head() {
  return (
    <thead>
      <tr>
        <th className="v2-label v2-c-status">状态</th>
        <th className="v2-label v2-c-system">系统</th>
        <th className="v2-label v2-c-type">类型</th>
        <th className="v2-label v2-c-key">告警键</th>
        <th className="v2-label">摘要</th>
        <th className="v2-label v2-c-actions text-right">操作</th>
      </tr>
    </thead>
  )
}

function V2Table({ rows, onOpenReport }: Props) {
  return (
    <table className="v2-table">
      <Head />
      <tbody>
        {rows.map((row, index) => (
          <Row
            key={`${row.alertKey}:${row.systemId}:${index}`}
            row={row}
            onOpenReport={() => onOpenReport(row)}
          />
        ))}
      </tbody>
    </table>
  )
}

function Row({ row, onOpenReport }: { row: Alert; onOpenReport: () => void }) {
  const status = statusOf(row.code)
  const href = safeHref(row.href)
  const summary = row.summary || '暂无告警描述'

  return (
    <tr className="v2-row">
      <td className="v2-c-status">
        <span
          className={`v2-mono text-[11px] font-semibold tracking-[0.1em] ${status.tone}`}
          title={status.hint}
        >
          {status.label}
        </span>
      </td>
      <td className="v2-c-system v2-mono text-[12.5px] text-term-fg">{row.systemId || '--'}</td>
      <td className="v2-c-type v2-mono text-[11px] text-term-fg-mute">{row.type || '--'}</td>
      <td className="v2-c-key v2-mono text-[11.5px] text-term-fg-dim">
        <AlertKeyLink
          alertKey={row.alertKey}
          eventUrl={row.event_url}
          className="transition-colors duration-100 hover:text-term-amber hover:underline"
        />
      </td>
      <td className="text-[12.5px] text-term-fg-dim">
        <SummaryTooltip text={summary} className="line-clamp-1" tone="terminal" />
      </td>
      <td className="v2-c-actions text-right">
        <span className="v2-mono inline-flex items-center gap-4 text-[11px]">
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
      </td>
    </tr>
  )
}

/** 骨架用行而不是卡片：加载中的形状要跟最终布局一致。 */
export function V2TableSkeleton() {
  const cells: Array<[string, string]> = [
    ['v2-c-status', '42px'],
    ['v2-c-system', '84px'],
    ['v2-c-type', '72px'],
    ['v2-c-key', '150px'],
    ['', '100%'],
    ['v2-c-actions', '96px'],
  ]

  return (
    <table className="v2-table">
      <Head />
      <tbody>
        {[0, 1, 2, 3, 4, 5, 6, 7].map((n) => (
          <tr key={n} className="v2-row">
            {cells.map(([cls, width], i) => (
              <td key={i} className={cls}>
                <span className="v2-skel animate-shimmer block" style={{ width }} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default V2Table
