// 一次性静态服务器：把 dist 当作站点根，带 SPA 兜底（模拟 nginx try_files）。
// 只用于验证「生产构建下刷新历史数据页会请求几次」，验完即关。
const http = require('http')
const fs = require('fs')
const path = require('path')

const ROOT = 'E:/code/2026/four/alert/dist'
const PORT = 5223

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
}

http
  .createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname)
    let rel = pathname.replace(/^\/alert-screen\/?/, '')
    if (rel === '' || rel.endsWith('/')) rel = 'index.html'
    let full = path.join(ROOT, rel)
    if (!fs.existsSync(full) || fs.statSync(full).isDirectory()) full = path.join(ROOT, 'index.html')
    res.writeHead(200, { 'Content-Type': MIME[path.extname(full)] || 'application/octet-stream' })
    fs.createReadStream(full).pipe(res)
  })
  .listen(PORT, () => console.log('static server on http://localhost:' + PORT + '/alert-screen/'))
