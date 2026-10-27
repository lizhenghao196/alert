/**
 * 告警分析页的数据形态判定与区块构建（从 RuoYi `views/tool/alarmAnalysis/shape.js`
 * 原样移植到 TS，判定规则与分组方式保持一致）。
 *
 * ⚠️ 与 shape.js 的唯一差异：**展示顺序**。区块内的分类（多 tab）、两级结构的一级
 * （左侧导航）与二级（告警源 chip）统一按**条数降序**排列（多的排前面），
 * 见 `makeTableSection` / `makeNestedSection`。数据本身一条不动，只调顺序。
 *
 * ⚠️ 纯函数模块：不 import React / api，可在 node 里直接跑断言。
 *
 * 后端返回的载荷是「按顶层 key 分块」的，**每块的形态可能不同**，页面不硬编码
 * P1/P2/P3，而是按形态动态渲染：
 *
 *   metrics    指标型：{ 指标名: 标量 }                 → 所有指标型 key 合并成一条指标条
 *   table      表格型：{ 分类名: [告警行] }              → 一张表 / 多分类 tab
 *   nested     两级型：{ 一级: { 二级: [告警行] } }      → 一级导航 + 二级筛选 + 表格
 *   duplicate  重复型：[ { data: [...], 重复性说明 } ]   → 重复性分析表
 *   rows       行数组：[ 告警行 ]                       → 单表
 *   empty      空（{} / []）                          → 不渲染
 *   其它（raw）                                       → 不渲染
 *   混合型（同一 key 下既有标量又有数组）               → 逐子项拆到对应位置，不丢数据
 */

/** 告警行（字段不固定，按后端返回原样透传） */
export type Row = Record<string, unknown>

export type MetricTone = 'muted' | 'active'

export type Metric = {
  key: string
  value: unknown
  display: unknown
  tone: MetricTone
}

export type MetricGroup = { name: string; metrics: Metric[] }

/** 区块图标的语义名，由组件映射成具体的图标（不写死 UI 库的图标类名） */
export type SectionIcon = 'table' | 'nested' | 'duplicate'

export type TableList = { name: string; rows: Row[] }

export type TableSection = {
  key: string
  kind: 'table'
  title: string
  icon: SectionIcon
  badge: string
  lists: TableList[]
}

export type NestedLevel = { name: string; groups: Array<{ name: string; rows: Row[] }> }

export type NestedSection = {
  key: string
  kind: 'nested'
  title: string
  icon: SectionIcon
  badge: string
  levels: NestedLevel[]
}

export type DuplicateGroup = { data: Row[]; 重复性说明?: string }

export type DuplicateSection = {
  key: string
  kind: 'duplicate'
  title: string
  icon: SectionIcon
  badge: string
  groups: DuplicateGroup[]
}

export type Section = TableSection | NestedSection | DuplicateSection

export type SectionShape = 'empty' | 'metrics' | 'table' | 'nested' | 'duplicate' | 'rows' | 'raw' | 'mixed'

const ICONS: Record<'metrics' | 'table' | 'nested' | 'duplicate', SectionIcon> = {
  metrics: 'table',
  table: 'table',
  nested: 'nested',
  duplicate: 'duplicate',
}

/** 合并指标条在 collapsed 里的固定 key（指标不是 payload 的某个 key） */
export const METRICS_KEY = '__metrics__'

/** 合并后那唯一一条指标条的名字（只有一个分组，界面上不再显示分组标签） */
export const METRIC_GROUP_NAME = '指标'

/**
 * 指标展示顺序 —— **唯一来源**。
 *
 * 后端仍然按 P1 / P2 拆 key 返回，但页面上不再区分：所有指标合并成一条，
 * 顺序以本表为准，与接口返回的 key 顺序无关。
 * 表里没列到的指标（后端新增）排在已列出指标之后，并保持它们之间的接口返回顺序。
 */
export const METRIC_ORDER = [
  'AI处置量',
  'AI处置率',
  'AI关闭',
  'AI关单率',
  '人工关闭',
  '人工关单率',
  '自动化关闭',
  '自动化关单率',
  'AI未纳管',
  '告警总量',
]

/** 指标名 → 顺序位次（未列出的指标统一排在最后） */
const METRIC_INDEX = METRIC_ORDER.reduce<Record<string, number>>((map, name, index) => {
  map[name] = index
  return map
}, {})

