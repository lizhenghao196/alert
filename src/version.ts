/**
 * 版本清单与路径判定。
 *
 * 这里有两件事，不要混在一起：
 *
 *  - **路由**：main.tsx 用 resolveVersion 决定渲染哪个版本。四个版本的代码都还在
 *    （v1/v3 是落选方案，文件保留、URL 仍能打开），所以判定必须认得 v1..v4。
 *  - **导航**：领导定稿只对照两个模式 —— v4 是模式一、v2 是模式二。顶部导航只列
 *    这两项，v1/v3 不再是入口。
 */

export type VersionId = 'v1' | 'v2' | 'v3' | 'v4' | 'history'

export type VersionMeta = {
  id: VersionId
  /** 相对 BASE_URL 的子路径（末尾带斜杠） */
  path: string
  /** 导航上显示的名字，就是「模式一 / 模式二」 */
  label: string
}

/**
 * 顶部导航列出的模式，数组顺序就是界面上的顺序。
 *
 * 只有两个：v4 = 模式一，v2 = 模式二。v1/v3 是落选方案，刻意不在这里。
 */
export const MODES: VersionMeta[] = [
  { id: 'v4', path: 'v4/', label: '模式一' },
  { id: 'v2', path: 'v2/', label: '模式二' },
]

/**
 * 从 pathname 判定当前版本。
 *
 * nginx 的 try_files 会把未知子路径兜到同一个 index.html，所以只认
 * /v1/ /v2/ /v3/ /v4/ /history/ 这几个前缀。
 *
 * 兜底不是 v1 而是 v4：站点根路径要直接落地模式一（v1 是落选方案，
 * 不该再占着默认入口）。v1 因此要靠显式的 /v1/ 前缀才进得去。
 *
 * /history/ 是「历史数据」页（新标签页打开的独立页面，内部再分模式一/模式二），
 * 它不在 MODES 里，因此不会出现在顶部模式切换浮层中。
 */
export function resolveVersion(pathname: string): VersionId {
  if (/\/history(\/|$)/.test(pathname)) return 'history'
  if (/\/v4(\/|$)/.test(pathname)) return 'v4'
  if (/\/v3(\/|$)/.test(pathname)) return 'v3'
  if (/\/v2(\/|$)/.test(pathname)) return 'v2'
  if (/\/v1(\/|$)/.test(pathname)) return 'v1'
  return 'v4'
}

/**
 * 拼出某个版本的完整 URL。BASE_URL 来自 vite.config.ts 的 base
 * （'/alert-screen/'，末尾带斜杠），所以站点换路径时这里跟着走，不用改代码。
 */
export function versionHref(meta: VersionMeta): string {
  return `${import.meta.env.BASE_URL}${meta.path}`
}

/** 「历史数据」页的完整 URL（新标签页打开时用，见 AppHeader 的入口按钮） */
export const HISTORY_HREF = `${import.meta.env.BASE_URL}history/`

/**
 * 站点根路径（不带版本前缀）。
 *
 * 根路径按 resolveVersion 的兜底落地到模式一（v4 = 告警实时观测页），
 * 所以历史数据页的「返回」按钮在 window.close() 被浏览器拦下时，
 * 用它把本标签页送回告警页（见 AppHistory 的 handleBack）。
 */
export const HOME_HREF = import.meta.env.BASE_URL
