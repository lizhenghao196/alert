import { useCallback, useEffect, useState } from 'react'
import { ArrowDownUp, ArrowLeft, History, Radar } from 'lucide-react'
import ThemeToggle from '../components/ThemeToggle'
import { useTheme } from '../theme'
import { HOME_HREF } from '../version'
import HistoryMode1 from './mode1/HistoryMode1'
import HistoryMode2 from './mode2/HistoryMode2'
import HistorySearchBar from './components/HistorySearchBar'
import { DEFAULT_GROUP, defaultRange, normalizeSystemId, type Mode1HeaderState } from './query'
import './history.css'

type Mode = 'mode1' | 'mode2'

const MODE_TABS: Array<{ id: Mode; label: string }> = [
  { id: 'mode1', label: '模式一' },
  { id: 'mode2', label: '模式二' },
]

/**
 * 「历史数据」页（/history/）。
 *
 * 从顶部「修改条件」旁边的入口新标签页打开，页内再分两个模式：
 *
 *   模式一 —— 复刻 RuoYi 的告警分析页（alarmAnalysis）
 *   模式二 —— 历史关单明细（/proxy/event_mgm/event/query/closed）
 *
 * 查询条件与**查询工具栏**都由这里持有：工具栏跟模式切换同排放在 header 里，
 * 两个模式共用同一份（需求），所以只需渲染一次。
 *
 * 「查询」右侧依次是「返回」（关掉本标签页回到告警实时观测，两个模式都有，
 * 见 handleBack）与模式一专属的「一键收起 / 一键展开」。
 *
 * 查询派发方式：点「查询」/ 回车 → `queryTick` 自增；两个模式各自
 * `useEffect(..., [active, queryTick])`，只有当前可见的那个会真正发请求。
 * 打开页面默认进模式一，模式一挂载即查一次；每次切换模式，新进入的模式也查一次。
 *
 * header 右侧（主题按钮左边）还有两处模式一专属的信息，同样由模式一上报
 * （`onHeaderState`），且**只在模式一可见时才渲染**，切到模式二立刻消失
 * （而不是留在 header 上点不动）：
 *   - 「一键收起 / 一键展开」按钮；
 *   - 「重复性分析 N 组」统计（原来在模式一正文顶部的概览条里）。
 */
