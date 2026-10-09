import { useMemo, useState, type CSSProperties } from 'react'
import { TriangleAlert } from 'lucide-react'
import AppHeader from '../components/AppHeader'
import { useAlertPolling } from '../hooks/useAlertPolling'
import { useAlertSound } from '../hooks/useAlertSound'
import { useTheme } from '../theme'
import type { Alert, FilterStatus } from '../types'
import V2ConditionPopover from './components/V2ConditionPopover'
import V2Launch from './components/V2Launch'
import V2ReportDialog from './components/V2ReportDialog'
import V2Table, { V2TableSkeleton } from './components/V2Table'
import './v2.css'

const DEFAULT_FREQUENCY = 30

function AppV2() {
  const [theme, toggleTheme] = useTheme()
  const poll = useAlertPolling()
  const sound = useAlertSound(poll.rows, poll.queried)

  const [teamName, setTeamName] = useState(poll.applied?.teamName ?? '')
  const [systemId, setSystemId] = useState(poll.applied?.systemId ?? '')
  const [frequency, setFrequency] = useState(poll.applied?.frequency ?? DEFAULT_FREQUENCY)

  const [filter, setFilter] = useState<FilterStatus>('all')
  const [report, setReport] = useState<Alert | null>(null)

  const counts = useMemo(() => {
    let abnormal = 0
    for (const row of poll.rows) {
      if (row.code === 1) abnormal += 1
    }
    // 「正常」按「不是异常」计，而不是 code === 0。接口若返回未知状态码，
    // 这样总数才恒等于异常 + 正常，筛选结果和计数也不会互相矛盾；
    // 行内的状态码仍如实显示（未知的会显示成 ABN / OK / UNK）。
    return { total: poll.rows.length, abnormal, normal: poll.rows.length - abnormal }
  }, [poll.rows])

  const visibleRows = useMemo(() => {
    return poll.rows
      .filter((row) => {
        if (filter === 'all') return true
        if (filter === 'normal') return row.code !== 1
        return row.code === 1
      })
      .slice()
      .sort((a, b) => Number(b.code === 1) - Number(a.code === 1))
  }, [poll.rows, filter])

  /*
    注意这里与 v1 的差别，v1 是 showGrid = !loading && queried && ...，v2 去掉了 !loading。
    v1 那份在每次后台轮询期间（loading 变 true）三个条件同时为假，整张表会消失一下，
    每 30 秒闪一次空白。已有数据时应该继续显示旧数据，只有首次加载才出骨架。
  */
  const showSkeleton = poll.loading && !poll.queried
  const showRows = poll.queried && visibleRows.length > 0
  const showEmpty = poll.queried && visibleRows.length === 0

  return (
    // --t-masthead-h 覆写成模式一 header 的高度（4rem / 64px）：贴顶表头
    // （.v2-table th 的 top）用的就是这个变量，否则会钻到 header 底下 8px。
    // 只在本页覆写，v3 复用 v2.css 时不受影响。
    <div className="v2-root" style={{ '--t-masthead-h': '4rem' } as CSSProperties}>
      {/* 顶部栏直接复用模式一那份（AppHeader）——领导要求两版顶部保持一致。
          模式二自己的条件编辑器（浮层）锚在「修改条件」按钮下方。 */}
      <AppHeader
        theme={theme}
        onToggleTheme={toggleTheme}
        sound={sound}
        counts={counts}
        filter={filter}
        onFilter={setFilter}
        applied={poll.applied}
        running={poll.running}
        loading={poll.loading}
        lastUpdated={poll.lastUpdated}
        onEdit={poll.editing ? poll.closeEditor : poll.openEditor}
        showCommandBar={!poll.showForm}
        editor={
          poll.editing && poll.applied ? (
            <V2ConditionPopover
              applied={poll.applied}
              onApply={poll.confirm}
              onCancel={poll.closeEditor}
            />
          ) : null
        }
      />

      {poll.showForm ? (
        <V2Launch
          teamName={teamName}
          systemId={systemId}
          frequency={frequency}
          hasApplied={Boolean(poll.applied)}
          onChangeTeamName={setTeamName}
          onChangeSystemId={setSystemId}
          onChangeFrequency={setFrequency}
          onConfirm={poll.confirm}
          onReset={() => {
            setTeamName('')
            setSystemId('')
            setFrequency(DEFAULT_FREQUENCY)
          }}
        />
      ) : (
        <>
          {poll.error ? (
            <div className="flex items-center justify-between gap-4 border-b border-term-rule px-5 py-2.5 xl:px-7">
              <span className="v2-mono flex items-center gap-2 text-[11.5px] text-term-alert">
                <TriangleAlert size={13} strokeWidth={2} />
                {poll.error}
              </span>
              <button
                type="button"
                onClick={poll.retry}
                className="v2-mono shrink-0 border border-term-alert px-2.5 py-1 text-[11px] text-term-alert transition-colors duration-100 hover:bg-term-alert hover:text-term-bg"
              >
                重试
              </button>
            </div>
          ) : null}

          {showSkeleton ? <V2TableSkeleton /> : null}
          {showRows ? <V2Table rows={visibleRows} onOpenReport={setReport} /> : null}
          {showEmpty ? <EmptyState filtered={poll.rows.length > 0} /> : null}

          {poll.simulated ? (
            <div className="px-5 py-4 xl:px-7">
              <span className="v2-label">模拟数据 / 非真实告警</span>
            </div>
          ) : null}
        </>
      )}

      <V2ReportDialog row={report} onClose={() => setReport(null)} />
    </div>
  )
}

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="px-5 py-16 xl:px-7">
      <span className="v2-mono text-[11px] font-semibold tracking-[0.1em] text-term-ok">
        OK
      </span>
      <p className="v2-mono mt-3 text-[13px] text-term-fg-dim">
        {filtered ? '当前状态下暂无告警' : '当前观测范围暂无告警'}
      </p>
      <p className="v2-mono mt-1.5 text-[11px] text-term-fg-mute">
        后续巡检结果会自动更新在这里
      </p>
    </div>
  )
}

export default AppV2
