import { pickPayload } from '../../src/history/mode1/api'
import { buildSections } from '../../src/history/mode1/shape'

/** 生产接口真实返回（照抄自浏览器 Network → Response 面板，没有任何 data/rows 包装） */
const REAL_PAYLOAD = {
  AI处置: {
    关闭成功: {
      '10104': [
        {
          alertKey: 'ALT-20261009-001',
          systemId: 'AUTH',
          summary: '系统授权交易,指标:网联银联交易成功率,降为零',
          misinfoReason: '性能指标告警',
          alertReasonDesc: '总行交易告警',
          AgentTrace: [{ expert: '告警根因分析专家', callTime: '2026-10-09 10:00:00', reason: '测试', skillName: ['SOP'] }],
          output: '### 告警概述\n测试内容',
          runId: 'run-1',
        },
      ],
    },
  },
  P1: {
    AI关闭: 1,
    AI处置量: 1,
    AI未纳管: 0,
    人工关单率: '0.0%',
    人工关闭: 0,
    告警总量: 1,
    自动化关单率: '0.0%',
    自动化关闭: 0,
  },
  P2: { AI关单率: '100.0%', AI处置率: '100.0%' },
  人工关单: {},
  P3: {
    原因不明: [
      {
        alertKey: 'ALT-20261009-002',
        systemId: 'CORE',
        summary: '系统新核心,指标:联机交易量,降幅超85%',
        misinfoReason: '性能指标告警',
        alertReasonDesc: '总行交易告警',
      },
    ],
  },
  自动化关单: {},
}

function describe(res: unknown): string {
  const picked = pickPayload(res)
  const built = buildSections(picked)
  const metrics = built.metricGroups.reduce((n, g) => n + g.metrics.length, 0)
  const sections = built.sections.map((s) => {
    if (s.kind === 'table') return `table:${s.key}(${s.lists.map((l) => `${l.name}=${l.rows.length}`).join(',')})`
    if (s.kind === 'nested') return `nested:${s.key}(${s.levels.length}级)`
    return `duplicate:${s.key}(${s.groups.length}组)`
  })
  return `payload=${picked === null ? 'null' : typeof picked} | 指标${metrics}项 | 区块[${sections.join(' ')}]`
}

console.log('1) 真实接口：裸载荷')
console.log('   ', describe(REAL_PAYLOAD))

console.log('2) RuoYi 包装 {code,msg,data}')
console.log('   ', describe({ code: 200, msg: 'success', data: REAL_PAYLOAD }))

console.log('3) rows 包装')
console.log('   ', describe({ code: 200, rows: REAL_PAYLOAD }))

console.log('4) 空包装 {code,msg}（无载荷）')
console.log('   ', describe({ code: 500, msg: '内部错误' }))

console.log('5) null / 非对象')
console.log('   ', describe(null))
console.log('   ', describe('oops'))
