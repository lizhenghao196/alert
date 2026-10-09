import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

type Props = {
  text: string
  /**
   * 截断样式。默认三行，v1 的卡片用这个；v2 的密集表格传 line-clamp-1。
   * 默认值与加这个 prop 之前逐字一致，所以 v1 的渲染结果不变。
   */
  className?: string
  /**
   * 浮层配色。浮层 portal 到 body，不在 .v2-root 里，继承不到 v2 的令牌，
   * 所以这里要显式指定一套。
   */
  tone?: 'neutral' | 'terminal'
}

const SURFACE = {
  neutral: 'rounded-lg border-line bg-panel text-fg shadow-pop',
  // v2 全直角、无投影，所以这几个形状类不能留在公共部分
  terminal: 'border-term-rule-strong bg-term-alt text-term-fg',
} as const

const GAP = 10
const MARGIN = 12
const MAX_WIDTH = 380

/**
 * 判断是否真的被截断。不能直接比 scrollHeight/clientHeight：line-clamp 生效时
 * 浏览器只布局可见的那几行，scrollHeight 反映的就是裁完的高度，永远量不出溢出。
 * 所以克隆一份、去掉 clamp、离屏量真实高度。
 */
function isClipped(el: HTMLElement): boolean {
  const parent = el.parentElement
  if (!parent) return false

  const probe = el.cloneNode(true) as HTMLElement
  probe.setAttribute('aria-hidden', 'true')
  probe.style.cssText =
    'position:absolute;visibility:hidden;pointer-events:none;display:block;height:auto;' +
    `width:${el.clientWidth}px;-webkit-line-clamp:unset;overflow:visible;`

  parent.appendChild(probe)
  const overflowsVertically = probe.scrollHeight > el.clientHeight + 1
  // 单行截断（v2 的密集表格）溢出的方向是横向，纵向量不出来
  const overflowsHorizontally = probe.scrollWidth > el.clientWidth + 1
  probe.remove()

  return overflowsVertically || overflowsHorizontally
}

/**
 * 三行截断的摘要，悬停时用浮层显示全文。只在真的溢出时才弹，
 * 短摘要不会因为多余的提示而变吵。
 */
function SummaryTooltip({ text, className, tone = 'neutral' }: Props) {
  const anchorRef = useRef<HTMLSpanElement>(null)
  const tipRef = useRef<HTMLDivElement>(null)

  const [anchor, setAnchor] = useState<DOMRect | null>(null)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)

  const close = useCallback(() => {
    setAnchor(null)
    setPos(null)
  }, [])

  const openIfClipped = useCallback(() => {
    const el = anchorRef.current
    if (!el || !isClipped(el)) return
    setAnchor(el.getBoundingClientRect())
  }, [])

  // 量到浮层尺寸后再定位。useLayoutEffect 里 setState 会在绘制前重渲染，不会闪。
  useLayoutEffect(() => {
    if (!anchor || !tipRef.current) return
    const box = tipRef.current.getBoundingClientRect()

    let top = anchor.bottom + GAP
    if (top + box.height > window.innerHeight - MARGIN) {
      const above = anchor.top - box.height - GAP
      top =
        above >= MARGIN
          ? above
          : Math.max(MARGIN, window.innerHeight - MARGIN - box.height)
    }

    const left = Math.min(
      Math.max(MARGIN, anchor.left),
      Math.max(MARGIN, window.innerWidth - MARGIN - box.width),
    )

    setPos({ left, top })
  }, [anchor])

  useEffect(() => {
    if (!anchor) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    // capture：页面里任何一层滚动都要把浮层收掉，否则会跟内容脱节
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
      window.removeEventListener('keydown', onKey)
    }
  }, [anchor, close])

  // 轮询换了数据就收起来，避免浮层里留着旧文案
  useEffect(() => {
    setAnchor(null)
    setPos(null)
  }, [text])

  return (
    <>
      <span
        ref={anchorRef}
        className={className ?? 'line-clamp-3 break-words'}
        onMouseEnter={openIfClipped}
        onMouseLeave={close}
      >
        {text}
      </span>

      {anchor
        ? createPortal(
            <div
              ref={tipRef}
              role="tooltip"
              style={{
                position: 'fixed',
                left: pos ? pos.left : -9999,
                top: pos ? pos.top : -9999,
                maxWidth: MAX_WIDTH,
                opacity: pos ? 1 : 0,
              }}
              className={[
                'pointer-events-none z-[100] border px-3 py-2 text-xs leading-5 break-words transition-opacity duration-150',
                SURFACE[tone],
              ].join(' ')}
            >
              {text}
            </div>,
            document.body,
          )
        : null}
    </>
  )
}

export default SummaryTooltip
