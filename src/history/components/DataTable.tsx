import type { ReactNode, Ref } from 'react'
import './table.css'

export type DataTableColumn<T> = {
  key: string
  title: string
  /** 固定列宽（px）；不传则该列吃掉剩余宽度 */
  width?: number
  align?: 'left' | 'center'
  /** 自定义单元格渲染；不传则直接取 row[key] */
  render?: (row: T, index: number) => ReactNode
}

type Props<T> = {
  columns: Array<DataTableColumn<T>>
  rows: T[]
  rowKey?: (row: T, index: number) => string
  emptyText?: string
  /**
   * 表格区最大高度（px）；**不传 / 传 null = 不给行内样式**，吃 `table.css` 里的默认值
   * （`.aa-table-wrap` 的 `max-height: 420px`，行少时按内容收缩）。
   *
   * 模式二会从视口实测一个可用高度后传进来（见 `HistoryMode2`）。
   */
  maxHeight?: number | null
  /** 追加到滚动容器（`.aa-table-wrap`）上的类名 —— 用来切换高度变体，
   *  见 table.css 的 `is-auto`（不限高）/ `is-fixed`（固定高度）。 */
  wrapClassName?: string
  /** 表格最小宽度（px），窄屏时横向滚动 */
  minWidth?: number
  /** 滚动容器的 ref（`.aa-table-wrap`）—— 翻页后要把它滚回顶部时用 */
  wrapRef?: Ref<HTMLDivElement>
}

function cellText(value: unknown): string {
  return value === undefined || value === null ? '' : String(value)
}

/**
 * 历史数据页的数据表格 —— **模式一 / 模式二共用同一份**（需求：模式二的表格风格
 * 要和模式一一致），样式在 `table.css`（Element 风格：浅灰表头、1px 网格线、
 * 表头在表格自己的滚动容器里吸顶、超长单行省略 + 原生 title 提示）。
 *
 * 列宽写在 `<colgroup>` 上而不是 th：`table-layout: fixed` 会以首行（th）的宽度
 * 为准，colgroup 更直观，也不必给每个 th 挂 style。
 *
 * 高度：默认不给行内样式，吃 `table.css` 里 `.aa-table-wrap` 的 `max-height: 420px`
 * （行少时收缩）；传 `maxHeight` 覆盖（模式二传视口实测值）；传 `wrapClassName`
 * 可换变体类（`is-auto` 不限高 / `is-fixed` 固定 420，见 NestedGroups 的 AI处置 表）。
 */
function DataTable<T extends Record<string, unknown>>({
  columns,
  rows,
  rowKey,
  emptyText = '暂无数据',
  maxHeight,
  wrapClassName,
  minWidth = 1080,
  wrapRef,
}: Props<T>) {
  if (rows.length === 0) {
    return (
      <div className="aa-table__empty">
        <span className="aa-table__empty-icon">✓</span>
        <span>{emptyText}</span>
      </div>
    )
  }

  return (
    <div
      className={wrapClassName ? `aa-table-wrap ${wrapClassName}` : 'aa-table-wrap'}
      ref={wrapRef}
      style={maxHeight == null ? undefined : { maxHeight }}
    >
      <table className="aa-table" style={{ minWidth }}>
        <colgroup>
          {columns.map((column) => (
            <col key={column.key} style={column.width ? { width: column.width } : undefined} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} className={column.align === 'center' ? 'is-center' : undefined}>
                {column.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={rowKey ? rowKey(row, index) : index}>
              {columns.map((column) => {
                const content = column.render
                  ? column.render(row, index)
                  : cellText(row[column.key])
                return (
                  <td
                    key={column.key}
                    className={column.align === 'center' ? 'is-center' : undefined}
                    // 纯文本单元格挂原生 title，超长被省略时还能悬浮看全
                    title={column.render ? undefined : cellText(row[column.key]) || undefined}
                  >
                    {content}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default DataTable
