import { useState } from 'react'
import { useAlertPolling } from './hooks/useAlertPolling'
import { useAlertSound } from './hooks/useAlertSound'
import { useTheme } from './theme'
import type { Selection } from './types'
import LaunchCard from './components/LaunchCard'
import ObservationView from './components/ObservationView'
import TopBar from './components/TopBar'

const DEFAULT_FREQUENCY = 30

function App() {
  const [theme, toggleTheme] = useTheme()
  const poll = useAlertPolling()
  const sound = useAlertSound(poll.rows, poll.queried)

  const [teamName, setTeamName] = useState(poll.applied?.teamName ?? '')
  const [systemId, setSystemId] = useState(poll.applied?.systemId ?? '')
  const [frequency, setFrequency] = useState(poll.applied?.frequency ?? DEFAULT_FREQUENCY)
  // 校验失败的提示由 confirm 返回后就地显示；poll.error 只留给查询失败
  const [formError, setFormError] = useState('')

  // v1 的编辑是一整页表单，不是浮层，所以 editing 时也走 LaunchCard
  const showLaunch = poll.showForm || poll.editing

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <TopBar theme={theme} onToggleTheme={toggleTheme} sound={sound} />
      <main className="flex-1">
        {showLaunch ? (
          <LaunchCard
            teamName={teamName}
            systemId={systemId}
            frequency={frequency}
            running={poll.running}
            // 只显示表单自己的校验错误。编辑期间后台轮询仍在跑，把它的查询错误
            // 接到这里会让用户以为是自己填错了。查询失败由观测页那条错误条负责。
            error={formError}
            hasApplied={Boolean(poll.applied)}
            onChangeTeamName={setTeamName}
            onChangeSystemId={setSystemId}
            onChangeFrequency={setFrequency}
            onConfirm={(next: Selection) => setFormError(poll.confirm(next) ?? '')}
            onReset={() => {
              setTeamName('')
              setSystemId('')
              setFrequency(DEFAULT_FREQUENCY)
              setFormError('')
            }}
          />
        ) : (
          <ObservationView
            rows={poll.rows}
            queried={poll.queried}
            loading={poll.loading}
            running={poll.running}
            error={poll.error}
            lastUpdated={poll.lastUpdated}
            simulated={poll.simulated}
            applied={poll.applied}
            refreshTick={poll.refreshTick}
            onEdit={poll.openEditor}
            onRetry={poll.retry}
          />
        )}
      </main>
    </div>
  )
}

export default App
