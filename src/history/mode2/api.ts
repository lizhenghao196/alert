import { REAL_ENDPOINTS, USE_MOCK } from '../config'
import { buildRequestBody } from '../query'
import { mockClosedEvents } from './mock'
import type { Alert } from '../../types'

/**
 * 历史关单明细接口。
 *
 * 路径：`/proxy/event_mgm/event/query/closed`（**POST**，JSON body）
 * 参数：teamName / startDate / endDate / systemId（均可选）
 *       ⚠️ `systemId` 为空时**不带这个字段**（不是传空串，是压根没有这个 key），
 *          与模式一 / `buildRequestBody` 同一条规则。
 * 返回：与实时观测页模式二完全一致的告警数组（见 src/types.ts 的 Alert）
 *
 * 数据源由 `history/config.ts` 的 **USE_MOCK** 决定（true = 本地 mock）。
 */
export const CLOSED_ENDPOINT = REAL_ENDPOINTS.closedEvents

export type ClosedQuery = {
  teamName: string
  startDate: string
  endDate: string
  systemId: string
}

export type ClosedResult = { items: Alert[]; simulated: boolean }

/** 真实接口可能直接返回数组，也可能包在 data / rows 里 —— 都认 */
function pickItems(payload: unknown): Alert[] {
  if (Array.isArray(payload)) return payload as Alert[]
  if (payload && typeof payload === 'object') {
    const row = payload as Record<string, unknown>
    if (Array.isArray(row.data)) return row.data as Alert[]
    if (Array.isArray(row.rows)) return row.rows as Alert[]
  }
  return []
}

export function queryClosedEvents(query: ClosedQuery, signal?: AbortSignal): Promise<ClosedResult> {
  if (USE_MOCK) {
    return new Promise((resolve, reject) => {
      const timer = window.setTimeout(() => {
        resolve({ items: mockClosedEvents(query.systemId), simulated: true })
      }, 320)

      signal?.addEventListener('abort', () => {
        window.clearTimeout(timer)
        reject(new DOMException('Aborted', 'AbortError'))
      })
    })
  }

  return fetch(CLOSED_ENDPOINT, {
    method: 'POST',
    credentials: 'omit',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildRequestBody(query)),
  }).then((response) => {
    if (!response.ok) throw new Error(`查询失败 (${response.status})`)
    return response.json().then((payload: unknown) => ({
      items: pickItems(payload),
      simulated: false,
    }))
  })
}
