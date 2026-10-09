import type { FilterStatus } from '../../types'

type Props = {
  counts: { total: number; abnormal: number; normal: number }
  ready: boolean
  filter: FilterStatus
  refreshTick: number
  onChange: (filter: FilterStatus) => void
}

function V2KpiStrip({ counts, ready, filter, refreshTick, onChange }: Props) {
  return (
    <div className="v2-kpi">
      {/*
        数据刷新时扫一道。这是真的有东西变了才出现，不是常驻动效。

        必须带 opacity-0：关键帧没有 forwards 填充，动画结束后元素会回落到
        自身样式。自身没有 opacity 声明的话就回落成完全可见，一条 1/3 宽的
        琥珀渐变会永久糊在 KPI 条左侧。
      */}
      {refreshTick > 0 ? (
        <span
          key={refreshTick}
          aria-hidden
          className="animate-term-sweep pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-term-amber/25 to-transparent opacity-0"
        />
      ) : null}

      <Cell
        label="全部"
        count={counts.total}
        ready={ready}
        active={filter === 'all'}
        className="text-term-fg"
        onClick={() => onChange('all')}
      />
      <Cell
        label="异常"
        count={counts.abnormal}
        ready={ready}
        active={filter === 'abnormal'}
        className="text-term-alert"
        onClick={() => onChange('abnormal')}
      />
      <Cell
        label="正常"
        count={counts.normal}
        ready={ready}
        active={filter === 'normal'}
        className="text-term-ok"
        onClick={() => onChange('normal')}
      />
    </div>
  )
}

type CellProps = {
  label: string
  count: number
  ready: boolean
  active: boolean
  className: string
  onClick: () => void
}

/**
 * 一个格子 = 一个方框（40px 高、无圆角）：左标签右数字，两端对齐。
 * 选中态交给 CSS 的 aria-pressed 画（琥珀描边 + 琥珀淡底），
 * 不额外塞状态元素。
 */
function Cell({ label, count, ready, active, className, onClick }: CellProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="v2-kpi-cell"
    >
      <span className="v2-label">{label}</span>
      {/* 没数据时用 -- 而不是 em dash：这个技能把 em dash 列为硬禁用字符 */}
      <span className={`v2-kpi-num ${ready ? className : 'text-term-fg-mute'}`}>
        {ready ? String(count).padStart(2, '0') : '--'}
      </span>
    </button>
  )
}

export default V2KpiStrip
