import { fmt } from './calendar'

/**
 * 历史数据页两个模式**共用**的查询条件与取值域。
 *
 * 需求：模式一里是什么参数，模式二就是什么参数 —— 所以状态提在 AppHistory 里，
 * 两个模式只负责渲染各自的 UI，读写的是同一份值。
 *
 * 接口参数也一致（模式一 / 模式二 都是 teamName + systemId + startDate + endDate）：
 *   模式一：/tool/alarmAnalysis/list        （systemId 选填，空则不传）
 *   模式二：/proxy/event_mgm/event/query/closed
 */

/**
 * 「组别」下拉的选项 —— 与 RuoYi 字典 `dict_system_group` 一致。
 *
 * ⚠️ 该字典 **label 与 value 完全相同**（都是中文文案本身），所以前端直接用
 * 文案做值：默认值直接写字典里的某项文案即可对上（历史数据默认「全量」，
 * 见下面的 DEFAULT_GROUP）。
 * 取值清单见需求图一（字典维护页的「字典标签 / 字典键值」两列）。
 */
export const SYSTEM_GROUPS = [
  '不限定组别',
  '全量',
  '应用SRE（交易）域',
  '应用SRE（外围）域',
  '基础平台域',
  '大数据域',
  '数据库域',
  '网络域',
  '安全域',
  '机房域',
] as const

/**
 * 默认组别 —— 历史数据页（两个模式共用）进入时默认选中的一项。
 *
 * ⚠️ 这里刻意用「全量」而不是字典第一项「不限定组别」：业务上历史数据默认看全量。
 * 它是字典 `dict_system_group` 里真实存在的取值，语义上同样是「不按组别过滤」。
 */
export const DEFAULT_GROUP = '全量'

/** 系统名/系统缩写：只允许英文 / 数字 / 中划线 / 下划线，并统一转成大写 */
export function normalizeSystemId(value: string): string {
  return String(value || '')
    .replace(/[^A-Za-z0-9_-]/g, '')
    .toUpperCase()
}

/** 两个模式共用的查询条件 */
export type HistoryQuery = {
  teamName: string
  systemId: string
  /** [startDate, endDate]，yyyy-MM-dd；空数组表示未选 */
  dateRange: string[]
}

/** 默认日期范围：今天 - 今天（需求：时间范围选择器默认就是当天） */
export function defaultRange(): string[] {
  const today = fmt(new Date())
  return [today, today]
}

/** 从共用条件里取起止日期（缺省为空串） */
export function rangeOf(query: HistoryQuery): { startDate: string; endDate: string } {
  const range = Array.isArray(query.dateRange) ? query.dateRange : []
  return { startDate: range[0] || '', endDate: range[1] || '' }
}

/**
 * 组装模式二的请求参数。
 *
 * 接口文档（图二）里四个参数都是「否（必填）」，所以这里四个都产出；
 * ⚠️ 但 `systemId` 为空时，**请求体里不带这个字段**（由本文件的 buildRequestBody 收口），
 * 与模式一的 `buildQueryParams` 同一条规则。
 */
export function buildClosedParams(query: HistoryQuery): {
  teamName: string
  startDate: string
  endDate: string
  systemId: string
} {
  const { startDate, endDate } = rangeOf(query)
  return {
    teamName: String(query.teamName || '').trim(),
    startDate,
    endDate,
    systemId: String(query.systemId || '').trim().toUpperCase(),
  }
}

/**
 * 组装真实接口的请求体（**模式一 / 模式二共用**，两个接口参数一致）。
 *
 * teamName / startDate / endDate 始终带上；
 * ⚠️ `systemId` 为空时**不带这个字段**（不是传空串，是压根没有这个 key）。
 */
export function buildRequestBody(input: {
  teamName?: string
  systemId?: string
  startDate?: string
  endDate?: string
}): Record<string, string> {
  const body: Record<string, string> = {
    teamName: String(input.teamName || '').trim(),
    startDate: input.startDate || '',
    endDate: input.endDate || '',
  }
  const systemId = String(input.systemId || '').trim().toUpperCase()
  if (systemId) body.systemId = systemId
  return body
}

/**
 * 两个模式组件共用的 props。
 *
 * 查询条件（组别 / 系统 / 日期范围）与查询工具栏都由 AppHistory 持有并渲染
 * （工具栏在 header 里，两个模式共用一份），所以这里只把**当前值**传下来，
 * 不再传 onChange —— 模式组件只负责拿条件去查自己的接口。
 *
 * 查询时机由两个字段共同决定（组件里 `useEffect(..., [active, queryTick])`）：
 *   - `active`：打开页面默认进模式一 → 模式一挂载即查一次（相当于 Vue 的 mounted）；
 *     之后每次切换模式，新进入的那个模式也会查一次。
 *   - `queryTick`：用户点「查询」或按回车时递增 → 当前可见的模式再查一次。
 *
 * 切换组别既不改 active 也不改 queryTick，所以不会触发查询。
 */
export type HistoryModeProps = {
  active: boolean
  /** 递增的「查询」信号：值一变就表示用户显式发起了查询 */
  queryTick: number
  teamName: string
  systemId: string
  dateRange: string[]
}

/**
 * 模式一上报给 header 的状态。
 *
 * header 上有两处信息来自模式一的查询结果：
 *   - 「一键收起 / 一键展开」按钮（显隐 + 文案）；
 *   - 「重复性分析 N 组」（原来在正文概览条里，现已挪到主题切换按钮旁边）。
 * 两者都随查询结果变化，所以合成一个对象上报，避免多个回调各自触发一次渲染。
 */
export type Mode1HeaderState = {
  /** 是否该显示「一键收起 / 一键展开」这颗按钮（模式一查过且查到了数据） */
  collapseVisible: boolean
  /** 当前是否已全部收起，用于决定按钮文案 */
  allCollapsed: boolean
  /** 重复性分析组数；0 表示本次结果里没有重复区块，header 上不展示 */
  duplicateGroups: number
}

/**
 * 模式一独有的两个额外 props。
 *
 * 「一键收起 / 一键展开」这颗按钮渲染在 header 上（跟查询工具栏同排），
 * 但它的状态（有没有数据、是否已全部收起）和动作都属于模式一，所以：
 *   - `onHeaderState`：模式一把状态上报给 AppHistory，由 AppHistory 决定渲不渲染；
 *     切到模式二时 AppHistory 会直接不渲染它们（**这就是「切换时的显示隐藏」**）。
 *   - `collapseTick`：AppHistory 点按钮时递增，模式一收到就执行一次全量收起/展开。
 */
export type HistoryMode1Props = HistoryModeProps & {
  collapseTick: number
  onHeaderState: (state: Mode1HeaderState) => void
}

