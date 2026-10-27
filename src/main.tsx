import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import AppV2 from './v2/AppV2'
import AppV3 from './v3/AppV3'
import AppV4 from './v4/AppV4'
import AppHistory from './history/AppHistory'
import { resolveVersion } from './version'
import './index.css'

/**
 * 多版并存：/v4/（模式一）走异常优先自适应布局，/v2/（模式二）走值班终端，
 * /v3/ 走严重度分区，/v1/ 走原版。
 *
 * 领导定稿只对照模式一 / 模式二，所以顶部导航只列这两个（见 version.ts 的
 * MODES），v1/v3 不再是入口、但文件与分流都留着：直接输 /v1/ /v3/ 仍能打开
 * 对照。站点根路径不带前缀，按 resolveVersion 的兜底落到模式一。
 *
 * /history/ 是「历史数据」页：从顶部「修改条件」旁边的入口新标签页打开，
 * 页面内部再分模式一（复刻告警分析页）/ 模式二（历史关单明细）。
 *
 * nginx 那段 try_files 会把未知子路径兜到 index.html，所以用 pathname 分流即可。
 */
const screens = {
  v1: <App />,
  v2: <AppV2 />,
  v3: <AppV3 />,
  v4: <AppV4 />,
  history: <AppHistory />,
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>{screens[resolveVersion(window.location.pathname)]}</React.StrictMode>,
)
