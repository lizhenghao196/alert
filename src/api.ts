import type { Alert, Selection } from './types'

export type QueryResult = { items: Alert[]; simulated: boolean }

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
  if (!response.ok) throw new Error(`查询失败 (${response.status})`)
  const items: unknown = await response.json()
  if (!Array.isArray(items) || !items.every((row) => isAlertLike(row))) {
    throw new Error('返回格式异常')
  }
  return {
    items: items as Alert[],
    simulated: response.headers.get('X-Alert-Data-Source') === 'mock',
  }
}

function isAlertLike(value: unknown): boolean {
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