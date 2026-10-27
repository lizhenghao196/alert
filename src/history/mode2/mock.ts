import type { Alert } from '../../types'

/**
 * 历史关单明细的 mock 数据。
 *
 * 字段与实时观测页模式二完全一致（见 src/types.ts 的 Alert）：
 *   alertKey / systemId / href / msg / summary / code / type? / event_url? /
 *   alertTime? / assignee?
 * code：1 = 异常（ABN）、0 = 正常（OK），与实时页同一套语义。
 *
 * `msg` 是告警报告（markdown），由 mode2 的「报告」按钮弹窗渲染。
 *
 * 数据是**按模板批量生成**的（640 条，跨最近约 27 天），用来观察分页 / 多行 / 滚动
 * 的效果；生成过程用了一个稳定的伪随机函数（同一个 i 永远得到同一个值），
 * 所以每次渲染结果一致，不会因为重渲染而跳数据。要改条数只动 `TOTAL` / `GAP_MINUTES`。
 */

const EVENT_URL_PREFIX = 'http://alt.eprod-kzx1.cncb/#/jiraAlertInfo?alertKey='

function report(input: {
  alertKey: string
  systemId: string
  summary: string
  alertTime: string
  assignee: string
}): string {
  return `### 告警概述
告警内容：${input.summary}
告警时间：${input.alertTime}
告警编号：${input.alertKey}
所属系统：${input.systemId}

### 根因定位
根因组件：${input.systemId} 应用层
根因描述：结合指标趋势、日志与调用链，定位为该组件在关单窗口内的指标抖动，已由值班人员确认恢复。
置信度：medium

### 处置结论
处置结果：已关单
处置人：${input.assignee}
处置说明：业务指标连续多个检测周期回到阈值区间内，满足恢复条件，按既定策略关闭该告警。
`
}

type SystemSeed = { id: string; name: string }

const SYSTEMS: SystemSeed[] = [
  { id: 'AUTH', name: '系统授权交易' },
  { id: 'CORE', name: '系统新核心' },
  { id: 'LMP', name: '系统贷款管理平台' },
  { id: 'DASP', name: '系统数据服务平台' },
  { id: 'PAYBNK', name: '系统支付网关' },
  { id: 'NET-GW', name: '系统网络网关' },
  { id: 'BATCH', name: '系统批量调度平台' },
  { id: 'MSG', name: '系统消息中心' },
  { id: 'RISK', name: '系统风控引擎' },
  { id: 'CARD', name: '系统卡管理平台' },
]

type MetricSeed = {
  name: string
  /** low = 低于下限告警，high = 超过上限告警 */
  direction: 'low' | 'high'
  unit: string
  threshold: number
  /** 实际值保留几位小数 */
  decimals: number
  /**
   * 实际值的取值范围 [min, max]，**显式给死**（都落在阈值外侧，即确实越限）。
   * 不按阈值算比例：否则百分比类指标（CPU / 磁盘 / JVM）会算出 110%+ 这种不真实的值。
   */
  range: [number, number]
}

const METRICS: MetricSeed[] = [
  { name: '网联银联交易成功率', direction: 'low', unit: '', threshold: 99.5, decimals: 1, range: [72, 99.2] },
  { name: '联机交易量', direction: 'low', unit: '', threshold: 3000, decimals: 0, range: [420, 2950] },
  { name: '接口成功率', direction: 'low', unit: '', threshold: 99.5, decimals: 1, range: [88.4, 99.3] },
  { name: '通道可用率', direction: 'low', unit: '', threshold: 99.9, decimals: 1, range: [95.2, 99.8] },
  { name: '磁盘使用率', direction: 'high', unit: '', threshold: 85, decimals: 1, range: [86.1, 98.7] },
  { name: '平均响应时间', direction: 'high', unit: 'ms', threshold: 800, decimals: 0, range: [820, 3600] },
  { name: '专线丢包率', direction: 'high', unit: '%', threshold: 0.5, decimals: 1, range: [0.6, 4.8] },
  { name: '失败笔数', direction: 'high', unit: '', threshold: 50, decimals: 0, range: [52, 860] },
  { name: '数据库会话数', direction: 'high', unit: '', threshold: 1200, decimals: 0, range: [1210, 2400] },
  { name: '批量作业耗时', direction: 'high', unit: 's', threshold: 1800, decimals: 0, range: [1850, 5400] },
  { name: '任务积压数', direction: 'high', unit: '', threshold: 200, decimals: 0, range: [205, 1800] },
  { name: '出口带宽使用率', direction: 'high', unit: '', threshold: 75, decimals: 1, range: [76.2, 98.4] },
  { name: 'CPU 使用率', direction: 'high', unit: '', threshold: 80, decimals: 1, range: [81.3, 99.2] },
  { name: 'JVM 老年代使用率', direction: 'high', unit: '', threshold: 85, decimals: 1, range: [86.0, 98.6] },
  { name: 'MQ 消息堆积量', direction: 'high', unit: '', threshold: 5000, decimals: 0, range: [5200, 42000] },
  { name: '连接池等待数', direction: 'high', unit: '', threshold: 30, decimals: 0, range: [32, 260] },
]

