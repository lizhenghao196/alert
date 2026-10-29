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
  /**
   * 告警原因描述。接口可能带回来（之前已经关过单、或事件里带了原因），
   * 有值就用来预填关单弹窗里的「告警原因描述」，没有就留空让用户自己写。
   */
  reason?: string
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

/*
 * 这里原本还有一个 isAlert() 守卫，和 api.ts 里的字段校验是两份重复实现。
 * 两份规则各改各的，正是「接口明明有返回、前端却判定格式异常」的温床，
 * 已经删掉：字段校验 + 归一化统一放在 api.ts 的 normalizeAlert 里。
 */
