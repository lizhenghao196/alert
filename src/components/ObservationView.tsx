import { useMemo, useState } from 'react'
import { Check, FlaskConical, TriangleAlert } from 'lucide-react'
import AppliedSummary from './AppliedSummary'
import AlertCard from './AlertCard'
import AlertGridSkeleton from './AlertGridSkeleton'
import ReportDialog from './ReportDialog'
import { useCountUp } from '../hooks/useCountUp'
import type { Alert, FilterStatus, Selection } from '../types'

type Props = {
  rows: Alert[]
  queried: boolean
  loading: boolean
  running: boolean
  error: string
  lastUpdated: string
  simulated: boolean
  applied: Selection | null
  refreshTick: number
  onEdit: () => void
  onRetry: () => void
}

function ObservationView({
  rows,
  queried,
  loading,
  running,
  error,
  lastUpdated,
  simulated,
  applied,
  refreshTick,
  onEdit,
  onRetry,
}: Props) {
  const [filter_, setFilter] = useState<FilterStatus>('all')
  const [report, setReport] = useState<Alert | null>(null)

  const counts = useMemo(() => {
    let abnormal = 0
    for (const row of rows) {
      if (row.code === 1) abnormal += 1
    }
    // 「正常」按「不是异常」计，而不是 code === 0。接口若返回未知状态码，
    // 这样总数才恒等于异常 + 正常，筛选结果和计数也不会互相矛盾；
    // 行内的状态码仍如实显示（未知的会显示成 UNK）。
    return { total: rows.length, abnormal, normal: rows.length - abnormal }
  }, [rows])

  const visibleRows = useMemo(() => {
    return rows
      .filter((row) => {
        if (filter_ === 'all') return true
        if (filter_ === 'normal') return row.code !== 1
        return row.code === 1
      })
      .slice()
      .sort((a, b) => Number(b.code === 1) - Number(a.code === 1))
  }, [rows, filter_])

  const statusText = loading
    ? '正在查询'
    : running
      ? '持续观测中'
      : queried
        ? applied && applied.frequency === 0
          ? '单次查询完成'
          : '观测已暂停'
        : '等待开始观测'

  const showSkeleton = loading && !queried
  const showEmpty = !loading && queried && visibleRows.length === 0
  const showGrid = !loading && queried && visibleRows.length > 0

  return (
    <div className="animate-fade-slide-in px-4 pb-10 pt-3 md:px-6 xl:px-10">
      {/* KPI 带：大屏的第一眼落点 */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
        <div className="relative flex-1 overflow-hidden rounded-xl border border-l-[3px] border-line border-l-accent bg-panel shadow-card">
          <div
            key={refreshTick}
            className={refreshTick > 0 ? 'refresh-sweep-line run' : 'refresh-sweep-line'}
          />
          <div className="flex items-stretch divide-x divide-line" aria-label="状态筛选">
            <CountTile
              label="全部告警"
              count={counts.total}
              ready={queried}
              active={filter_ === 'all'}
              tone="neutral"
              onClick={() => setFilter('all')}
            />
            <CountTile
              label="异常"
              count={counts.abnormal}
              ready={queried}
              active={filter_ === 'abnormal'}
              tone="abnormal"
              onClick={() => setFilter('abnormal')}
            />
            <CountTile
              label="正常"
              count={counts.normal}
              ready={queried}
              active={filter_ === 'normal'}
              tone="normal"
              onClick={() => setFilter('normal')}
            />
          </div>
        </div>
        {applied ? (
          <AppliedSummary
            applied={applied}
            observing={running}
            statusText={statusText}
            lastUpdated={lastUpdated}
            onClick={onEdit}
          />
        ) : null}
      </div>

      {error ? (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-abnormal/40 bg-abnormal/5 px-4 py-2.5 text-xs text-abnormal">
          <span className="inline-flex items-center gap-2">
            <TriangleAlert size={14} strokeWidth={2} />
            {error}
          </span>
          <button
            type="button"
            className="shrink-0 rounded-md border border-current px-2.5 py-1 text-[11px] transition-colors duration-200 hover:bg-abnormal hover:text-canvas"
            onClick={onRetry}
          >
            重试
          </button>
        </div>
      ) : null}

      {showSkeleton ? <AlertGridSkeleton /> : null}

      {showEmpty ? (
        <div className="py-16 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full border border-normal/30 bg-normal/10 text-normal">
            <Check size={24} strokeWidth={2.2} />
          </div>
          <h3 className="text-base font-medium text-fg">
            {rows.length ? '当前状态下暂无告警' : '当前观测范围暂无告警'}
          </h3>
          <p className="mt-1.5 text-xs text-fg-mute">后续巡检结果会自动更新在这里。</p>
        </div>
      ) : null}

      {showGrid ? (
        <div className="alert-grid mt-3">
          {visibleRows.map((row, index) => (
            <AlertCard
              key={`${row.alertKey}:${row.systemId}:${index}`}
              row={row}
              index={index}
              onOpenReport={() => {
                if (row.msg) setReport(row)
              }}
            />
          ))}
        </div>
      ) : null}

      {simulated ? (
        <div className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-warn/40 bg-warn/10 px-2.5 py-1 text-[11px] text-warn">
          <FlaskConical size={12} strokeWidth={2} />
          模拟数据
        </div>
      ) : null}

      <ReportDialog row={report} onClose={() => setReport(null)} />
    </div>
  )
}

type TileTone = 'neutral' | 'abnormal' | 'normal'

type CountTileProps = {
  label: string
  count: number
  ready: boolean
  active: boolean
  tone: TileTone
  onClick: () => void
}

function CountTile({ label, count, ready, active, tone, onClick }: CountTileProps) {
  const shown = useCountUp(count)

  const toneText =
    tone === 'abnormal' ? 'text-abnormal' : tone === 'normal' ? 'text-normal' : 'text-fg'

  // 异常数不为 0 时，即便没选中也留一层极淡的底：满屏卡片里要能一眼扫到它。
  const emphasis = tone === 'abnormal' && count > 0

  const background = active
    ? tone === 'abnormal'
      ? 'bg-abnormal/10'
      : tone === 'normal'
        ? 'bg-normal/10'
        : 'bg-accent/10'
    : emphasis
      ? 'bg-abnormal/[0.05]'
      : 'hover:bg-raise'

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        'relative flex-1 select-none px-4 py-2.5 text-center transition-colors duration-200',
        toneText,
        background,
      ].join(' ')}
    >
      <strong className="block text-[clamp(26px,2vw,36px)] font-semibold leading-none tracking-tight tabular-nums">
        {ready ? shown : '—'}
      </strong>
      <span className="mt-1.5 block text-xs font-medium text-fg-soft">{label}</span>
      <span
        className={[
          'absolute inset-x-5 bottom-0 h-[2px] rounded-full bg-current transition-opacity duration-200',
          active ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
      />
    </button>
  )
}

export default ObservationView
