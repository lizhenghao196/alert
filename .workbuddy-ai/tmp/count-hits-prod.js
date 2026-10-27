async page => {
  const hits = []
  const pageErrors = []

  page.on('pageerror', (e) => pageErrors.push(String(e)))

  await page.route('**/monthly-report-api/**', (route) => {
    hits.push(route.request().url())
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  })
  await page.route('**/proxy/event_mgm/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  )

  await page.setViewportSize({ width: 1400, height: 800 })
  await page.goto('http://localhost:5223/alert-screen/history/')
  await page.waitForTimeout(1800)

  const title = await page.title()
  const mode1Mounted = await page.locator('.aa-root').count()
  const mode2SearchBar = await page.locator('.hist2-root .aa-bar').count()
  const dateText = await page.locator('.aa-range__field').first().innerText()

  return JSON.stringify({
    title,
    mode1RequestCount: hits.length,
    mode1Mounted,
    mode2SearchBar,
    dateText,
    pageErrors,
  })
}
