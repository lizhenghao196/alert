import { useMemo, useState } from 'react'
import { TriangleAlert } from 'lucide-react'
import AppHeader from '../components/AppHeader'
import LaunchCard from '../components/LaunchCard'
import ReportDialog from '../components/ReportDialog'
import { useAlertPolling } from '../hooks/useAlertPolling'
import { useTheme } from '../theme'
import { type Alert, type FilterStatus, type Selection } from '../types'
import V4Body, { V4BodySkeleton } from './components/V4Body'
import { useV4AlertSound } from './useV4AlertSound'
import './v4.css'

const DEFAULT_FREQUENCY = 30

function AppV4() {
  const [theme, toggleTheme] = useTheme()
  const poll = useAlertPolling()
  const sound = useV4AlertSound(poll.rows, poll.queried, poll.refreshTick)

  const [teamName, setTeamName] = useState(poll.applied?.teamName ?? '')
  const [systemId, setSystemId] = useState(poll.applied?.systemId ?? '')
  const [frequency, setFrequency] = useState(poll.applied?.frequency ?? DEFAULT_FREQUENCY)
  const [formError, setFormError] = useState('')

  const [filter, setFilter] = useState<FilterStatus>('all')
  const [report, setReport] = useState<Alert | null>(null)

  const abnormal = useMemo(() => poll.rows.filter((row) => row.code === 1), [poll.rows])
  const normal = useMemo(() => poll.rows.filter((row) => row.code !== 1), [poll.rows])
  const counts = { total: poll.rows.length, abnormal: abnormal.length, normal: normal.length }

  const showLaunch = poll.showForm || poll.editing
  const showSkeleton = poll.loading && !poll.queried
  const showBody = poll.queried

  const confirm = (next: Selection) => {
    const error = poll.confirm(next)
    setFormError(error ?? '')
  }

  return (
    <div className="v4-root">
      {/* 顶部栏与模式二共用同一份（AppHeader）：领导要求两版顶部一致，用模式一的。
          启动页/改条件时正文是整页表单，头部就不摆数据了（showCommandBar=false）。 */}
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
        onEdit={poll.openEditor}
        showCommandBar={!showLaunch}
      />

      {showLaunch ? (
        <LaunchCard
          teamName={teamName}
          systemId={systemId}
          frequency={frequency}
          running={poll.running}
          error={formError}
          hasApplied={Boolean(poll.applied)}
          onChangeTeamName={setTeamName}
          onChangeSystemId={setSystemId}
          onChangeFrequency={setFrequency}
          onConfirm={confirm}
          onReset={() => {
            setTeamName('')
            setSystemId('')
            setFrequency(DEFAULT_FREQUENCY)
            setFormError('')
          }}
        />
      ) : (
        <main className="v4-main">
          {poll.error ? (
            <div className="v4-error" role="alert">
              <span>
                <TriangleAlert size={15} strokeWidth={2} />
                {poll.error}
              </span>
              <button type="button" onClick={poll.retry}>
                重试
              </button>
            </div>
          ) : null}

          {showSkeleton ? <V4BodySkeleton /> : null}
          {showBody ? (
            <V4Body
              abnormal={abnormal}
              normal={normal}
              filter={filter}
              loading={poll.loading}
              onOpenReport={setReport}
            />
          ) : null}

          {poll.simulated ? <span className="v4-simulated">模拟数据</span> : null}
        </main>
      )}

      <ReportDialog row={report} onClose={() => setReport(null)} />
    </div>
  )
}

export default AppV4
