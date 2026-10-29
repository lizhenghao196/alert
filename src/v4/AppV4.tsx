import { useEffect, useMemo, useRef, useState } from 'react'
import { TriangleAlert } from 'lucide-react'
import AppHeader from '../components/AppHeader'
import LaunchCard from '../components/LaunchCard'
import ReportDialog from '../components/ReportDialog'
import { useAlertPolling } from '../hooks/useAlertPolling'
import { useTheme } from '../theme'
import { type Alert, type FilterStatus, type Selection } from '../types'
import V4Body, { V4BodySkeleton } from './components/V4Body'
import V4CloseAlertDialog from './components/V4CloseAlertDialog'
import V4Toast from './components/V4Toast'
import type { ToastTone } from './components/V4Toast'
import { useV4AlertSound } from './useV4AlertSound'
import './v4.css'

const DEFAULT_FREQUENCY = 30

/** 关单成功提示停留时长 */
const TOAST_MS = 3000

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
  /** 正在关单的告警；null 表示弹窗关闭 */
  const [closing, setClosing] = useState<Alert | null>(null)
  const [toast, setToast] = useState<{ message: string; tone: ToastTone } | null>(null)
  const toastTimer = useRef<number | null>(null)
  /** 请求回来但弹窗还在播退场动画，文案先存这儿，等弹窗关完再弹 */
  const pendingToast = useRef<{ message: string; tone: ToastTone } | null>(null)

  useEffect(
    () => () => {
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current)
    },
    [],
  )

  const showToast = (next: { message: string; tone: ToastTone }) => {
    setToast(next)
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), TOAST_MS)
  }

  /**
   * 关单请求回来：记下后端文案和成功与否，立刻重查一次。
   * 走 refresh 而不是 retry —— retry 会先清空结果、把 queried 打回 false，
   * 屏幕上会闪一下骨架屏；refresh 保留当前列表，只把定时器重新起一遍。
   */
  const handleSubmitted = (_row: Alert, message: string, ok: boolean) => {
    pendingToast.current = { message, tone: ok ? 'success' : 'warning' }
    poll.refresh()
  }

  /** 弹窗关完（退场动画结束）再弹提示，否则会被 dialog 的遮罩压住 */
  const handleDialogClosed = () => {
    setClosing(null)
    if (pendingToast.current) {
      showToast(pendingToast.current)
      pendingToast.current = null
    }
  }

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
              onCloseAlert={setClosing}
            />
          ) : null}

          {poll.simulated ? <span className="v4-simulated">模拟数据</span> : null}
        </main>
      )}

      <ReportDialog row={report} onClose={() => setReport(null)} />
      <V4CloseAlertDialog
        row={closing}
        onClose={handleDialogClosed}
        onSubmitted={handleSubmitted}
      />
      <V4Toast message={toast?.message ?? ''} tone={toast?.tone ?? 'success'} />
    </div>
  )
}

export default AppV4
