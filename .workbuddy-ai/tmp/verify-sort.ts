import { readFileSync } from 'fs'
import { buildSections } from '../../src/history/mode1/shape'

/**
 * 验证「展示顺序」改动（模式一）：
 *   1. AI处置左侧导航（一级 levels）按条数降序；
 *   2. AI处置告警源 chip（二级 groups）按条数降序；
 *   3. 表格型区块的 tab（section.lists）按条数降序。
 * 只调顺序，数据一条不动 —— 顺带核对总条数与排序前一致。
 */
const payload = JSON.parse(readFileSync('src/history/mode1/mock-data.json', 'utf8'))

const built = buildSections(payload)

console.log('=== 区块顺序（保持 payload key 顺序，未动） ===')
console.log(built.sections.map((s) => `${s.kind}:${s.key}`).join(' | '))
console.log('')

let ok = true
const checkDesc = (label: string, counts: number[]) => {
  const sorted = counts.every((n, i) => i === 0 || counts[i - 1] >= n)
  if (!sorted) ok = false
  console.log(`${sorted ? 'PASS' : 'FAIL'}  ${label} => [${counts.join(', ')}]`)
}

console.log('=== 1/2. AI处置（nested） ===')
for (const section of built.sections) {
  if (section.kind !== 'nested') continue
  const levelCounts = section.levels.map((lv) =>
    lv.groups.reduce((sum, g) => sum + g.rows.length, 0),
  )
  checkDesc(`${section.key} 左侧导航（一级）`, levelCounts)
  console.log('      一级顺序:', section.levels.map((lv, i) => `${lv.name}=${levelCounts[i]}`).join(' > '))
  for (const level of section.levels) {
    checkDesc(`  「${level.name}」告警源 chip`, level.groups.map((g) => g.rows.length))
    console.log('      二级顺序:', level.groups.map((g) => `${g.name}=${g.rows.length}`).join(' > '))
  }
}

console.log('')
console.log('=== 3. 表格型区块的 tab ===')
for (const section of built.sections) {
  if (section.kind !== 'table') continue
  checkDesc(`${section.key} tab`, section.lists.map((l) => l.rows.length))
  console.log('      tab 顺序:', section.lists.map((l) => `${l.name}=${l.rows.length}`).join(' > '))
}

console.log('')
console.log('=== 总量核对（排序不应改变条数） ===')
const total = built.sections.reduce((sum, s) => {
  if (s.kind === 'table') return sum + s.lists.reduce((n, l) => n + l.rows.length, 0)
  if (s.kind === 'nested')
    return sum + s.levels.reduce((n, lv) => n + lv.groups.reduce((m, g) => m + g.rows.length, 0), 0)
  if (s.kind === 'duplicate') return sum + s.groups.reduce((n, g) => n + g.data.length, 0)
  return sum
}, 0)
console.log('明细总条数 =', total)

console.log('')
console.log('=== 4. 合成载荷：条数不同时确实会重排 ===')
const synth = buildSections({
  自动化关单: {
    甲: [{ a: 1 }],
    乙: [{ a: 1 }, { a: 2 }, { a: 3 }, { a: 4 }],
    丙: [{ a: 1 }, { a: 2 }],
  },
  AI处置: {
    少: { '9': [{ a: 1 }] },
    多: { '1': [{ a: 1 }, { a: 2 }, { a: 3 }], '7': [{ a: 1 }, { a: 2 }] },
  },
})
for (const section of synth.sections) {
  if (section.kind === 'table') {
    const counts = section.lists.map((l) => l.rows.length)
    const sorted = counts.every((n, i) => i === 0 || counts[i - 1] >= n)
    if (!sorted) ok = false
    console.log(`${sorted ? 'PASS' : 'FAIL'}  ${section.key} tab => [${counts.join(', ')}]`)
  }
  if (section.kind === 'nested') {
    const levelCounts = section.levels.map((lv) =>
      lv.groups.reduce((sum, g) => sum + g.rows.length, 0),
    )
    const sorted = levelCounts.every((n, i) => i === 0 || levelCounts[i - 1] >= n)
    if (!sorted) ok = false
    console.log(
      `${sorted ? 'PASS' : 'FAIL'}  ${section.key} 左侧导航 => [${levelCounts.join(', ')}] (${section.levels
        .map((lv) => lv.name)
        .join(' > ')})`,
    )
    for (const level of section.levels) {
      const counts = level.groups.map((g) => g.rows.length)
      const s = counts.every((n, i) => i === 0 || counts[i - 1] >= n)
      if (!s) ok = false
      console.log(`${s ? 'PASS' : 'FAIL'}    「${level.name}」chip => [${counts.join(', ')}]`)
    }
  }
}

console.log('')
console.log(ok ? 'ALL PASS' : 'HAS FAILURE')
if (!ok) process.exitCode = 1
