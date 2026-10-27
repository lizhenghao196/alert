import { useMemo } from 'react'
import type { DuplicateGroup } from '../shape'
// 表格样式是共用的（DataTable / AlarmTable 也引这一份），重复性分析表单独写 markup
// 是因为它要按分组纵向合并单元格，DataTable 的通用渲染覆盖不了。
import '../../components/table.css'

type Props = {
  /** [ { data: [ { alertKey, 内容, 原因 } ], 重复性说明 } ] */
  groups: DuplicateGroup[]
}

type FlatRow = {
  key: string
  first: boolean
  size: number
  alertKey: string
  reason: string
  content: string
  explain: string
}

function text(value: unknown): string {
  return value === undefined || value === null ? '' : String(value)
}

/**
 * 重复性分析表。把分组拍平成行，第 4 列（重复性说明）按分组纵向合并单元格
 * —— 与 RuoYi 的 DuplicateTable 一致。
 */
function DuplicateTable({ groups }: Props) {
  const rows = useMemo<FlatRow[]>(() => {
    const list: FlatRow[] = []
    groups.forEach((group, groupIndex) => {
      const data = group && Array.isArray(group.data) ? group.data : []
      data.forEach((row, rowIndex) => {
        list.push({
          key: `${groupIndex}-${rowIndex}-${text(row && row.alertKey)}`,
          first: rowIndex === 0,
          size: data.length,
          alertKey: text(row && row.alertKey),
          reason: text(row && row['原因']),
          content: text(row && row['内容']),
          explain: (group && group['重复性说明']) || '',
        })
      })
    })
    return list
  }, [groups])

  if (rows.length === 0) {
    return (
      <div className="aa-table__empty">
        <span className="aa-table__empty-icon">✓</span>
        <span>该查询条件下暂无重复性分析数据</span>
      </div>
    )
  }

  return (
    <div className="aa-table-wrap is-auto">
      <table className="aa-table aa-dup-table">
        <colgroup>
          <col style={{ width: 170 }} />
          <col style={{ width: 220 }} />
          <col style={{ width: 340 }} />
          <col style={{ width: 340 }} />
        </colgroup>
        <thead>
          <tr>
            <th>alertKey</th>
            <th>原因</th>
            <th>内容</th>
            <th>重复性说明</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <td>{row.alertKey}</td>
              <td>{row.reason}</td>
              <td>{row.content}</td>
              {row.first ? (
                <td className="aa-dup__explain" rowSpan={row.size}>
                  {row.explain}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default DuplicateTable
