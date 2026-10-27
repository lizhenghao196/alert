async (page) => {
  await page.setViewportSize({ width: 1600, height: 1000 })
  await page.goto('http://localhost:5173/alert-screen/history/')
  await page.waitForTimeout(1000)
  await page.click('text=模式二')
  await page.waitForTimeout(1600)

  const snap = () =>
    page.evaluate(() => {
      const panel = document.querySelector('.history-panel:not([hidden])')
      const wrap = panel.querySelector('.aa-table-wrap')
      const pager = panel.querySelector('.aa-pager')
      const rows = panel.querySelectorAll('.aa-table tbody tr')
      const keys = Array.from(rows)
        .slice(0, 3)
        .map((r) => r.querySelectorAll('td')[2]?.textContent)
      const active = pager ? pager.querySelector('.aa-pager__item.is-active')?.textContent : null
      const arrows = pager ? Array.from(pager.querySelectorAll('.aa-pager__arrow')) : []
      return {
        rowCount: rows.length,
        firstKeys: keys,
        total: pager ? pager.querySelector('.aa-pager__total')?.textContent : null,
        pageSize: pager ? pager.querySelector('.aa-pager__select')?.value : null,
        activePage: active,
        prevDisabled: arrows[0] ? arrows[0].disabled : null,
        nextDisabled: arrows[1] ? arrows[1].disabled : null,
        pageItems: pager
          ? Array.from(pager.querySelectorAll('.aa-pager__item')).map((b) => b.textContent).join(',')
          : null,
        wrapH: wrap ? Math.round(wrap.getBoundingClientRect().height) : null,
        wrapScrollTop: wrap ? Math.round(wrap.scrollTop) : null,
        pageScroll: document.documentElement.scrollHeight > window.innerHeight,
        docH: document.documentElement.scrollHeight,
        vh: window.innerHeight,
      }
    })

  const out = {}
  out.p1 = await snap()
  await page.screenshot({ path: 'pg-1.png' })

  // 滚到表格中部，再翻页，验证翻页后滚动条回到顶部
  await page.evaluate(() => {
    const w = document.querySelector('.history-panel:not([hidden]) .aa-table-wrap')
    if (w) w.scrollTop = 400
  })
  await page.waitForTimeout(250)
  out.scrolled = await snap()

  const items = page.locator('.aa-pager__item')
  await items.nth(1).click()
  await page.waitForTimeout(500)
  out.p2 = await snap()

  const items2 = await page.locator('.aa-pager__item').all()
  await items2[items2.length - 1].click()
  await page.waitForTimeout(500)
  out.last = await snap()
  await page.screenshot({ path: 'pg-last.png' })

  await page.selectOption('.aa-pager__select', '20')
  await page.waitForTimeout(500)
  out.size20 = await snap()

  await page.fill('.aa-pager__jump', '7')
  await page.keyboard.press('Enter')
  await page.waitForTimeout(500)
  out.jump7 = await snap()

  await page.selectOption('.aa-pager__select', '50')
  await page.waitForTimeout(700)
  await page.screenshot({ path: 'pg-final.png' })

  return JSON.stringify(out)
}
