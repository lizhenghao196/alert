import { frequencyLabel, type Selection } from '../types'

type Props = {
  applied: Selection
  /** 是否正在持续轮询。决定左侧竖条是呼吸还是静止。 */
  observing: boolean
  statusText: string
  lastUpdated: string
  onClick: () => void
}

/**
 * 观测条件条。整条就是一个按钮，点了展开条件编辑器。
 *
 * 计数条挪进顶栏之后，这一条独占内容区第一行，所以内部改成横向排布：
 * 条件 → 运行状态 → 更新时间 → 修改入口，右侧贴边。竖着堆会留下大片空白。
 */
function AppliedSummary({ applied, observing, statusText, lastUpdated, onClick }: Props) {
  const team = applied.teamName || '全量组别'
  const system = applied.systemId || '全部系统'

  return (
    <button
      type="button"
      onClick={onClick}
      title="点击修改观测条件"
      className="group relative flex w-full flex-wrap items-center gap-x-5 gap-y-1 overflow-hidden rounded-xl border border-line bg-panel py-2.5 pl-5 pr-4 text-left shadow-card transition-colors duration-200 hover:border-accent/40 hover:bg-accent/5"
    >
      {/* 左边那道竖条是「正在观测」的唯一常驻信号，不占内容宽度 */}
      <span
        aria-hidden
        className={[
          'absolute left-0 top-3 bottom-3 w-[3px] rounded-full transition-colors duration-300',
          observing ? 'bg-accent animate-accent-breathe' : 'bg-line-strong',
        ].join(' ')}
      />

      <span className="shrink-0 text-[11px] font-semibold text-fg-soft">观测条件</span>

      <span className="min-w-0 truncate text-[13px] font-medium text-fg">
        {team} · {system} · {frequencyLabel(applied.frequency)}
      </span>

      <span className="ml-auto flex shrink-0 items-center gap-2 text-xs text-fg-soft">
        <span
          aria-hidden
          className={[
            'inline-block h-1.5 w-1.5 rounded-full',
            observing ? 'bg-normal animate-status-pulse' : 'bg-fg-mute',
          ].join(' ')}
        />
        {statusText}
      </span>

      <span className="shrink-0 tabular-nums text-xs text-fg-mute">
        {lastUpdated ? `更新于 ${lastUpdated}` : '尚未获取数据'}
      </span>

      <span className="shrink-0 text-xs font-normal text-fg-mute transition-colors duration-200 group-hover:text-accent">
        点击修改
      </span>
    </button>
  )
}

export default AppliedSummary