export function orderMetrics(metrics: Metric[]): Metric[] {
  const fallback = METRIC_ORDER.length
  return (metrics || [])
    .map((metric, index) => ({ metric, index }))
    .sort((a, b) => {
      const ia = METRIC_INDEX[a.metric.key]
      const ib = METRIC_INDEX[b.metric.key]
      const ra = ia === undefined ? fallback : ia
      const rb = ib === undefined ? fallback : ib
      return ra === rb ? a.index - b.index : ra - rb
    })
    .map((item) => item.metric)
}

const SCALAR_TYPES = ['string', 'number', 'boolean']

export function isPlain(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

export function isScalar(value: unknown): boolean {
  return value === null || value === undefined || SCALAR_TYPES.indexOf(typeof value) > -1
}

/** 告警行数组：非空且元素都是对象 */
export function isRowArray(value: unknown): value is Row[] {
  return Array.isArray(value) && value.length > 0 && value.every(isPlain)
}

/** 重复性分析： [ { data: [告警行], 重复性说明 } ] */
export function isDuplicateGroups(value: unknown): value is DuplicateGroup[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((g) => isPlain(g) && Array.isArray(g.data) && '重复性说明' in g)
  )
}

/** 两级型： { 一级: { 二级: [告警行] } } */
export function isNestedGroups(value: unknown): value is Record<string, Record<string, Row[]>> {
  if (!isPlain(value)) return false
  const vals = Object.values(value)
  return vals.length > 0 && vals.every((x) => isPlain(x) && Object.values(x).every(Array.isArray))
}

/** 判定一个值的形态 */
export function shapeOf(value: unknown): SectionShape {
  if (Array.isArray(value)) {
    if (value.length === 0) return 'empty'
    if (isDuplicateGroups(value)) return 'duplicate'
    if (value.every(isPlain)) return 'rows'
    return 'raw'
  }
  if (!isPlain(value)) return 'raw'
  const vals = Object.values(value)
  if (vals.length === 0) return 'empty'
  if (vals.every(isScalar)) return 'metrics'
  if (vals.every(Array.isArray)) return 'table'
  if (isNestedGroups(value)) return 'nested'
  return 'mixed'
}

/**
 * 单个指标的展示态。
 * 无值（含空串）或 0（含 "0.0%"）算「没有数据」：灰色弱化，但仍展示。
 */
export function metricTone(raw: unknown): MetricTone {
  const empty = raw === undefined || raw === null || raw === ''
  if (empty) return 'muted'
  const num = Number(String(raw).replace('%', ''))
  return !isNaN(num) && num === 0 ? 'muted' : 'active'
}

/** { 指标名: 值 } → [ { key, value, display, tone } ]（保持原始顺序） */
export function toMetrics(obj: Record<string, unknown>): Metric[] {
  return Object.keys(obj || {}).map((key) => {
    const raw = obj[key]
    const empty = raw === undefined || raw === null || raw === ''
    return {
      key,
      value: raw,
      display: empty ? '-' : raw,
      tone: metricTone(raw),
    }
  })
}

/**
 * 分类列表 → 表格区块描述。
 *
 * 分类**按条数降序**：多的排前面。多分类时页面上渲染成一排 tab，
 * 顺序就是这里的顺序（从左到右由多到少）；单分类不受影响。
 * 条数相同的保持后端返回的先后（Array#sort 稳定）。
 */
function makeTableSection(key: string, lists: TableList[]): TableSection | null {
  const items = lists
    .map((l) => ({ name: l.name, rows: l.rows }))
    .sort((a, b) => b.rows.length - a.rows.length)
  if (items.length === 0) return null
  const total = items.reduce((sum, item) => sum + item.rows.length, 0)
  const single = items.length === 1
  return {
    key,
    kind: 'table',
    title: single && items[0].name !== key ? `${key} · ${items[0].name}` : key,
    icon: ICONS.table,
    badge: single ? `${total} 条` : `${items.length} 类 / ${total} 条`,
    lists: items,
  }
}

/**
 * 两级型 → 区块描述： levels[].groups[].rows[]
 *
 * 排序（都是**条数降序**，多的排前面）：
 *   - 一级 levels → 左侧竖排导航，从上到下由多到少；
 *   - 二级 groups（告警源）→ 横向 chip，从左到右由多到少（「全部」在组件里固定排最前）。
 * 条数相同的保持后端返回的先后（Array#sort 稳定）。
 */
