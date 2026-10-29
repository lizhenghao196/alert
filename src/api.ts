import type { Alert, Selection } from './types'

export type QueryResult = { items: Alert[]; simulated: boolean }

/**
 * 接口层自己抛的错误：带业务语义，轮询那边会把 message 原样显示给用户。
 * 区分它和 fetch 的网络错误（TypeError: Failed to fetch）——后者不该把
 * 英文原文甩到界面上。
 */
export class ApiError extends Error {}

const ENDPOINT = '/ongoing-alerts-api/event/queryiongoingevent'

export async function queryOngoingAlerts(
  filters: Selection,
  signal?: AbortSignal,
): Promise<QueryResult> {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    credentials: 'omit',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(filters),
  })
  if (!response.ok) throw new ApiError(`查询失败 (${response.status})`)
  const items: unknown = await response.json()
  if (!Array.isArray(items)) throw new ApiError('返回格式异常：接口返回的不是数组')
  return {
    items: items.map(normalizeAlert),
    simulated: response.headers.get('X-Alert-Data-Source') === 'mock',
  }
}

/**
 * 关闭告警的提交接口。
 * 字段名：misinfoReason / reason / recover / forceReason / processDesc / impact。
 */
const CLOSE_ENDPOINT = '/proxy/event_handle/closeAlertByMan'

/** 告警是否恢复的三个取值，直接作为 recover 的字符串提交 */
export type RecoverStatus = '未经处置自行恢复' | '未恢复' | '经处置恢复'

export type CloseAlertPayload = {
  /** 告警单号，后端靠它定位要关的是哪一条 */
  alertKey: string
  /** 告警原因类别（下拉） */
  misinfoReason: string
  /** 告警原因描述，不少于 10 个字 */
  reason: string
  /** 告警是否恢复：三选一的字符串，不是布尔 */
  recover: RecoverStatus
  /** 关单理由：仅 recover === '未恢复' 时填写，其余情况传空串 */
  forceReason: string
  /** 处置说明：仅 recover === '经处置恢复' 时填写，其余情况传空串 */
  processDesc: string
  /** 告警影响评估，默认「无业务影响」 */
  impact: string
}

/**
 * 关闭告警的返回。
 * 生产上后端把真正的结果又套了一层 msg：{ msg: { code, message, result } }，
 * 这里已经拆好，调用方只看 ok + msg 就行。
 */
export type CloseAlertResult = {
  /** code === 0 才算成功；拿不到 code 时按成功处理（兼容空响应体） */
  ok: boolean
  /** 提示文案，直接展示给用户 */
  msg: string
}

/** 数字或数字字符串都收成 number，拿不到就是 undefined */
function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
    return Number(value)
  }
  return undefined
}

/**
 * 生产返回 { msg: { code, message, result } }，也兼容扁平的 { code, message }
 * 和更早的 { msg: '一句话' }，统一取到真正装着结果的那一层。
 */
function unwrapCloseBody(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object') return {}
  const outer = raw as Record<string, unknown>
  const inner = outer.msg
  if (inner && typeof inner === 'object') return inner as Record<string, unknown>
  return outer
}

export async function closeAlert(
  payload: CloseAlertPayload,
  signal?: AbortSignal,
): Promise<CloseAlertResult> {
  const response = await fetch(CLOSE_ENDPOINT, {
    method: 'POST',
    credentials: 'omit',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) throw new ApiError(`提交失败 (${response.status})，请稍后重试。`)

  // 空响应体、或者结构对不上，都按「已成功但没有文案」处理，
  // 不能因为解析失败把成功当失败。
  try {
    const body = unwrapCloseBody(await response.json())
    const code = toNumber(body.code)
    const ok = code === undefined ? true : code === 0
    const text =
      typeof body.message === 'string' && body.message.trim()
        ? body.message.trim()
        : // 兼容只有 msg 字符串的老结构
          typeof body.msg === 'string' && body.msg.trim()
          ? body.msg.trim()
          : ''
    return { ok, msg: text || (ok ? '告警已关闭' : '关闭告警失败，请稍后重试。') }
  } catch {
    /* 解析失败：没有响应体也算成功 */
  }
  return { ok: true, msg: '告警已关闭' }
}

/** 必须有值的字段：缺了/类型不对，这张卡片根本渲染不出来 */
const REQUIRED_STRING_FIELDS = ['alertKey', 'systemId', 'href', 'msg', 'summary'] as const

/**
 * 可选字段一律收成 string | undefined。
 *
 * 关键点：后端会把「没有值」的可选字段序列化成 null，而不是干脆不返回这个键。
 * 之前这里写的是 `row.reason === undefined || typeof row.reason === 'string'`，
 * 生产上 reason 返回 null 时 `typeof null === 'object'`，整页就被判成
 * 「返回格式异常」，前端只显示一句"查询失败，请检查服务连接"——数据其实好端端的。
 */
function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

/**
 * 校验并归一化单条告警。可选字段宽松处理（null / 缺失 / 类型不对都当没有），
 * 只有必填字段坏了才抛错，并且把是第几条、哪个字段说清楚，免得下次线上再
 * 出一句看不出原因的"查询失败"。
 */
function normalizeAlert(value: unknown, index: number): Alert {
  if (!value || typeof value !== 'object') {
    throw new ApiError(`返回格式异常：第 ${index + 1} 条不是对象`)
  }
  const row = value as Record<string, unknown>
  for (const field of REQUIRED_STRING_FIELDS) {
    if (typeof row[field] !== 'string') {
      throw new ApiError(`返回格式异常：第 ${index + 1} 条的 ${field} 字段不是字符串`)
    }
  }
  if (typeof row.code !== 'number' || !Number.isInteger(row.code)) {
    throw new ApiError(`返回格式异常：第 ${index + 1} 条的 code 字段不是整数`)
  }

  return {
    alertKey: row.alertKey as string,
    systemId: row.systemId as string,
    href: row.href as string,
    msg: row.msg as string,
    summary: row.summary as string,
    code: row.code,
    type: optionalString(row.type),
    event_url: optionalString(row.event_url),
    alertTime: optionalString(row.alertTime),
    assignee: optionalString(row.assignee),
    reason: optionalString(row.reason),
  }
}