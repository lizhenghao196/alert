import { useEffect, useMemo, useState } from 'react'
import { getAlarmAnalysis, pickPayload } from './api'
import type { HistoryMode1Props } from '../query'
import {
  METRICS_KEY,
  buildQueryParams,
  buildSections,
  type MetricGroup,
  type Row,
  type Section,
} from './shape'
import AlarmTable, { type ViewFieldType } from './components/AlarmTable'
import CollapseSection from './components/CollapseSection'
import DuplicateTable from './components/DuplicateTable'
import FieldDialog from './components/FieldDialog'
import MetricCards from './components/MetricCards'
import NestedGroups from './components/NestedGroups'
import './mode1.css'

/**
 * 历史数据 · 模式一 —— 复刻 RuoYi 的告警分析页（views/tool/alarmAnalysis）。
 *
 * 结构与原页一一对应：指标条 → 动态区块（表格型 / 两级型 / 重复型）→ 字段弹窗。
 * （原先正文顶部还有一条「告警总量 / 重复性分析」概览条，现已去掉：总量不再展示，
 * 重复性分析组数挪到 header 上「切换主题」按钮旁边，见下面的 onHeaderState。）
 *
 * 查询工具栏在 `history-header` 里、与模式二共用同一份（见 AppHistory），
 * 条件也是共用的，所以「模式一里是什么参数，模式二就是什么参数」。
 *
 * 「一键收起 / 一键展开」这颗按钮也在 header 上（紧挨查询按钮），但状态归本模式：
 * 由 `onHeaderState` 把「要不要显示 / 是否已全部收起 / 重复性分析组数」报上去，
 * AppHistory 负责渲染，并在切到模式二时把它们藏掉；`collapseTick` 是它被点击的信号。
 *
 * 查询时机：本模式挂载时 / 每次切回本模式时 / 用户点「查询」或回车时各查一次
 * （`useEffect` 依赖 `[active, queryTick]`）。
 *
 * 数据形态判定与区块构建全部走 shape.ts（与 RuoYi 的 shape.js 同一套规则），
 * 数据源由 `history/config.ts` 的 USE_MOCK 决定（mock / 真实接口）。
 */