function makeNestedSection(key: string, value: Record<string, Record<string, Row[]>>): NestedSection | null {
  const levels: NestedLevel[] = Object.keys(value).map((name) => ({
    name,
    groups: Object.keys(value[name] || {})
      .map((groupName) => ({
        name: groupName,
        rows: Array.isArray(value[name][groupName]) ? value[name][groupName].filter(isPlain) : [],
      }))
      .sort((a, b) => b.rows.length - a.rows.length),
  }))
  levels.sort((a, b) => levelRowCount(b) - levelRowCount(a))
  if (levels.length === 0) return null
  const total = levels.reduce(
    (sum, level) => sum + level.groups.reduce((s, group) => s + group.rows.length, 0),
    0,
  )
  return {
    key,
    kind: 'nested',
    title: key,
    icon: ICONS.nested,
    badge: `${levels.length} 类 / ${total} 条`,
    levels,
  }
}

/** 重复性分析 → 区块描述（只保留真有明细的分组） */
function makeDuplicateSection(key: string, groups: DuplicateGroup[]): DuplicateSection {
  const valid = groups.filter((g) => isPlain(g) && Array.isArray(g.data) && g.data.length > 0)
  const rows = valid.reduce((sum, g) => sum + g.data.length, 0)
  return {
    key,
    kind: 'duplicate',
    title: key,
    icon: ICONS.duplicate,
    badge: `${valid.length} 组 / ${rows} 条`,
    groups: valid,
  }
}

/**
 * 把接口载荷拆成「指标条 + 区块列表」。
 *
 * 指标永远排在最前面（先总览后明细），其余区块保持 payload 里的 key 顺序。
 * 指标不按 key 分组：后端照旧返回 P1 / P2 两个（或更多）指标型 key，
 * 这里把它们全部合并成同一条，顺序由 METRIC_ORDER 决定。
 */
export function buildSections(payload: unknown): { metricGroups: MetricGroup[]; sections: Section[] } {
  const sections: Section[] = []
  const metrics: Record<string, unknown> = {}
  if (!isPlain(payload)) return { metricGroups: [], sections }

  const pushList = (key: string, lists: TableList[]) => {
    const section = makeTableSection(key, lists)
    if (section) sections.push(section)
  }
  const pushNested = (key: string, value: Record<string, Record<string, Row[]>>) => {
    const section = makeNestedSection(key, value)
    if (section) sections.push(section)
  }

  Object.keys(payload).forEach((key) => {
    const value = payload[key]
    const shape = shapeOf(value)

    if (shape === 'empty' || shape === 'raw') return

    if (shape === 'metrics') {
      Object.keys(value as Record<string, unknown>).forEach((name) => {
        metrics[name] = (value as Record<string, unknown>)[name]
      })
      return
    }
    if (shape === 'table') {
      const table = value as Record<string, Row[]>
      pushList(
        key,
        Object.keys(table).map((name) => ({ name, rows: table[name].filter(isPlain) })),
      )
      return
    }
    if (shape === 'rows') {
      pushList(key, [{ name: key, rows: (value as Row[]).filter(isPlain) }])
      return
    }
    if (shape === 'nested') {
      pushNested(key, value as Record<string, Record<string, Row[]>>)
      return
    }
    if (shape === 'duplicate') {
      sections.push(makeDuplicateSection(key, value as DuplicateGroup[]))
      return
    }

    // mixed：同一个 key 下混着标量 / 数组 / 两级对象 —— 逐子项拆到对应位置，不丢数据
    const lists: TableList[] = []
    // 这里存的是「子项名 → 两级对象」，所以比 pushNested 期望的多一层。
    // 与 RuoYi 的 shape.js 保持一致：混合型里的两级子项会被当作一级、其下的
    // 对象当作二级（Array.isArray 为 false → 落成空行），属于原实现的既有行为。
    const nested: Record<string, Record<string, Record<string, Row[]>>> = {}
    Object.keys(value as Record<string, unknown>).forEach((subKey) => {
      const sub = (value as Record<string, unknown>)[subKey]
      if (isScalar(sub)) {
        metrics[subKey] = sub
      } else if (Array.isArray(sub)) {
        lists.push({ name: subKey, rows: sub.filter(isPlain) })
      } else if (isNestedGroups(sub)) {
        nested[subKey] = sub
      }
    })
    if (lists.length > 0) pushList(key, lists)
    if (Object.keys(nested).length > 0) {
      pushNested(key, nested as unknown as Record<string, Record<string, Row[]>>)
    }
  })

  // 所有指标合并成唯一一条（不再分组），顺序按 METRIC_ORDER
  const merged = orderMetrics(toMetrics(metrics))
  const metricGroups = merged.length > 0 ? [{ name: METRIC_GROUP_NAME, metrics: merged }] : []
  return { metricGroups, sections }
}

