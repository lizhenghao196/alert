export type Alert = {
  alertKey: string
  systemId: string
  href: string
  msg: string
  summary: string
  code: number
  type?: string
  /**
   * 点击告警编号跳转的事件详情地址。
   * 接口这一项是 snake_case，和相邻的 camelCase 字段不一致，这里如实照抄线上的键名，
   * 免得为了统一命名在 api.ts 里多一层映射。
   */
  event_url?: string
  /**
   * 告警发生时间，形如 "2026-10-08 10:33:05"。
   * 后端尚未上线该字段，先按可选处理：缺失时卡片显示占位符，不影响渲染。
   */
  alertTime?: string
  /**
   * 处理人，形如 "刘兴贵1(19129506274)"（姓名后跟括号包裹的手机号）。
   * 同样是待后端上线的新字段，可选。
   */
  assignee?: string
}

export type Selection = {
  teamName: string
  systemId: string
  frequency: number
}

export type FilterStatus = 'all' | 'abnormal' | 'normal'

export type FrequencyOption = { value: number; label: string }

export const FREQUENCY_OPTIONS: FrequencyOption[] = [
  { value: 0, label: '仅查询一次' },
  { value: 10, label: '每 10 秒' },
  { value: 30, label: '每 30 秒' },
  { value: 60, label: '每 1 分钟' },
  { value: 300, label: '每 5 分钟' },
]

export const TEAMS = [
  '全量',
  '应用SRE（交易）',
  '应用SRE（外围）',
  '大数据',
  '数据库',
  '网络',
]

export const STORAGE_KEY = 'alert-screen.last-selection'

export function frequencyLabel(value: number): string {
  return FREQUENCY_OPTIONS.find((opt) => opt.value === value)?.label ?? `${value} 秒`
}

export function isAlert(value: unknown): value is Alert {
  if (!value || typeof value !== 'object') return false
  const row = value as Record<string, unknown>
  return (
    typeof row.alertKey === 'string' &&
    typeof row.systemId === 'string' &&
    typeof row.href === 'string' &&
    typeof row.msg === 'string' &&
    typeof row.summary === 'string' &&
    typeof row.code === 'number' &&
    Number.isInteger(row.code) &&
    (row.type === undefined || typeof row.type === 'string') &&
    (row.event_url === undefined || typeof row.event_url === 'string') &&
    (row.alertTime === undefined || typeof row.alertTime === 'string') &&
    (row.assignee === undefined || typeof row.assignee === 'string')
  )
}