async page => {
  const ANALYZE = {
    AI处置: { 关闭成功: { '10104': [{ alertKey: 'A-1', systemId: 'AUTH', summary: 's', misinfoReason: 'm', alertReasonDesc: 'r' }] } },
    P1: { AI关闭: 1, AI处置量: 1, 告警总量: 1 },
    P2: { AI关单率: '100.0%' },
    P3: { 原因不明: [{ alertKey: 'A-2', systemId: 'CORE', summary: 's2', misinfoReason: 'm', alertReasonDesc: 'r' }] },
  }
  const CLOSED = [
    { alertKey: 'ALT-101', systemId: 'AUTH', href: '', summary: '摘要内容', code: 1, type: '性能指标告警', msg: '### x' },
  ]

  await page.route('**/monthly-report-api/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ANALYZE) }),
  )
  await page.route('**/proxy/event_mgm/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(CLOSED) }),
  )

  await page.setViewportSize({ width: 1500, height: 700 })
  await page.goto('http://localhost:5173/alert-screen/history/')
  await page.waitForTimeout(1500)

  const box = async (sel) => {
    const b = await page.locator(sel).first().boundingBox()
    return b ? Math.round(b.width) : null
  }

  const result = {
    viewport: 1500,
    headerHeight: await page.locator('.history-header').evaluate((el) => Math.round(el.getBoundingClientRect().height)),
    teamWidth: await box('.aa-bar__team'),
    inputWidth: await box('.aa-input'),
    rangeWidth: await box('.aa-range'),
    // 工具栏内顺序：查询 之后紧跟 一键收起
    toolbarChildren: await page.locator('.aa-bar > *').evaluateAll((els) =>
      els.map((el) => el.className.split(' ')[0] || el.tagName),
    ),
    collapseBtnInToolbar: await page.locator('.aa-bar .aa-btn--plain').count(),
    headerOverflow: await page.locator('.history-header').evaluate((el) => el.scrollWidth > el.clientWidth + 1),
  }

  await page.screenshot({ path: 'w1.png' })

  // 1280 宽（常见笔记本）也不该溢出
  await page.setViewportSize({ width: 1280, height: 700 })
  await page.waitForTimeout(400)
  result.at1280 = {
    headerHeight: await page.locator('.history-header').evaluate((el) => Math.round(el.getBoundingClientRect().height)),
    inputWidth: await box('.aa-input'),
    rangeWidth: await box('.aa-range'),
    overflow: await page.locator('.history-header').evaluate((el) => el.scrollWidth > el.clientWidth + 1),
  }
  await page.screenshot({ path: 'w2-1280.png' })

  return JSON.stringify(result)
}
