/**
 * 历史数据页的数据源开关 —— **改这一个变量**就能在「本地 mock」和「真实接口」之间切换。
 *
 *   USE_MOCK = true   → 模式一 / 模式二 都返回本地 mock 数据（当前联调不通时的默认值）
 *   USE_MOCK = false  → 两个模式都请求真实接口（地址见 REAL_ENDPOINTS）
 *
 * 改完保存即可生效（Vite 热更新），不需要动其它任何文件。
 */
export const USE_MOCK = false

/**
 * 真实接口地址（仅在 USE_MOCK = false 时使用）。
 *
 * 两个接口的参数完全一致，都是 POST + JSON body：
 *   teamName / startDate / endDate / systemId?
 * （systemId 为空时**不带这个字段**，见 history/query.ts 的 buildRequestBody）
 *
 * ⚠️ 模式一那条走的是 `/monthly-report-api` 前缀的反代。本仓库（alert-screen）
 * 需要在 `deploy/nginx-alert-screen.conf` 里补一段对应前缀的 location，
 * 否则请求会落到站点兜底（拿到 index.html）而不是后端。
 */
export const REAL_ENDPOINTS = {
  /** 模式一：告警分析（POST，JSON body） */
  alarmAnalysis: '/monthly-report-api/osenv/cap/event/analyze',
  /** 模式二：历史关单明细（POST，JSON body） */
  closedEvents: '/proxy/event_mgm/event/query/closed',
}