const TYPES = ['性能指标告警', '业务指标告警', '可用性告警', '容量告警', '安全告警']

const ASSIGNEES = [
  '刘兴贵1(19129506274)',
  '周航(13800001234)',
  '陈立(13900002345)',
  '王倩(13700003456)',
  '赵敏(13600004567)',
  '孙洋(13500005678)',
  '李可(13400006789)',
  '吴迪(13300007890)',
]

/**
 * 总条数与相邻两条的间隔（分钟）。
 * 640 条 × 60min ≈ 27 天 —— 贴近「最近 30 天」这类查询的量级（300~1000 条），
 * 用来观察前端分页效果。要改条数只动 `TOTAL` 即可。
 *
 * ⚠️ 这里的行是**运行时**由 buildRows() 生成的（不是打包进 bundle 的静态数组），
 * 所以条数调大不会让产物体积明显变大。
 */
const TOTAL = 640
const GAP_MINUTES = 60

/** 稳定的伪随机（同一个 seed 永远得到同一个值），避免重渲染时数据跳动 */
function rand(seed: number): number {
  const value = Math.sin(seed * 12.9898) * 43758.5453
  return value - Math.floor(value)
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function formatTime(date: Date): string {
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  )
}

function buildRows(): Alert[] {
  const rows: Alert[] = []
  // 锚点取「当前整分钟」，往前按 GAP_MINUTES 递推 —— 所以数据永远落在最近 7 天内，
  // 不会随时间推移变成一堆「很久以前」的记录。
  const anchor = new Date()
  anchor.setSeconds(0, 0)

  for (let i = 0; i < TOTAL; i += 1) {
    const system = SYSTEMS[i % SYSTEMS.length]
    const metric = METRICS[(i * 5) % METRICS.length]
    const type = TYPES[(i * 3) % TYPES.length]
    const assignee = ASSIGNEES[(i * 7) % ASSIGNEES.length]

    const time = new Date(anchor.getTime() - i * GAP_MINUTES * 60 * 1000)
    const alertTime = formatTime(time)
    const alertKey = `ALT-${time.getFullYear()}${pad(time.getMonth() + 1)}${pad(time.getDate())}-${100 + i}`

    // 实际值在给定区间里取一个伪随机的点（不同行有差异，免得 96 条像复制粘贴）
    const [min, max] = metric.range
    const actual = (min + rand(i + 1) * (max - min)).toFixed(metric.decimals)
    const bound = metric.direction === 'high' ? '阈值上限' : '阈值下限'
    const verb = metric.direction === 'high' ? '超过阈值' : '低于阈值'
    const summary =
      `${system.name},指标:${metric.name},${verb},` +
      `${bound}:${metric.threshold}${metric.unit},实际值${actual}${metric.unit}`

    const href = EVENT_URL_PREFIX + encodeURIComponent(alertKey)
    rows.push({
      alertKey,
      systemId: system.id,
      href,
      summary,
      code: i % 3 === 0 ? 0 : 1,
      type,
      alertTime,
      assignee,
      event_url: href,
      msg: report({ alertKey, systemId: system.id, summary, alertTime, assignee }),
    })
  }

  return rows
}

const ROWS: Alert[] = buildRows()

/**
 * 返回历史关单明细。
 *
 * mock 不做筛选（真实接口由后端按 teamName / startDate / endDate / systemId 过滤），
 * 但把 systemId 命中优先排前，方便验证「按系统查询」的交互效果。
 */
export function mockClosedEvents(systemId: string): Alert[] {
  const key = String(systemId || '').trim().toUpperCase()
  const rows = ROWS.map((row) => ({ ...row }))
  if (!key) return rows
  return rows.sort((a, b) => Number(b.systemId === key) - Number(a.systemId === key))
}

export default mockClosedEvents
