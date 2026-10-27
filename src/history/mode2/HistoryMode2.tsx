import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { buildClosedParams } from '../query'
import type { HistoryModeProps, HistoryQuery } from '../query'
import { queryClosedEvents } from './api'
import ClosedTable from './components/ClosedTable'
// 报告弹窗沿用模式一那份（同一个「告警详情」弹窗，按 markdown 渲染 output）：
// 模式二的 Alert 把报告放在 msg 里，传进去时映射成 output 即可。
import FieldDialog from '../mode1/components/FieldDialog'
import Pagination from '../components/Pagination'
import type { Alert } from '../../types'
import './mode2.css'

/** 每页条数候选；默认 20（一屏刚好装得下，翻页时不用再滚表格内部） */
const PAGE_SIZE_OPTIONS = [20, 50, 100]
const DEFAULT_PAGE_SIZE = 20

/**
 * 历史数据 · 模式二 —— 历史关单明细。
 *
 * 查询工具栏在 `history-header` 里，与模式一**共用同一份**（见 AppHistory），
 * 条件也是共用的：模式一里填的是什么，这里就是什么。
 *
 * 接口 `/proxy/event_mgm/event/query/closed`（数据源见 history/config.ts 的 USE_MOCK）。
 * 表格与模式一**同一套样式**（共用的 DataTable / table.css），列里**没有「状态」**：
 * 系统 / 类型 / 告警键 / 摘要 / 操作。
 *
 * **分页是前端的**：接口一次性返回全部命中（300~1000 条量级），这里只把当前页切出来渲染。
 *
 * 查询时机：切到本模式时、以及用户点「查询」或回车时（`[active, queryTick]`）。
 * 切换组别不查。查询出结果后回到第 1 页。
 */
