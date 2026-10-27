async page => {
  await page.setViewportSize({ width: 1500, height: 900 })
  await page.goto('http://localhost:5223/alert-screen/history/')
  await page.waitForSelector('.aa-table-wrap', { timeout: 15000 })
  await page.waitForTimeout(600)

  const probe = () =>
    page.evaluate(() => {
      const wraps = Array.from(document.querySelectorAll('.aa-table-wrap'))
      const visible = wraps.filter((w) => w.offsetParent !== null)
      const out = visible.map((w) => {
        const cs = getComputedStyle(w)
        return {
          cls: w.className,
          inline: w.getAttribute('style') || '(none)',
          height: cs.height,
          maxHeight: cs.maxHeight,
          rectH: Math.round(w.getBoundingClientRect().height),
          rows: w.querySelectorAll('tbody tr').length,
        }
      })
      return out
    })

  const mode1Wraps = await probe()

  const nav = await page
    .locator('.aa-ng__nav-item')
    .evaluateAll((els) => els.map((el) => el.innerText.replace(/\s+/g, ' ').trim()))
  const chips = await page
    .locator('.aa-ng__chip')
    .evaluateAll((els) => els.map((el) => el.innerText.replace(/\s+/g, ' ').trim()))
  const tabs = await page
    .locator('.aa-tabs__item')
    .evaluateAll((els) => els.map((el) => el.innerText.replace(/\s+/g, ' ').trim()))
  const sectionTitles = await page
    .locator('.aa-cs__title')
    .evaluateAll((els) => els.map((el) => el.innerText.replace(/\s+/g, ' ').trim()))

  // 当前展示的那张告警表的两个按钮文字
  const activePanelBtns = await page
    .locator('.aa-tabs__panel .aa-text-btn, .aa-ng__main .aa-text-btn')
    .evaluateAll((els) => els.map((el) => el.innerText.trim()))

  await page.screenshot({ path: '.workbuddy-ai/tmp/m1-after.png', fullPage: true })

  // ── 切到模式二，确认它的表格高度路径没被改坏（仍是 max-height，行少时收缩） ──
  await page.locator('.history-mode-tab', { hasText: '模式二' }).click()
  await page.waitForTimeout(1800)
  const mode2Wraps = await page.evaluate(() => {
    const wraps = Array.from(document.querySelectorAll('.aa-table-wrap')).filter(
      (w) => w.offsetParent !== null,
    )
    return wraps.map((w) => {
      const cs = getComputedStyle(w)
      return {
        cls: w.className,
        inline: w.getAttribute('style') || '(none)',
        height: cs.height,
        maxHeight: cs.maxHeight,
        rectH: Math.round(w.getBoundingClientRect().height),
        rows: w.querySelectorAll('tbody tr').length,
      }
    })
  })
  await page.screenshot({ path: '.workbuddy-ai/tmp/m2-after.png', fullPage: true })

  return JSON.stringify(
    { mode1Wraps, nav, chips, tabs, sectionTitles, activePanelBtns, mode2Wraps },
    null,
    1,
  )
}
