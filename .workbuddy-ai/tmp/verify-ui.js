async page => {
  const ANALYZE = {
    AI处置: {
      关闭成功: {
        '10104': [
          { alertKey: 'ALT-20261009-001', systemId: 'AUTH', summary: '系统授权交易,指标:网联银联交易成功率,降为零', misinfoReason: '性能指标告警', alertReasonDesc: '总行交易告警', AgentTrace: [{ expert: '告警根因分析专家', callTime: '2026-10-09 10:00:00', reason: '测试', skillName: ['SOP'] }], output: '### 告警概述\n测试内容', runId: 'run-1' },
        ],
      },
    },
    P1: { AI关闭: 1, AI处置量: 1, AI未纳管: 0, 人工关单率: '0.0%', 人工关闭: 0, 告警总量: 1, 自动化关单率: '0.0%', 自动化关闭: 0 },
    P2: { AI关单率: '100.0%', AI处置率: '100.0%' },
    人工关单: {},
    P3: { 原因不明: [{ alertKey: 'ALT-20261009-002', systemId: 'CORE', summary: '系统新核心,指标:联机交易量,降幅超85%', misinfoReason: '性能指标告警', alertReasonDesc: '总行交易告警' }] },
    自动化关单: {},
  }

  const CLOSED = [
    { alertKey: 'ALT-20261009-101', systemId: 'AUTH', href: 'http://alt.eprod-kzx1.cncb/#/jiraAlertInfo?alertKey=ALT-20261009-101', summary: '系统授权交易,指标:网联银联交易成功率,降为零', code: 1, type: '性能指标告警', alertTime: '2026-10-09 09:12:41', assignee: '刘兴贵1(19129506274)', event_url: 'http://alt.eprod-kzx1.cncb/#/jiraAlertInfo?alertKey=ALT-20261009-101', msg: '### 告警概述\n关单明细测试' },
  ]

  await page.route('**/monthly-report-api/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ANALYZE) }),
  )
  await page.route('**/proxy/event_mgm/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(CLOSED) }),
  )

  await page.setViewportSize({ width: 1500, height: 820 })
  await page.goto('http://localhost:5173/alert-screen/history/')
  await page.waitForTimeout(1500)

  const headerHeight = await page.locator('.history-header').evaluate((el) => el.getBoundingClientRect().height)
  const headerChildren = await page.locator('.history-header > *').evaluateAll((els) =>
    els.map((el) => el.className || el.tagName),
  )
  const modesBox = await page.locator('.history-modes').boundingBox()
  const searchBox = await page.locator('.history-header__search').boundingBox()
  const btnText = await page.locator('.history-header .aa-btn--plain').innerText()
  const sectionsBefore = await page.locator('.aa-root .aa-cs__body').count()
  await page.screenshot({ path: 'k1-mode1.png' })

  // 点「一键收起」
  await page.click('.history-header .aa-btn--plain')
  await page.waitForTimeout(400)
  const sectionsAfter = await page.locator('.aa-root .aa-cs__body').count()
  const btnTextAfter = await page.locator('.history-header .aa-btn--plain').innerText()

  // 切到模式二：这颗按钮应该整颗消失
  await page.click('text=模式二')
  await page.waitForTimeout(900)
  const btnOnMode2 = await page.locator('.history-header .aa-btn--plain').count()
  await page.screenshot({ path: 'k2-mode2.png' })

  // 切回模式一：按钮回来，且仍是「一键展开」
  await page.click('text=模式一')
  await page.waitForTimeout(900)
  const btnBackOnMode1 = await page.locator('.history-header .aa-btn--plain').innerText()

  return JSON.stringify({
    headerHeight,
    headerChildren,
    searchIsRightOfModes: searchBox.x > modesBox.x + modesBox.width,
    searchLeft: Math.round(searchBox.x),
    modesRight: Math.round(modesBox.x + modesBox.width),
    btnText,
    sectionsBefore,
    sectionsAfter,
    btnTextAfter,
    btnOnMode2,
    btnBackOnMode1,
  })
}
