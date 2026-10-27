import fs from 'fs'

const SRC = 'E:/code/2026/RuoYi-Vue-master/RuoYi-Vue-master/ruoyi-ui/mockData/res.js'
const OUT = 'E:/code/2026/four/alert/src/history/mode1/mock-data.json'

let src = fs.readFileSync(SRC, 'utf8')
src = src.replace(/export\s*\{[\s\S]*?\}\s*;?\s*$/, '')
const fn = new Function(src + '; return { analyzeRes };')
const { analyzeRes } = fn()

const KEEP = 3 // 每个分组/分类保留的告警行数

function trimRows(rows) {
  return (Array.isArray(rows) ? rows : []).slice(0, KEEP)
}

const out = {}

// 指标型：原样保留
out.P1 = analyzeRes.P1
out.P2 = analyzeRes.P2

// 两级型 AI处置：{ 一级: { 二级: [行] } }
out['AI处置'] = {}
for (const level of Object.keys(analyzeRes['AI处置'])) {
  out['AI处置'][level] = {}
  for (const group of Object.keys(analyzeRes['AI处置'][level])) {
    out['AI处置'][level][group] = trimRows(analyzeRes['AI处置'][level][group])
  }
}

// 表格型
for (const key of ['P3', '人工关单', '自动化关单']) {
  out[key] = {}
  for (const cat of Object.keys(analyzeRes[key])) {
    out[key][cat] = trimRows(analyzeRes[key][cat])
  }
}

// 重复型
out['重复性分析'] = analyzeRes['重复性分析'].map((group) => ({
  ...group,
  data: trimRows(group.data),
}))

const json = JSON.stringify(out, null, 2)
fs.writeFileSync(OUT, json, 'utf8')
console.log('written', OUT, json.length, 'bytes')
for (const k of Object.keys(out)) {
  console.log(' ', k, JSON.stringify(out[k]).length)
}
