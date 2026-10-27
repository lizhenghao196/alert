async page => {
  const hits = []
  await page.route('**/monthly-report-api/**', (route) => {
    hits.push(Date.now())
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  })
  await page.goto('http://localhost:5173/alert-screen/history/')
  await page.waitForTimeout(1600)
  return 'REQUESTS=' + hits.length
}
