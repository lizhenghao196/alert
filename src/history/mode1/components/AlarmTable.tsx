import DataTable, { type DataTableColumn } from '../../components/DataTable'
import type { Row } from '../shape'

// 外部系统地址：前缀固定，后面直接拼字段值
//   alertKey 列 / 值可点：     http://alt.eprod-kzx1.cncb/#/jiraAlertInfo?alertKey=<alertKey>
//   more 列「告警详情」按钮：  http://10.2.64.23/gdb_screen/#/agentInfo?activeRunId=<runId>
//   output 列「查看简报」按钮：不跳外链，打开本地报告弹窗（markdown 渲染行里的 output）
const ALERT_DETAIL_URL = 'http://alt.eprod-kzx1.cncb/#/jiraAlertInfo?alertKey='
const BRIEF_URL = 'http://10.2.64.23/gdb_screen/#/agentInfo?activeRunId='

export type ViewFieldType = 'trace' | 'report' | 'more'

type Props = {
  rows: Row[]
  onViewField: (type: ViewFieldType, row: Row) => void
  /** 追加到 `.aa-table-wrap` 上的高度变体类名（如 `is-fixed`，只有 AI处置 那张表用） */
  wrapClassName?: string
}

function text(value: unknown): string {
  return value === undefined || value === null ? '' : String(value)
}

/** alertKey -> 告警详情链接；没有 alertKey 时返回空串，退化成纯文本（不出现死链） */
function alertUrl(row: Row): string {
  const value = row.alertKey
  if (value === undefined || value === null || value === '') return ''
  return ALERT_DETAIL_URL + encodeURIComponent(String(value))
}

/** runId -> 外链（more 列「告警详情」按钮用）；没有 runId 时返回空串，按钮置灰 */
function briefUrl(row: Row): string {
  const value = row.runId
  if (value === undefined || value === null || value === '') return ''
  return BRIEF_URL + encodeURIComponent(String(value))
}

/**
 * 告警明细表。列与 RuoYi 的 AlarmTable 一一对应：
 * alertKey / summary / misinfoReason / alertReasonDesc / AgentTrace / output / more。
 *
 * 表格样式走共用的 DataTable（与模式二同一份），高度默认是 `max-height: 420px`
 * （行少时收缩）；传 `wrapClassName="is-fixed"` 可换成固定 420（AI处置 那张表要的）。
 * 超出都在容器内滚动、表头吸顶。
 */
function AlarmTable({ rows, onViewField, wrapClassName }: Props) {
  const columns: Array<DataTableColumn<Row>> = [
    {
      key: 'alertKey',
      title: 'alertKey',
      width: 170,
      render: (row) => {
        const href = alertUrl(row)
        if (!href) return text(row.alertKey)
        return (
          <a className="aa-table__link" href={href} target="_blank" rel="noopener noreferrer">
            {text(row.alertKey)}
          </a>
        )
      },
    },
    { key: 'summary', title: 'summary' },
    // ⚠️ 字段名是小写 i（misinfoReason），别写成 misInfoReason
    { key: 'misinfoReason', title: 'misinfoReason', width: 130 },
    { key: 'alertReasonDesc', title: 'alertReasonDesc', width: 140 },
    {
      key: 'AgentTrace',
      title: 'AgentTrace',
      width: 140,
      align: 'center',
      render: (row) => (
        <button type="button" className="aa-text-btn" onClick={() => onViewField('trace', row)}>
          使用到的智能体
        </button>
      ),
    },
    {
      key: 'output',
      title: 'output',
      width: 110,
      align: 'center',
      render: (row) => (
        <button type="button" className="aa-text-btn" onClick={() => onViewField('report', row)}>
          查看简报
        </button>
      ),
    },
    {
      key: 'more',
      title: 'more',
      width: 110,
      align: 'center',
      render: (row) => {
        const href = briefUrl(row)
        return (
          <button
            type="button"
            className="aa-text-btn"
            disabled={!href}
            title={href ? '在新标签页打开告警详情' : '该告警没有 runId，暂无告警详情'}
            onClick={() => {
              if (href) window.open(href, '_blank', 'noopener,noreferrer')
            }}
          >
            告警详情
          </button>
        )
      },
    },
  ]

  return (
    <DataTable
      columns={columns}
      rows={rows}
      emptyText="该分类下暂无告警数据"
      rowKey={(row, index) => `${text(row.alertKey)}:${index}`}
      wrapClassName={wrapClassName}
    />
  )
}

export { alertUrl, briefUrl }
export default AlarmTable