/** 某个区块里的告警条数（duplicate 按明细行数算） */
export function sectionRowCount(section: Section | null): number {
  if (!section) return 0
  if (section.kind === 'table') {
    return section.lists.reduce((sum, list) => sum + list.rows.length, 0)
  }
  if (section.kind === 'nested') {
    return section.levels.reduce(
      (sum, level) => sum + level.groups.reduce((s, group) => s + group.rows.length, 0),
      0,
    )
  }
  if (section.kind === 'duplicate') {
    return section.groups.reduce((sum, group) => sum + group.data.length, 0)
  }
  return 0
}

/** 二级筛选的「全部」哨兵值（把某个一级下的所有告警源合并展示） */
export const ALL_GROUPS = '__all__'

/** 某个一级（nested 区块的 levels[i]）下的总条数 */
export function levelRowCount(level: NestedLevel | null | undefined): number {
  return ((level && level.groups) || []).reduce((sum, group) => sum + group.rows.length, 0)
}

/**
 * 按二级筛选值把某个一级下的告警源分组拍平成行。
 *
 * `filter` 为空 / `ALL_GROUPS` → 全部；
 * 筛选值已失效（数据刷新后那个告警源没了）→ 也退回全部，避免用户看到空表却不知道为什么。
 */
export function flattenLevel(level: NestedLevel | null | undefined, filter: string): Row[] {
  const groups = (level && level.groups) || []
  const all = () => groups.reduce<Row[]>((acc, group) => acc.concat(group.rows), [])
  if (!filter || filter === ALL_GROUPS) return all()
  const hit = groups.find((group) => group.name === filter)
  return hit ? hit.rows : all()
}

/** 查询表单（页面上的四个字段） */
export type QueryForm = { systemId: string; teamName: string; dateRange: string[] }

/** 接口查询参数 */
export type QueryParams = {
  systemId?: string
  teamName: string
  startDate: string
  endDate: string
}

/**
 * 组装查询参数。
 *
 * ⚠️ 系统 ID 是**选填**的：用户没填时**不要带 `systemId` 字段**（不是空串，是压根没有这个 key）。
 *
 * 组别 `teamName` 相反 —— 下拉框始终有值（历史数据页默认「全量」，字典
 * `dict_system_group` 里的真实取值），它本身就是一个有效的筛选语义
 * （= 不按组别过滤），所以**始终带上**，不做「空就不带」的处理。
 */
export function buildQueryParams(form: QueryForm): QueryParams {
  const src = form || ({} as QueryForm)
  const range = Array.isArray(src.dateRange) ? src.dateRange : []
  const params: QueryParams = { teamName: '', startDate: '', endDate: '' }
  const systemId = String(src.systemId === undefined || src.systemId === null ? '' : src.systemId).trim()
  if (systemId) params.systemId = systemId
  params.teamName = String(src.teamName === undefined || src.teamName === null ? '' : src.teamName).trim()
  params.startDate = range[0] || ''
  params.endDate = range[1] || ''
  return params
}

/**
 * 一级 tab 的语义色调（用于标题前的小圆点）：
 *   成功 / SUCCESS / OK  → ok（绿）
 *   失败 / FAIL          → bad（红）
 *   重放 / ERROR / REPLAY → warn（橙）
 *   其它                 → info（蓝）
 *
 * 顺序不能换：`HANDLED_ERROR_REPLAY` 里既有 ERROR 也不含「成功/失败」，
 * 只有把「成功 → 失败 → 重放」按这个次序判，它才会落到 warn。
 */
export type LevelTone = 'ok' | 'bad' | 'warn' | 'info'

export function levelTone(name: string | undefined | null): LevelTone {
  const text = String(name === undefined || name === null ? '' : name)
  if (/成功|SUCCESS|OK|PASS/i.test(text)) return 'ok'
  if (/失败|FAIL/i.test(text)) return 'bad'
  if (/重放|ERROR|REPLAY/i.test(text)) return 'warn'
  return 'info'
}

export const shape = {
  METRICS_KEY,
  METRIC_GROUP_NAME,
  METRIC_ORDER,
  ALL_GROUPS,
  isPlain,
  isScalar,
  isRowArray,
  isDuplicateGroups,
  isNestedGroups,
  shapeOf,
  metricTone,
  toMetrics,
  orderMetrics,
  buildSections,
  sectionRowCount,
  levelRowCount,
  flattenLevel,
  buildQueryParams,
  levelTone,
}

export default shape
