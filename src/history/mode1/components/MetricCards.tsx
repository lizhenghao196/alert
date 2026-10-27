import type { MetricGroup } from '../shape'

type Props = {
  /** [ { name: '指标', metrics: [ { key, value, display, tone } ] } ] —— 由 shape.ts 的 buildSections 产出 */
  groups: MetricGroup[]
}

/**
 * 指标条。所有指标型 key 已在 shape.ts 里合并成唯一一条，所以这里通常只有一组，
 * 一行铺满、不换行（指标过多时横向滚动兜底）。
 */
function MetricCards({ groups }: Props) {
  return (
    <div className="aa-mc">
      {groups.map((group, gi) => (
        <div
          key={group.name}
          className={[
            'aa-mc__group',
            gi === 0 ? 'is-first' : '',
            groups.length === 1 ? 'is-only' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          style={{ flexGrow: Math.max(1, group.metrics.length) }}
        >
          {groups.length > 1 ? (
            <span className="aa-mc__tag" title={group.name}>
              {group.name}
            </span>
          ) : null}

          <div className="aa-mc__items">
            {group.metrics.map((metric, mi) => (
              <div
                key={metric.key}
                className={mi === 0 ? 'aa-mc__item is-first' : 'aa-mc__item'}
              >
                <div className={`aa-mc__value is-${metric.tone}`}>{String(metric.display)}</div>
                <div className="aa-mc__label" title={metric.key}>
                  {metric.key}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default MetricCards