function HistoryMode2({ active, queryTick, teamName, systemId, dateRange }: HistoryModeProps) {
  const [rows, setRows] = useState<Alert[]>([])
  const [queried, setQueried] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [simulated, setSimulated] = useState(false)
  const [report, setReport] = useState<Alert | null>(null)
  /** 表格可用高度（px），由下面的 useLayoutEffect 实测 */
  const [tableMaxHeight, setTableMaxHeight] = useState<number | null>(null)
  /** 前端分页：当前页（1 起）与每页条数 */
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)

  const abortRef = useRef<AbortController | null>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const tableWrapRef = useRef<HTMLDivElement>(null)

  // ── 前端分页：从全量里切出当前页 ──────────────────────────────────
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize))
  // 数据变少（比如新查询命中更少）时当前页可能越界，这里夹一下，
  // 不额外 setState，避免多一次渲染
  const safePage = Math.min(page, pageCount)
  const pageRows = useMemo(
    () => rows.slice((safePage - 1) * pageSize, safePage * pageSize),
    [rows, safePage, pageSize],
  )

  const runQuery = () => {
    const query: HistoryQuery = { teamName, systemId, dateRange }
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    setError('')
    queryClosedEvents(buildClosedParams(query), controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return
        setRows(result.items)
        setSimulated(result.simulated)
        setQueried(true)
        // 新的一批数据 → 回到第 1 页
        setPage(1)
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setError('查询失败，请检查服务连接。')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
  }

  // 切到本模式时、以及用户点查询/回车时各查一次
  useEffect(() => {
    if (active) runQuery()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, queryTick])

  // 卸载时把在途请求收掉
  useEffect(() => () => abortRef.current?.abort(), [])

  // 翻页 / 改每页条数后，把表格内部的滚动条滚回顶部（否则还停在上一条数据的中间）
  useEffect(() => {
    tableWrapRef.current?.scrollTo({ top: 0 })
  }, [safePage, pageSize])

  /**
   * 表格高度 = 「表格区顶部 → 视口底部」之间的可用高度。
   *
   * ⚠️ 为什么不去量 `.hist2-body` 的高度：整条祖先链是
   * `.history-root{min-height:100dvh}` → `main/panel/hist2-root{flex:1}`，
   * 容器高度是 **indefinite**（只有 min-height），`flex:1` 分不到空间，
   * 于是每个盒子都被内容撑开 —— body 的高度就等于表格自己的高度，
   * 量它会变成自我循环（实测会稳定在一个错误值 900）。
   *
   * 所以改成从视口往下算：
   *   可用 = 视口高 - 根节点下内边距 - body 之后的兄弟(分页条 / 底部标签) - body 的 top
   * `body.top` 已经含了 header（含窄屏折行后的真实高度）、根节点上内边距、错误条，
   * 所以这几样都不用手工数。分页条是 body 之后的兄弟，也会被自动扣掉。
   *
   * 依赖里带上 `active`：两个模式常驻挂载、非当前的用 `hidden`（display:none），
   * 隐藏时量不到（top=0），必须等切到本模式后再量一次。
   */
  /**
   * 只有「一页装不下」时才显示分页条 —— 即结果条数 > 每页条数。
   * 默认每页 20，所以「返回 ≤ 20 条」时不显示分页。
   * （写成 `> pageSize` 而不是写死 20：用户把每页改成 100 时，一页能装下也不该显示分页。）
   */
  const showPager = rows.length > pageSize

  useLayoutEffect(() => {
    const measure = () => {
      const body = bodyRef.current
      // offsetParent 为 null 说明面板还是 hidden，量了也是错的
      if (!body || body.offsetParent === null) return
      const root = body.parentElement
      if (!root) return

      const padBottom = parseFloat(getComputedStyle(root).paddingBottom) || 0

      // body 之后仍在文档流里的兄弟（分页条、底部「模拟数据」标签；弹窗是 fixed，不算）
      let below = 0
      for (let node = body.nextElementSibling; node; node = node.nextElementSibling) {
        const style = getComputedStyle(node)
        if (style.display === 'none' || style.position === 'absolute' || style.position === 'fixed') continue
        below += node.getBoundingClientRect().height
        below += (parseFloat(style.marginTop) || 0) + (parseFloat(style.marginBottom) || 0)
      }

      const avail = window.innerHeight - padBottom - below - body.getBoundingClientRect().top
      // 兜底 240：首帧或极端窄屏下别把表格压成一条；-1 留一点余量避免溢出出滚动条
      setTableMaxHeight(Math.max(240, Math.floor(avail) - 1))
    }

    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [active, error, simulated, showPager])

  return (
    <div className="hist2-root">
      {error ? (
        <div className="hist2-error" role="alert">
          <span>{error}</span>
          <button type="button" className="aa-btn" onClick={runQuery}>
            重试
          </button>
        </div>
      ) : null}

      {/* hist2-body：撑满 header 以下的剩余空间，同时作为「表格可用高度」的
          测量对象（见上面的 useLayoutEffect 与 mode2.css 里表格高度那段）。 */}
      <div className="aa-body hist2-body" ref={bodyRef}>
        {loading ? (
          <div className="aa-loading" role="status">
            <span className="aa-loading__spinner" />
            正在查询...
          </div>
        ) : null}

        {!queried ? (
          <section className="aa-state">
            <div className="aa-empty">
              <div className="aa-empty__image">🔎</div>
              <div className="aa-empty__desc">请输入查询条件后点击「查询」</div>
              <p className="aa-state__hint">支持组别、系统英文缩写（选填）与告警时间范围组合查询</p>
            </div>
          </section>
        ) : rows.length === 0 ? (
          <section className="aa-state">
            <div className="aa-empty">
              <div className="aa-empty__image">📭</div>
              <div className="aa-empty__desc">当前查询条件下暂无历史关单记录</div>
            </div>
          </section>
        ) : (
          <ClosedTable
            rows={pageRows}
            onOpenReport={setReport}
            maxHeight={tableMaxHeight}
            wrapRef={tableWrapRef}
          />
        )}
      </div>

      {/* 分页条：放在 .hist2-body **之后**（成为它的兄弟），
          这样上面那段实测逻辑的 `below` 会自动把它的高度扣掉，表格高度不用再手改。 */}
      {showPager ? (
        <Pagination
          total={rows.length}
          page={safePage}
          pageSize={pageSize}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          onChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size)
            setPage(1)
          }}
        />
      ) : null}

      {simulated ? <span className="hist2-simulated">模拟数据 / 非真实关单记录</span> : null}

      <FieldDialog
        visible={Boolean(report)}
        type="report"
        item={report ? { ...report, output: report.msg } : {}}
        onClose={() => setReport(null)}
      />
    </div>
  )
}

export default HistoryMode2
