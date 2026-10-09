import { ScanLine, TriangleAlert } from 'lucide-react'
import { FREQUENCY_OPTIONS, TEAMS, type Selection } from '../types'

type Props = {
  teamName: string
  systemId: string
  frequency: number
  running: boolean
  error: string
  hasApplied: boolean
  onChangeTeamName: (value: string) => void
  onChangeSystemId: (value: string) => void
  onChangeFrequency: (value: number) => void
  onConfirm: (selection: Selection) => void
  onReset: () => void
}

const FIELD =
  'rounded-lg border border-line bg-surface px-3 py-2.5 text-[13.5px] text-fg transition-colors duration-200 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30'

const LABEL = 'flex flex-col gap-1.5 text-xs font-medium text-fg-soft'

function LaunchCard({
  teamName,
  systemId,
  frequency,
  error,
  hasApplied,
  onChangeTeamName,
  onChangeSystemId,
  onChangeFrequency,
  onConfirm,
  onReset,
}: Props) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-[1180px] flex-col px-4 py-6 md:px-6 md:py-8 xl:px-0">
      <form
        className="w-full animate-fade-slide-in rounded-2xl border border-line bg-panel p-5 shadow-lift md:p-6"
        onSubmit={(event) => {
          event.preventDefault()
          onConfirm({ teamName, systemId, frequency })
        }}
      >
        <div className="flex flex-col gap-4 border-b border-line pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-normal/25 bg-normal/10 px-2.5 py-1 text-xs font-semibold tracking-wide text-normal">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-normal" />
              实时观测
            </div>

            <h2 className="mt-3 text-xl font-semibold leading-snug text-fg">
              选择观测范围，开启告警巡检
            </h2>
          </div>
          <p className="max-w-[460px] text-xs leading-relaxed text-fg-soft md:text-right">
            组别和系统名至少填写一项。确认后会立即查询，并按设定频率持续更新告警。
          </p>
        </div>

        <div className="mt-5 grid gap-3.5 md:grid-cols-2 xl:grid-cols-[minmax(180px,0.9fr)_minmax(240px,1.25fr)_minmax(180px,0.9fr)_auto] xl:items-end">
          <label className={LABEL}>
            组别
            <select
              className={FIELD}
              value={teamName}
              onChange={(event) => onChangeTeamName(event.target.value)}
            >
              <option value="">不限定组别</option>
              {TEAMS.map((team) => (
                <option key={team} value={team}>
                  {team}
                </option>
              ))}
            </select>
          </label>

          <label className={LABEL}>
            系统名
            <input
              className={FIELD}
              type="text"
              maxLength={100}
              placeholder="例如 DASP"
              value={systemId}
              onChange={(event) => onChangeSystemId(event.target.value)}
            />
          </label>

          <label className={LABEL}>
            巡检频率
            <select
              className={FIELD}
              value={frequency}
              onChange={(event) => onChangeFrequency(Number(event.target.value))}
            >
              {FREQUENCY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-center justify-end gap-2.5 md:col-span-2 xl:col-span-1">
            <button
              type="button"
              className="h-10 rounded-lg border border-line bg-transparent px-5 text-[13px] text-fg-soft transition-colors duration-200 hover:bg-raise hover:text-fg"
              onClick={onReset}
            >
              重置
            </button>
            <button
              type="submit"
              className="h-10 rounded-lg bg-accent px-5 text-[13px] font-semibold text-on-accent transition-[filter,transform] duration-200 hover:brightness-110 active:translate-y-px"
            >
              {hasApplied ? '重新观测' : '确认观测'}
            </button>
          </div>
        </div>

        {error ? (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-abnormal/40 bg-abnormal/5 px-3 py-2 text-xs text-abnormal">
            <TriangleAlert size={14} strokeWidth={2} className="shrink-0" />
            {error}
          </div>
        ) : null}
      </form>

      <div className="flex flex-1 animate-fade-slide-in items-center justify-center py-12 text-center [animation-delay:80ms]">
        <div className="max-w-[420px]">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-accent/20 bg-accent/10 text-accent">
            <ScanLine size={22} strokeWidth={1.8} />
          </div>
          <h3 className="mt-4 text-sm font-semibold text-fg">告警数据将在这里持续更新</h3>
          <p className="mt-1.5 text-xs leading-5 text-fg-soft">
            异常项会优先展示，并可按全部、异常和正常状态快速筛选。
          </p>
        </div>
      </div>
    </div>
  )
}

export default LaunchCard
