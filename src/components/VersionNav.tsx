import { useEffect, useRef, useState } from 'react'
import { Check, LayoutGrid } from 'lucide-react'
import { MODES, resolveVersion, versionHref } from '../version'

type Tone = 'default' | 'terminal'

type Props = {
  /**
   * 图标按钮的类名。三版的按钮形状与令牌都不同（v1 是 36px 圆钮、v2 是 28px
   * 直角钮、v4 走 .v4-icon-button），所以形状交给调用方，组件只管开合。
   */
  buttonClassName: string
  iconSize?: number
  /** 浮层配色。v1 / v4 走 --c-*，v2 走 --t-*。 */
  tone?: Tone
}

const SURFACE: Record<Tone, string> = {
  default: 'rounded-xl border border-line bg-panel text-fg shadow-pop',
  // v2 是直角、无投影的终端风格，只有真的浮在内容之上时才用 --t-elev（同 .v2-popover）
  terminal: 'border border-term-rule-strong bg-term-alt text-term-fg shadow-[var(--t-elev)]',
}

const ITEM: Record<Tone, { base: string; current: string; mono: string }> = {
  default: {
    base: 'text-fg-soft hover:bg-raise hover:text-fg',
    current: 'bg-accent/10 text-accent',
    mono: 'font-mono',
  },
  terminal: {
    base: 'text-term-fg-dim hover:bg-term-hover hover:text-term-fg',
    current: 'bg-term-amber/10 text-term-amber',
    mono: 'v2-mono',
  },
}

/**
 * 右上角的模式切换。点击展开，列出「模式一 / 模式二」，点条目跳过去。
 *
 * 曾经改成平铺在 header 里的分段控件，领导看后又要求回到「图标 + 下拉」，
 * 于是恢复成这一版；条目仍是领导定稿的两个模式（v1/v3 不作为入口，
 * 见 version.ts 的 MODES）。
 *
 * 跳转是整页导航（<a href>），不是前端路由，原因有二：
 *
 *  1. 定时器不用手动清。旧文档的 JS 上下文随卸载一起销毁，useAlertPolling
 *     里的轮询 setTimeout、请求超时 setTimeout 以及在途的 fetch 都会跟着消失，
 *     不存在跨模式残留的定时器。反过来，若改成 pushState + 重新渲染，就必须
 *     依赖那个 hook 的 effect cleanup 去 clearTimeout / abort，多一条容易漏的路径。
 *  2. 观测条件、主题、静音状态本来就存在 localStorage，跳过去还是同一套设置，
 *     不会因为换模式把用户填的条件丢掉。
 *
 * 条目用真实 href 还有个好处：可以中键新开标签、可以右键复制链接。
 */
function VersionNav({ buttonClassName, iconSize = 16, tone = 'default' }: Props) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const current = resolveVersion(window.location.pathname)

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      // 点在浮层或触发按钮上都交给各自的 onClick，这里只处理「点到了外面」
      if (target && wrapRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onPointerDown)
    }
  }, [open])

  const surface = SURFACE[tone]
  const item = ITEM[tone]

  return (
    <div ref={wrapRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="切换页面模式"
        title="切换页面模式"
        className={buttonClassName}
      >
        <LayoutGrid size={iconSize} strokeWidth={1.9} />
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="页面模式"
          className={`absolute right-0 top-[calc(100%+8px)] z-50 w-[112px] overflow-hidden p-1 ${surface}`}
        >
          {MODES.map((meta) => {
            const active = meta.id === current
            const rowClass = [
              'flex items-center justify-between gap-3 px-2.5 py-2 text-[12px] transition-colors duration-100',
              item.base,
              active ? item.current : '',
            ].join(' ')

            return (
              <a
                key={meta.id}
                href={versionHref(meta)}
                role="menuitem"
                aria-current={active ? 'page' : undefined}
                // 当前模式点自己不用再刷一遍：它已经是最新状态，重载只会打断正在跑的轮询
                onClick={(event) => {
                  if (active) event.preventDefault()
                  setOpen(false)
                }}
                className={rowClass}
              >
                <span className={`${item.mono} text-[12px] font-semibold`}>{meta.label}</span>
                {active ? <Check size={13} strokeWidth={2.2} className="shrink-0" /> : null}
              </a>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

export default VersionNav
