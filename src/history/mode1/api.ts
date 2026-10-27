import { REAL_ENDPOINTS, USE_MOCK } from '../config'
import { buildRequestBody } from '../query'
import mockData from './mock-data.json'
import type { QueryParams } from './shape'

export type AnalyzeResponse = { code: number; msg: string; data: unknown }

/**
 * 取接口载荷。
 *
 * 三种情况都要认：
 *
 *   1. RuoYi 风格包装：`{ code, msg, data }` → 取 `data`
 *   2. 同上但字段名是 `rows`：`{ ..., rows }` → 取 `rows`
 *   3. **直接返回载荷本身** —— 真实接口
 *      `/monthly-report-api/osenv/cap/event/analyze` 就是这种：
 *      顶层直接是 `AI处置 / P1 / P2 / 人工关单 / P3 / 自动化关单` 这些区块 key，
 *      没有 `data` / `rows` 包装。
 *
 * ⚠️ 第 3 种如果不处理（老版本只认 data/rows，会返回 null），
 * 页面就会「接口明明有数据、却显示当前查询条件下暂无告警数据」。
 *
 * 另外排除掉形如 `{ code, msg }` 且没有 data/rows 的空包装体（那种情况是没载荷）。
 */
export function pickPayload(res: unknown): unknown {
  if (!res || typeof res !== 'object') return null
  const row = res as Record<string, unknown>
  if (row.data !== undefined && row.data !== null) return row.data
  if (row.rows !== undefined && row.rows !== null) return row.rows
  // 没有 data / rows：载荷就是响应本身
  const isWrapper = 'code' in row && 'msg' in row && !('data' in row) && !('rows' in row)
  return isWrapper ? null : row
}

/**
 * 获取告警分析数据。
 *
 * 数据源由 `history/config.ts` 的 **USE_MOCK** 决定：
 *   true  → 返回本地 mock（由 RuoYi 的 `mockData/res.js` 抽取，每分组保留前若干条），
 *           形态与真实接口一致：P1/P2 指标型、P3/人工关单/自动化关单 表格型、
 *           AI处置 两级型、重复性分析 重复型。查询条件只透传，mock 不做筛选。
 *   false → 请求真实接口（地址见 REAL_ENDPOINTS.alarmAnalysis）。
 *
 * 真实接口是 **POST**，JSON body：teamName / startDate / endDate / systemId?
 * （`systemId` 为空时整个字段不出现，与模式二同一条规则，见 buildRequestBody）。
 */
export function getAlarmAnalysis(params: QueryParams): Promise<AnalyzeResponse> {
  if (USE_MOCK) {
    return new Promise((resolve) => {
      window.setTimeout(() => {
        resolve({
          code: 200,
          msg: 'success',
          data: JSON.parse(JSON.stringify(mockData)),
        })
      }, 300)
    })
  }

  return fetch(REAL_ENDPOINTS.alarmAnalysis, {
    method: 'POST',
    credentials: 'omit',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildRequestBody(params)),
  }).then((response) => {
    if (!response.ok) throw new Error(`查询失败 (${response.status})`)
    return response.json() as Promise<AnalyzeResponse>
  })
}
