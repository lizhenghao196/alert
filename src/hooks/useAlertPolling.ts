import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { queryOngoingAlerts } from '../api'
import { loadSelection, saveSelection } from '../storage'
import type { Alert, Selection } from '../types'

/**
 * 请求超时。内网接口单次查询耗时较长，一般不超过 30s，所以这里取 60s，
 * 留一倍的余量给偶发的慢请求，同时仍能给真正挂死的请求兜底。
 *
 * 注意这只是前端这一层。反代那侧的 proxy_read_timeout 必须同步放大，
 * 否则 nginx 会先返回 504，前端等多久都没用。
 */
const REQUEST_TIMEOUT_MS = 60_000

export type AlertPolling = {
  /** 当前生效的观测条件；null 表示还没选过 */
  applied: Selection | null
  /** true 表示应该显示首次进入的条件表单 */
  showForm: boolean
  /** true 表示用户打开了条件编辑器（此时轮询照常进行） */
  editing: boolean
  rows: Alert[]
  queried: boolean
  loading: boolean
  running: boolean
  error: string
  lastUpdated: string
  simulated: boolean
  refreshTick: number
  /** 校验不通过时返回提示文案，通过则返回 null */
  confirm: (next: { teamName: string; systemId: string; frequency: number }) => string | null
  openEditor: () => void
  closeEditor: () => void
  retry: () => void
}

/**
 * 告警轮询。v1 / v2 / v3 共用同一份：generation 守卫、请求超时、
 * 以及刷新后要显式 setRunning 那个修复都在这里。
 */
export function useAlertPolling(): AlertPolling {
  const initial = useMemo(loadSelection, [])

  const [showForm, setShowForm] = useState(!initial)
  const [applied, setApplied] = useState<Selection | null>(initial)
  const [editing, setEditing] = useState(false)

  const [rows, setRows] = useState<Alert[]>([])
  const [queried, setQueried] = useState(false)
  const [loading, setLoading] = useState(false)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState('')
  const [simulated, setSimulated] = useState(false)
  const [refreshTick, setRefreshTick] = useState(0)

  const pollGeneration = useRef(0)
  const abortRef = useRef<AbortController | null>(null)
  const pollTimer = useRef<number | null>(null)
  const requestTimer = useRef<number | null>(null)

  const stopPolling = useCallback(() => {
    pollGeneration.current += 1
    if (pollTimer.current !== null) {
      window.clearTimeout(pollTimer.current)
      pollTimer.current = null
    }
    if (requestTimer.current !== null) {
      window.clearTimeout(requestTimer.current)
      requestTimer.current = null
    }
    if (abortRef.current) abortRef.current.abort()
    setRunning(false)
    setLoading(false)
  }, [])

  const pollOnce = useCallback(
    async (generation: number, selection: Selection, scheduleNext: boolean) => {
      setLoading(true)
      setError('')
      const controller = new AbortController()
      abortRef.current = controller
      if (requestTimer.current !== null) window.clearTimeout(requestTimer.current)
      requestTimer.current = window.setTimeout(
        () => controller.abort(),
        REQUEST_TIMEOUT_MS,
      )
      try {
        const result = await queryOngoingAlerts(selection, controller.signal)
        if (generation !== pollGeneration.current) return
        setRows(result.items)
        setQueried(true)
        setSimulated(result.simulated)
        setLastUpdated(new Date().toLocaleTimeString('zh-CN', { hour12: false }))
        setRefreshTick((tick) => tick + 1)
      } catch {
        if (generation !== pollGeneration.current) return
        setError(
          controller.signal.aborted ? '查询超时，请稍后重试。' : '查询失败，请检查服务连接。',
        )
      } finally {
        if (generation === pollGeneration.current) {
          if (requestTimer.current !== null) {
            window.clearTimeout(requestTimer.current)
            requestTimer.current = null
          }
          setLoading(false)
          if (scheduleNext) {
            pollTimer.current = window.setTimeout(
              () => pollOnce(generation, selection, true),
              selection.frequency * 1000,
            )
          }
        }
      }
    },
    [],
  )

  const confirm = useCallback(
    (next: { teamName: string; systemId: string; frequency: number }): string | null => {
      if (!next.teamName && !next.systemId.trim()) {
        return '请选择组别或填写系统名，至少填写一项。'
      }
      stopPolling()
      const selection: Selection = {
        teamName: next.teamName,
        systemId: next.systemId.trim(),
        frequency: next.frequency,
      }
      setApplied(selection)
      saveSelection(selection)
      setRows([])
      setQueried(false)
      setLastUpdated('')
      setError('')
      setRunning(selection.frequency > 0)
      setShowForm(false)
      setEditing(false)
      pollOnce(pollGeneration.current, selection, selection.frequency > 0)
      return null
    },
    [pollOnce, stopPolling],
  )

  // 打开编辑器不碰轮询：观察中的表格要保持继续刷新
  const openEditor = useCallback(() => setEditing(true), [])
  const closeEditor = useCallback(() => setEditing(false), [])

  const retry = useCallback(() => {
    if (applied) confirm(applied)
  }, [applied, confirm])

  // 首次进入时，若缓存里有观测条件就自动恢复轮询
  useEffect(() => {
    if (showForm || !applied) return
    // 漏掉这行的话：刷新后轮询确实在跑，但 running 一直是 false，
    // 状态会显示成「已暂停」、指示灯也是灰的。
    setRunning(applied.frequency > 0)
    pollOnce(pollGeneration.current, applied, applied.frequency > 0)
    return () => {
      pollGeneration.current += 1
      if (pollTimer.current !== null) window.clearTimeout(pollTimer.current)
      if (requestTimer.current !== null) window.clearTimeout(requestTimer.current)
      if (abortRef.current) abortRef.current.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    applied,
    showForm,
    editing,
    rows,
    queried,
    loading,
    running,
    error,
    lastUpdated,
    simulated,
    refreshTick,
    confirm,
    openEditor,
    closeEditor,
    retry,
  }
}