function AppHistory() {
  const [theme, toggleTheme] = useTheme()
  const [mode, setMode] = useState<Mode>('mode1')

  // ── 两个模式共用的查询条件 ────────────────────────────────────────
  const [teamName, setTeamName] = useState<string>(DEFAULT_GROUP)
  const [systemId, setSystemId] = useState('')
  const [dateRange, setDateRange] = useState<string[]>(defaultRange)
  /** 递增的查询信号，见上面的说明 */
  const [queryTick, setQueryTick] = useState(0)

  // ── 模式一专属：header 上的一键收起按钮 + 重复性分析组数 ────────────
  const [headerState, setHeaderState] = useState<Mode1HeaderState>({
    collapseVisible: false,
    allCollapsed: false,
    duplicateGroups: 0,
  })
  const [collapseTick, setCollapseTick] = useState(0)
  // 稳定引用：模式一在 effect 里上报状态，回调不能每次渲染都换，否则 effect 会反复跑
  const handleHeaderState = useCallback((state: Mode1HeaderState) => setHeaderState(state), [])

  // 新标签页的标题就是「历史数据」（index.html 里默认写的是「告警实时观测」）
  useEffect(() => {
    document.title = '历史数据'
  }, [])

  /**
   * 「返回」——关掉本标签页，落回来源页「告警实时观测」。
   *
   * 历史数据页是从顶部「历史数据」入口用 `target="_blank"` 新标签页打开的
   * （见 AppHeader），所以关掉这个 tab 焦点就回到原来那个告警页，无需再跳转。
   *
   * ⚠️ 浏览器只在「本页由脚本打开」或「本页没有历史记录（history.length === 1）」
   * 时才允许脚本关窗口。正常从入口点进来两种情况都满足，`window.close()` 直接生效；
   * 但若是手动输入地址进来的老标签页、或页内跳转过，close() 会被静默忽略 ——
   * 这时兜底把本标签页导航回站点根（默认落地模式一 = 告警实时观测页）。
   */
  const handleBack = () => {
    window.close()
    // close() 被忽略时脚本还活着，短延时兜底（真关掉了这里根本不会执行到）
    window.setTimeout(() => window.location.assign(HOME_HREF), 200)
  }

  const modeProps = { teamName, systemId, dateRange, queryTick }
  const showCollapseBar = mode === 'mode1' && headerState.collapseVisible
  const showDuplicate = mode === 'mode1' && headerState.duplicateGroups > 0

  return (
    // aa-scope：查询工具栏住在 header 里，而它用到的 --aa-* 颜色变量定义在
    // `.aa-scope` 上，所以必须挂到最外层（header 与正文都要能读到）。
    <div className="aa-scope history-root">
      <header className="history-header">
        <div className="history-brand">
          <span className="history-brand-mark">
            <Radar size={16} strokeWidth={2} />
          </span>
          <strong>历史数据</strong>
          <span className="history-brand-tag">
            <History size={12} strokeWidth={2} />
            告警观测
          </span>
        </div>

        <nav className="history-modes" aria-label="历史数据模式">
          {MODE_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={mode === tab.id ? 'history-mode-tab is-active' : 'history-mode-tab'}
              aria-pressed={mode === tab.id}
              onClick={() => setMode(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* 查询工具栏：紧挨模式切换右侧，两个模式共用同一份，只渲染一次。
            「返回」与模式一专属的「一键收起 / 一键展开」都作为 trailing 塞进工具栏
            内部（而不是当兄弟节点），这样窄屏折行时它们跟着工具栏一起走。 */}
        <div className="history-header__search">
          <HistorySearchBar
            teamName={teamName}
            systemId={systemId}
            dateRange={dateRange}
            onChangeTeamName={setTeamName}
            // 系统名统一转大写（两个模式共用，所以在这里收口一次）
            onChangeSystemId={(value) => setSystemId(normalizeSystemId(value))}
            onChangeDateRange={setDateRange}
            onQuery={() => setQueryTick((tick) => tick + 1)}
            trailing={
              <>
                {/* 返回：紧挨「查询」右侧。关掉本标签页就回到来源页「告警实时观测」
                    （本页就是从那里新标签页打开的）。两个模式都有。 */}
                <button
                  type="button"
                  className="aa-btn"
                  onClick={handleBack}
                  title="关闭本标签页，返回告警实时观测"
                >
                  <ArrowLeft size={14} strokeWidth={2} />
                  返回
                </button>

                {/* 切到模式二就整颗消失（不渲染，而不是禁用） */}
                {showCollapseBar ? (
                  <button
                    type="button"
                    className="aa-btn aa-btn--plain"
                    onClick={() => setCollapseTick((tick) => tick + 1)}
                  >
                    <ArrowDownUp size={14} strokeWidth={2} />
                    {headerState.allCollapsed ? '一键展开' : '一键收起'}
                  </button>
                ) : null}
              </>
            }
          />
        </div>

        <div className="history-actions">
          {/* 重复性分析组数：紧挨主题切换按钮左侧（模式一专属，切到模式二消失） */}
          {showDuplicate ? (
            <span className="history-dup" title="本次结果中的重复性分析组数">
              重复性分析 <b>{headerState.duplicateGroups}</b> 组
            </span>
          ) : null}
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      </header>

      <main className="history-main">
        <div className="history-panel" hidden={mode !== 'mode1'}>
          <HistoryMode1
            active={mode === 'mode1'}
            collapseTick={collapseTick}
            onHeaderState={handleHeaderState}
            {...modeProps}
          />
        </div>
        <div className="history-panel" hidden={mode !== 'mode2'}>
          <HistoryMode2 active={mode === 'mode2'} {...modeProps} />
        </div>
      </main>
    </div>
  )
}

export default AppHistory