function HistoryMode1({
  active,
  queryTick,
  teamName,
  systemId,
  dateRange,
  collapseTick,
  onHeaderState,
}: HistoryMode1Props) {
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const [metricGroups, setMetricGroups] = useState<MetricGroup[]>([])
  const [sections, setSections] = useState<Section[]>([])
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [activeTabs, setActiveTabs] = useState<Record<string, string>>({})

  const [fieldVisible, setFieldVisible] = useState(false)
  const [fieldType, setFieldType] = useState<ViewFieldType>('report')
  const [fieldItem, setFieldItem] = useState<Row>({})

  const sectionKeys = useMemo(() => {
    const keys = sections.map((section) => section.key)
    return metricGroups.length > 0 ? [METRICS_KEY].concat(keys) : keys
  }, [sections, metricGroups])

  const metricsBadge = useMemo(() => {
    const count = metricGroups.reduce((sum, group) => sum + group.metrics.length, 0)
    return metricGroups.length > 1 ? `${metricGroups.length} 组 · ${count} 项` : `${count} 项`
  }, [metricGroups])

  const duplicateGroupCount = useMemo(() => {
    const dup = sections.find((section) => section.kind === 'duplicate')
    return dup && dup.kind === 'duplicate' ? dup.groups.length : 0
  }, [sections])

  const hasData = metricGroups.length > 0 || sections.length > 0
  const allCollapsed = sectionKeys.length > 0 && sectionKeys.every((key) => !!collapsed[key])

  const handleQuery = () => {
    if (loading) return
    // 系统 ID 选填：没填就不带 systemId 字段；组别 teamName 有默认值，始终带上
    const params = buildQueryParams({ systemId, teamName, dateRange })
    setLoading(true)
    getAlarmAnalysis(params)
      .then((res) => {
        const built = buildSections(pickPayload(res))
        setMetricGroups(built.metricGroups)
        setSections(built.sections)
        setCollapsed({})
        const tabs: Record<string, string> = {}
        built.sections.forEach((section) => {
          if (section.kind === 'table' && section.lists.length > 1) {
            tabs[section.key] = section.lists[0].name
          }
        })
        setActiveTabs(tabs)
        setSearched(true)
      })
      .catch(() => {
        setMetricGroups([])
        setSections([])
        setSearched(true)
      })
      .finally(() => setLoading(false))
  }

  // 挂载时（打开历史数据页默认就是模式一）、每次切回本模式时、以及用户点查询/回车时，
  // 各查一次。queryTick 变化只在 active 为 true 时才真正发请求。
  useEffect(() => {
    if (active) handleQuery()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, queryTick])

  const toggleSection = (key: string) => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  // 一键收起 / 一键展开：任一展开则全部收起，全部收起则全部展开
  const toggleAllSections = () => {
    if (allCollapsed) {
      setCollapsed({})
      return
    }
    const map: Record<string, boolean> = {}
    sectionKeys.forEach((key) => {
      map[key] = true
    })
    setCollapsed(map)
  }

  const openField = (type: ViewFieldType, row: Row) => {
    setFieldType(type)
    setFieldItem(row || {})
    setFieldVisible(true)
  }

  // 把 header 上需要的状态报上去（按钮/统计渲染在 header，但状态属于本模式；
  // 切到模式二时 AppHistory 会直接不渲染它们）：
  //   一键收起按钮的显隐与文案 + 「重复性分析 N 组」
  useEffect(() => {
    onHeaderState({
      collapseVisible: searched && hasData,
      allCollapsed,
      duplicateGroups: duplicateGroupCount,
    })
  }, [searched, hasData, allCollapsed, duplicateGroupCount, onHeaderState])

  // 响应 header 上那颗按钮的点击
  useEffect(() => {
    if (collapseTick > 0) toggleAllSections()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collapseTick])

  return (
    <div className="aa-root">
      {/* ================= 数据区域 ================= */}
      <div className="aa-body">
        {loading ? (
          <div className="aa-loading" role="status">
            <span className="aa-loading__spinner" />
            正在查询...
          </div>
        ) : null}

        {!searched ? (
          <section className="aa-state">
            <div className="aa-empty">
              <div className="aa-empty__image">🔎</div>
              <div className="aa-empty__desc">请输入查询条件后点击「查询」</div>
              <p className="aa-state__hint">支持系统英文缩写（选填，如 AUTH）与告警时间范围组合查询</p>
            </div>
          </section>
        ) : !hasData ? (
          <section className="aa-state">
            <div className="aa-empty">
              <div className="aa-empty__image">📭</div>
              <div className="aa-empty__desc">当前查询条件下暂无告警数据</div>
            </div>
          </section>
        ) : (
          <>
            {/* 指标：后端按 P1/P2 返回，页面上合并成一条 */}
            {metricGroups.length > 0 ? (
              <CollapseSection
                title="指标"
                icon="table"
                badge={metricsBadge}
                collapsed={!!collapsed[METRICS_KEY]}
                onToggle={() => toggleSection(METRICS_KEY)}
              >
                <MetricCards groups={metricGroups} />
              </CollapseSection>
            ) : null}

            {/* 其余区块：完全按后端返回的 key 与形态动态渲染 */}
            {sections.map((section) => (
              <CollapseSection
                key={section.key}
                title={section.title}
                icon={section.icon}
                badge={section.badge}
                collapsed={!!collapsed[section.key]}
                onToggle={() => toggleSection(section.key)}
              >
                {section.kind === 'nested' ? (
                  <NestedGroups levels={section.levels} onViewField={openField} />
                ) : null}

                {section.kind === 'duplicate' ? <DuplicateTable groups={section.groups} /> : null}

                {section.kind === 'table' && section.lists.length === 1 ? (
                  <AlarmTable rows={section.lists[0].rows} onViewField={openField} />
                ) : null}

                {section.kind === 'table' && section.lists.length > 1 ? (
                  <div className="aa-tabs">
                    <div className="aa-tabs__nav" role="tablist">
                      {section.lists.map((list) => {
                        const isActive =
                          (activeTabs[section.key] ?? section.lists[0].name) === list.name
                        return (
                          <button
                            key={list.name}
                            type="button"
                            role="tab"
                            aria-selected={isActive}
                            className={isActive ? 'aa-tabs__item is-active' : 'aa-tabs__item'}
                            onClick={() =>
                              setActiveTabs((prev) => ({ ...prev, [section.key]: list.name }))
                            }
                          >
                            {`${list.name} (${list.rows.length})`}
                          </button>
                        )
                      })}
                    </div>
                    {section.lists.map((list) => {
                      const isActive =
                        (activeTabs[section.key] ?? section.lists[0].name) === list.name
                      return isActive ? (
                        <div className="aa-tabs__panel" key={list.name}>
                          <AlarmTable rows={list.rows} onViewField={openField} />
                        </div>
                      ) : null
                    })}
                  </div>
                ) : null}
              </CollapseSection>
            ))}
          </>
        )}
      </div>

      <FieldDialog
        visible={fieldVisible}
        type={fieldType}
        item={fieldItem}
        onClose={() => setFieldVisible(false)}
      />
    </div>
  )
}

export default HistoryMode1
