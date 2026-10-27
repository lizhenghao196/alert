import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import './pagination.css'

/** 页码项：数字 = 可点页码，`left-more` / `right-more` = 折叠省略号 */
export type PageItem = number | 'left-more' | 'right-more'

/**
 * 页码列表 —— 与 Element UI 的 pager 同一套规则（最多 7 个格子）：
 *   pageCount ≤ 7         → 全部列出
 *   当前页 ≤ 4            → 1 2 3 4 5 … 末页
 *   当前页 ≥ 末页-3        → 首页 … 末页-4 末页-3 末页-2 末页-1 末页
 *   其余                  → 首页 … 当前-1 当前 当前+1 … 末页
 */
export function pageItems(page: number, pageCount: number): PageItem[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1)
  if (page <= 4) return [1, 2, 3, 4, 5, 'right-more', pageCount]
  if (page >= pageCount - 3) {
    return [1, 'left-more', pageCount - 4, pageCount - 3, pageCount - 2, pageCount - 1, pageCount]
  }
  return [1, 'left-more', page - 1, page, page + 1, 'right-more', pageCount]
}

type Props = {
  total: number
  page: number
  pageSize: number
  pageSizeOptions?: number[]
  onChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}

/**
 * 分页条（前端分页，Element UI 的 el-pagination 形态）。
 *
 * 模式二专用：数据一次性取回（300~1000 条量级），这里只负责把当前页切出来。
 * 颜色走 `.aa-scope` 上的 `--aa-*` 变量，与页面其余部分同一套色板。
 */
function Pagination({
  total,
  page,
  pageSize,
  pageSizeOptions = [20, 50, 100],
  onChange,
  onPageSizeChange,
}: Props) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize))

  // 跳页输入框：默认跟随当前页；用户正在输入时不打断（只在 page 变化时同步）
  const [jump, setJump] = useState(String(page))
  useEffect(() => {
    setJump(String(page))
  }, [page])

  const goto = (target: number) => {
    const next = Math.min(Math.max(1, Math.trunc(target) || 1), pageCount)
    if (next !== page) onChange(next)
    else setJump(String(page))
  }

  /** 跳页输入框的提交：空值就还原成当前页，不要跳去第 1 页 */
  const commitJump = () => {
    if (!jump) {
      setJump(String(page))
      return
    }
    goto(Number(jump))
  }

  return (
    <div className="aa-pager">
      <span className="aa-pager__total">
        共 <b>{total}</b> 条
      </span>

      <label className="aa-pager__label">
        每页
        <select
          className="aa-pager__select"
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        条
      </label>

      <div className="aa-pager__pages">
        <button
          type="button"
          className="aa-pager__arrow"
          disabled={page <= 1}
          aria-label="上一页"
          onClick={() => goto(page - 1)}
        >
          <ChevronLeft size={14} strokeWidth={2.2} />
        </button>

        {pageItems(page, pageCount).map((item) =>
          typeof item === 'number' ? (
            <button
              key={item}
              type="button"
              className={item === page ? 'aa-pager__item is-active' : 'aa-pager__item'}
              aria-current={item === page ? 'page' : undefined}
              onClick={() => goto(item)}
            >
              {item}
            </button>
          ) : (
            <span key={item} className="aa-pager__more" aria-hidden>
              ···
            </span>
          ),
        )}

        <button
          type="button"
          className="aa-pager__arrow"
          disabled={page >= pageCount}
          aria-label="下一页"
          onClick={() => goto(page + 1)}
        >
          <ChevronRight size={14} strokeWidth={2.2} />
        </button>
      </div>

      <label className="aa-pager__label">
        前往
        <input
          className="aa-pager__jump"
          type="text"
          inputMode="numeric"
          aria-label="跳转到第几页"
          value={jump}
          onChange={(event) => setJump(event.target.value.replace(/\D/g, '').slice(0, 6))}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return
            event.preventDefault()
            commitJump()
          }}
          onBlur={commitJump}
        />
        页
      </label>
    </div>
  )
}

export default Pagination
