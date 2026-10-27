import { useEffect, useMemo, useState } from 'react'
import AlarmTable, { type ViewFieldType } from './AlarmTable'
import { ALL_GROUPS, flattenLevel, levelRowCount, levelTone, type NestedLevel, type Row } from '../shape'

type Props = {
  /** [ { name: 'AI关闭失败', groups: [ { name: '102', rows: [告警行] } ] } ] */
  levels: NestedLevel[]
  onViewField: (type: ViewFieldType, row: Row) => void
}

/**
 * 两级型区块（本项目 = AI处置）。
 *
 * 一级（处置结果）数量不定、可能有十几个 → 左侧竖排导航；
 * 二级（告警源）也可能十几二十个 → 可换行的筛选 chip，默认「全部」。
 */
function NestedGroups({ levels, onViewField }: Props) {
  const [activeLevel, setActiveLevel] = useState('')
  // 每个一级各自记住自己选的告警源：{ 'AI关闭失败': '186' }（缺省 = 全部）
  const [activeGroup, setActiveGroup] = useState<Record<string, string>>({})

  // 数据换了（重新查询）就复位到第一项
  useEffect(() => {
    setActiveLevel(levels[0] ? levels[0].name : '')
    setActiveGroup({})
  }, [levels])

  const currentLevel = useMemo(
    () => levels.find((level) => level.name === activeLevel) || null,
    [levels, activeLevel],
  )
  const currentGroups = currentLevel ? currentLevel.groups || [] : []
  const showFilter = currentGroups.length > 1

  // 当前生效的筛选值：缺省 / 失效的告警源都回落成「全部」
  const activeFilter = useMemo(() => {
    if (!currentLevel) return ALL_GROUPS
    const picked = activeGroup[currentLevel.name]
    if (!picked || picked === ALL_GROUPS) return ALL_GROUPS
    return currentGroups.some((group) => group.name === picked) ? picked : ALL_GROUPS
  }, [currentLevel, currentGroups, activeGroup])

  const rows = useMemo(() => flattenLevel(currentLevel, activeFilter), [currentLevel, activeFilter])

  const chips = currentLevel
    ? [
        { value: ALL_GROUPS, label: '全部', count: levelRowCount(currentLevel) },
        ...currentGroups.map((group) => ({
          value: group.name,
          label: group.name,
          count: group.rows.length,
        })),
      ]
    : []

  if (levels.length === 0) {
    return (
      <div className="aa-table__empty">
        <span className="aa-table__empty-icon">✓</span>
        <span>暂无数据</span>
      </div>
    )
  }

  return (
    <div className="aa-ng">
      <aside className="aa-ng__nav">
        <div className="aa-ng__nav-list">
          {levels.map((level) => (
            <button
              key={level.name}
              type="button"
              className={level.name === activeLevel ? 'aa-ng__nav-item is-active' : 'aa-ng__nav-item'}
              title={level.name}
              onClick={() => setActiveLevel(level.name)}
            >
              <i className={`aa-ng__dot is-${levelTone(level.name)}`} />
              <span className="aa-ng__nav-name">{level.name}</span>
              <span className="aa-ng__nav-count">{levelRowCount(level)}</span>
            </button>
          ))}
        </div>
      </aside>

      <div className="aa-ng__main">
        {showFilter ? (
          <div className="aa-ng__filter">
            <span className="aa-ng__filter-label">告警源</span>
            <div className="aa-ng__chips">
              {chips.map((chip) => (
                <button
                  key={chip.value}
                  type="button"
                  className={chip.value === activeFilter ? 'aa-ng__chip is-active' : 'aa-ng__chip'}
                  title={chip.label}
                  onClick={() => {
                    if (!currentLevel) return
                    setActiveGroup((prev) => ({ ...prev, [currentLevel.name]: chip.value }))
                  }}
                >
                  <span className="aa-ng__chip-label">{chip.label}</span>
                  <span className="aa-ng__chip-count">{chip.count}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/* is-fixed：本区块（AI处置）的表格高度**固定**，行多行少都一样高；
            其余区块的表格仍是 max-height（行少时收缩）。见 table.css。 */}
        <AlarmTable rows={rows} onViewField={onViewField} wrapClassName="is-fixed" />
      </div>
    </div>
  )
}

export default NestedGroups
