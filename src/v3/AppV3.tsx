import { useMemo, useState } from 'react'
import { TriangleAlert } from 'lucide-react'
import { useAlertPolling } from '../hooks/useAlertPolling'
import { useAlertSound } from '../hooks/useAlertSound'
import { useTheme } from '../theme'
import type { Alert, FilterStatus } from '../types'
import V2ConditionPopover from '../v2/components/V2ConditionPopover'
import V2KpiStrip from '../v2/components/V2KpiStrip'
import V2Launch from '../v2/components/V2Launch'
import V2Masthead from '../v2/components/V2Masthead'
import V2ReportDialog from '../v2/components/V2ReportDialog'
import V3Body, { V3BodySkeleton } from './components/V3Body'
// v3 直接复用 v2 的外壳组件，所以 v2 的令牌与类也必须在。版本定下来后
// 这两份样式会合并到一处。
import '../v2/v2.css'
import './v3.css'

const DEFAULT_FREQUENCY = 30

/**
 * v3 = v2 的外壳（masthead / KPI 条 / 启动表单 / 条件浮层 / 报告弹窗，全部
 * 直接 import 复用）+ 按严重度分区的主体。
 *
 * 这里与 AppV2 有一份重复的派生逻辑（counts / visibleRows / 显示分支）。
 * 这是刻意的：v2 和 v3 是同一个岗位的两个候选，最终只会留一个，届时重复
 * 自然消失。为了消除它去改 v2，反而会让对照实验失去意义。
 */
function AppV3() {
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
    // 行内的状态码仍如实显示（未知的会显示成 UNK）。
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

  // 已有数据时继续显示旧数据，只有首次加载才出骨架（v1 那份会每 30 秒闪一次空白）
  const showSkeleton = poll.loading && !poll.queried
  const showBody = poll.queried && visibleRows.length > 0
  const showEmpty = poll.queried && visibleRows.length === 0

  return (
    <div className="v2-root">
      <V2Masthead
        applied={poll.applied}
        running={poll.running}
        loading={poll.loading}
        queried={poll.queried}
        lastUpdated={poll.lastUpdated}
        theme={theme}
        onToggleTheme={toggleTheme}
        sound={sound}
        editing={poll.editing}
        onToggleEditor={poll.editing ? poll.closeEditor : poll.openEditor}
        editor={
          poll.editing && poll.applied ? (
            <V2ConditionPopover
              applied={poll.applied}
              onApply={poll.confirm}
              onCancel={poll.closeEditor}
            />
          ) : null
        }
        kpi={
          poll.showForm ? null : (
            <V2KpiStrip
              counts={counts}
              ready={poll.queried}
              filter={filter}
              refreshTick={poll.refreshTick}
              onChange={setFilter}
            />
          )
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
            <div className="flex items-center justify-between gap-4 px-5 py-2.5 xl:px-7">
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

          {showSkeleton ? <V3BodySkeleton /> : null}
          {showBody ? (
            <V3Body rows={visibleRows} filter={filter} onOpenReport={setReport} />
          ) : null}
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
        后续巡检结果会自动更新到这里
      </p>
    </div>
  )
}

export default AppV3
