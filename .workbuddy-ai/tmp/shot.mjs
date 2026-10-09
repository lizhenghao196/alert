// 临时截图脚本（用完删）：headless Chrome 的 --screenshot 抓不到「挂载后
// 才点开」的浮层，所以改用 CDP：导航 → 执行一段 JS → 再抓图。
//
// 用法：node shot.mjs <url> <out.png> <w> <h> [在页面里执行的 JS] [clipX clipY clipW clipH scale]
// 带 clip 参数时只截那一块（坐标是 CSS 像素），scale 用来放大看细节。
import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const [url, out, w = '1280', h = '800', js = '', cx, cy, cw, ch, cs] = process.argv.slice(2)
const clip =
  cx !== undefined ? { x: +cx, y: +cy, width: +cw, height: +ch, scale: +(cs || 1) } : undefined
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 9333

const chrome = spawn(CHROME, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--no-first-run',
  `--remote-debugging-port=${PORT}`,
  `--window-size=${w},${h}`,
  'about:blank',
])

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function targets() {
  const res = await fetch(`http://127.0.0.1:${PORT}/json/list`)
  return res.json()
}

try {
  let page = null
  for (let i = 0; i < 40 && !page; i++) {
    await sleep(250)
    try {
      page = (await targets()).find((t) => t.type === 'page')
    } catch {
      /* 还没起来 */
    }
  }
  if (!page) throw new Error('拿不到调试目标')

  const ws = new WebSocket(page.webSocketDebuggerUrl)
  let id = 0
  const pending = new Map()
  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data)
    const resolve = pending.get(msg.id)
    if (resolve) {
      pending.delete(msg.id)
      resolve(msg.result)
    }
  })
  await new Promise((r) => ws.addEventListener('open', r))

  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const n = ++id
      pending.set(n, resolve)
      ws.send(JSON.stringify({ id: n, method, params }))
    })

  await send('Page.enable')
  await send('Emulation.setDeviceMetricsOverride', {
    width: Number(w),
    height: Number(h),
    deviceScaleFactor: 1,
    mobile: false,
  })
  await send('Page.navigate', { url })
  await sleep(2500)

  if (js) {
    const r = await send('Runtime.evaluate', {
      expression: js,
      awaitPromise: true,
      returnByValue: true,
    })
    if (r.exceptionDetails) console.error('页面里的 JS 报错:', r.exceptionDetails.text)
    if (r.result && r.result.value !== undefined) console.log('JS 返回:', r.result.value)
    await sleep(400)
  }

  const shot = await send('Page.captureScreenshot', clip ? { format: 'png', clip } : { format: 'png' })
  writeFileSync(out, Buffer.from(shot.data, 'base64'))
  console.log('已保存', out)
} finally {
  chrome.kill()
}
