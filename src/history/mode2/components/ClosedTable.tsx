import type { Ref } from 'react'
import DataTable, { type DataTableColumn } from '../../components/DataTable'
import { safeHref } from '../../../url'
import type { Alert } from '../../../types'

type Props = {
  rows: Alert[]
  onOpenReport: (row: Alert) => void
  /** 表格可用高度（px）；由 HistoryMode2 实测后传入，null = 用共用表格的默认值 */
  maxHeight?: number | null
  /** 滚动容器 ref：翻页后 HistoryMode2 会用它把表格滚回顶部 */
  wrapRef?: Ref<HTMLDivElement>
}

/**
 * 历史关单明细表。
 *
 * 需求：表格风格与模式一一致 —— 所以直接用共用的 DataTable（同一份 table.css）。
 * 列：系统 / 类型 / 告警键 / 摘要 / 操作（**没有「状态」列**）。
 *
 * `rows` 传进来的是**当前页**的数据（前端分页在 HistoryMode2 里做）。
 */
function ClosedTable({ rows, onOpenReport, maxHeight, wrapRef }: Props) {
  const columns: Array<DataTableColumn<Alert>> = [
    { key: 'systemId', title: '系统', width: 130 },
    { key: 'type', title: '类型', width: 150 },
    {
      key: 'alertKey',
      title: '告警键',
      width: 210,
      render: (row) => {
        const href = safeHref(row.event_url ?? '')
        if (!href) return row.alertKey
        return (
          <a className="aa-table__link" href={href} target="_blank" rel="noopener noreferrer">
            {row.alertKey}
          </a>
        )
      },
    },
    { key: 'summary', title: '摘要' },
    {
      key: 'actions',
      title: '操作',
      width: 150,
      align: 'center',
      render: (row) => {
        const href = safeHref(row.href)
        return (
          <span className="hist2-actions">
            {row.msg ? (
              <button type="button" className="aa-text-btn" onClick={() => onOpenReport(row)}>
                报告
              </button>
            ) : (
              <span className="hist2-actions__none">--</span>
            )}
            {href ? (
              <a className="aa-text-btn" href={href} target="_blank" rel="noopener noreferrer">
                详情
              </a>
            ) : (
              <span className="hist2-actions__none">--</span>
            )}
          </span>
        )
      },
    },
  ]

  return (
    <DataTable
      columns={columns}
      rows={rows}
      emptyText="当前查询条件下暂无历史关单记录"
      rowKey={(row, index) => `${row.alertKey}:${row.systemId}:${index}`}
      minWidth={900}
      // 高度跟着页面可用空间走（HistoryMode2 实测后传入），比共用默认的 420 高不少
      maxHeight={maxHeight}
      wrapRef={wrapRef}
    />
  )
}

export default ClosedTable
