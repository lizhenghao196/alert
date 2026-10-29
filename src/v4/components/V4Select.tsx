import { useCallback, useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'

type Props = {
  value: string
  options: string[]
  placeholder: string
  /** 校验不通过时的红框 */
  invalid?: boolean
  onChange: (value: string) => void
}

/** 面板与触发器之间的间距 */
const GAP = 6
/** 面板离视口上下边缘至少留这么多，别贴死 */
const VIEWPORT_PAD = 12
/** 面板最大高度（6 行 + 内边距） */
const MAX_PANEL_HEIGHT = 216
/** 下方空间小于这个值就翻到上面去 */
const FLIP_THRESHOLD = 180

type PanelBox = {
  left: number
  width: number
  maxHeight: number
  top?: number
  bottom?: number
}

/**
 * 关单弹窗里的下拉。
 *
 * 不用原生 <select>：展开后的选项面板是浏览器/系统自绘的，圆角、间距、
 * 选中态一个都改不了，在浅色面板里显得很突兀。这里用 button + listbox 自绘。
 *
 * 面板通过 portal 挂到最近的 <dialog> 上、用 position: fixed 定位，
 * 而不是在触发器下面 absolute：
 * 1. 弹窗的表单区是 overflow-y-auto，absolute 面板一旦超出可视区就会被裁掉，
 *    靠底部的字段展开后只能看到半截选项（生产上就是这么暴露的）；
 * 2. fixed 之后不受任何祖先的 overflow 影响，空间不够时还能整体翻到触发器上方。
 * 挂到 dialog 而不是 body，是因为 showModal() 的 dialog 在 top layer，
 * body 里再高的 z-index 也会被它盖住。
 *
 * 键盘按 WAI-ARIA 的 combobox 来：↑↓ 移动、Enter/Space 选中、Esc 关闭、
 * Tab 直接收起（焦点交给下一个字段）。
 */
function V4Select({ value, options, placeholder, invalid, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  /** 是否已经滚到底：没到底时底部加一层渐隐，提示"下面还有" */
  const [atEnd, setAtEnd] = useState(true)
  const [box, setBox] = useState<PanelBox | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const syncFade = () => {
    const el = listRef.current
    if (!el) return
    setAtEnd(el.scrollTop + el.clientHeight >= el.scrollHeight - 1)
  }

  /** 按触发器的位置算面板坐标：下面放不下就翻到上面，高度也跟着可用空间收 */
  const updateBox = useCallback(() => {
    const trigger = rootRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom - GAP - VIEWPORT_PAD
    const spaceAbove = rect.top - GAP - VIEWPORT_PAD
    const openUp = spaceBelow < FLIP_THRESHOLD && spaceAbove > spaceBelow
    const maxHeight = Math.min(
      MAX_PANEL_HEIGHT,
      Math.max(120, openUp ? spaceAbove : spaceBelow),
    )
    setBox(
      openUp
        ? { left: rect.left, width: rect.width, maxHeight, bottom: window.innerHeight - rect.top + GAP }
        : { left: rect.left, width: rect.width, maxHeight, top: rect.bottom + GAP },
    )
  }, [])

  // 点面板外面就收起。用 pointerdown 而不是 click：后者要等 mouseup，
  // 拖选文字时容易误触发。面板已经 portal 出去了，所以要单独判一次。
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      const node = event.target as Node
      if (rootRef.current?.contains(node) || panelRef.current?.contains(node)) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  // 展开时定位，并跟着滚动 / 窗口尺寸变化重算，别让面板和触发器分家
  useEffect(() => {
    if (!open) {
      setBox(null)
      return
    }
    updateBox()
    window.addEventListener('scroll', updateBox, true)
    window.addEventListener('resize', updateBox)
    return () => {
      window.removeEventListener('scroll', updateBox, true)
      window.removeEventListener('resize', updateBox)
    }
  }, [open, updateBox])

  // 展开时把高亮落到当前值上；没有值就落在第一项
  useEffect(() => {
    if (!open) return
    const index = options.indexOf(value)
    setActiveIndex(index >= 0 ? index : 0)
  }, [open, options, value])

  // 刚展开时算一次：内容比面板高才需要渐隐提示
  useEffect(() => {
    if (!open) return
    const id = window.requestAnimationFrame(syncFade)
    return () => window.cancelAnimationFrame(id)
  }, [open])

  // 选项多到要滚动时（现在 15 个），键盘上下移动要让高亮那项跟着露出来
  useEffect(() => {
    if (!open || activeIndex < 0) return
    const item = listRef.current?.children[activeIndex]
    if (item instanceof HTMLElement) item.scrollIntoView({ block: 'nearest' })
  }, [open, activeIndex])

  const commit = (next: string) => {
    onChange(next)
    setOpen(false)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Escape') {
      if (open) {
        event.stopPropagation()
        setOpen(false)
      }
      return
    }
    if (event.key === 'Tab') {
      setOpen(false)
      return
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) {
        setOpen(true)
        return
      }
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActiveIndex((prev) => {
        const next = prev + step
        if (next < 0) return options.length - 1
        if (next >= options.length) return 0
        return next
      })
      return
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (!open) {
        setOpen(true)
        return
      }
      const picked = options[activeIndex]
      if (picked) commit(picked)
    }
  }

  const portalTarget =
    (rootRef.current?.closest('dialog') as HTMLElement | null) ?? document.body

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-invalid={invalid || undefined}
        className={[
          // 高度跟旁边输入框对齐（py-2 + leading-6），不用固定 h-9：
          // 固定 36px 会比输入框矮 6px，一排字段看着参差不齐
          'flex w-full items-center justify-between gap-2 rounded-lg border bg-surface px-3 py-2 text-left text-[13px] leading-6 transition-colors duration-200',
          'focus:outline-none focus:ring-2',
          invalid
            ? 'border-abnormal focus:border-abnormal focus:ring-abnormal/20'
            : 'border-line hover:border-line-strong focus:border-accent focus:ring-accent/25',
          open ? 'border-accent ring-2 ring-accent/25' : '',
        ].join(' ')}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
      >
        <span className={value ? 'truncate text-fg' : 'truncate text-fg-mute'}>
          {value || placeholder}
        </span>
        <ChevronDown
          size={14}
          strokeWidth={2}
          className={[
            'shrink-0 text-fg-mute transition-transform duration-200',
            open ? 'rotate-180 text-accent' : '',
          ].join(' ')}
        />
      </button>

      {open && box
        ? createPortal(
            <div
              ref={panelRef}
              className="v4-select-panel animate-fade-slide-in fixed z-30 overflow-hidden rounded-xl border border-line-strong bg-panel"
              style={{
                left: box.left,
                width: box.width,
                top: box.top,
                bottom: box.bottom,
              }}
            >
              {/* 滚动必须落在这一层：maxHeight 得给到一个高度确定的盒子，
                  写在上一层的 max-height 上、这里再 max-h-full 是不生效的
                  （父级高度是 auto，百分比 max-height 会算成 none），
                  结果就是列表被外层 overflow:hidden 裁掉、还滚不动。 */}
              <div
                ref={listRef}
                role="listbox"
                aria-label={placeholder}
                onScroll={syncFade}
                className="overflow-y-auto p-1"
                style={{ maxHeight: box.maxHeight }}
              >
                {options.map((option, index) => {
                  const selected = option === value
                  const active = index === activeIndex
                  return (
                    <button
                      key={option}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      // 背景只给一个类：同时挂 bg-raise 和 bg-accent/10 时谁生效取决于
                      // Tailwind 的产物顺序，不可靠，所以按状态算出一个来。
                      className={[
                        'flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-[13px] transition-colors duration-150',
                        selected
                          ? 'bg-accent/10 font-semibold text-accent'
                          : active
                            ? 'bg-raise text-fg'
                            : 'text-fg-soft',
                      ].join(' ')}
                      // 用 mouseenter 跟随高亮，键盘和鼠标共用同一个高亮状态
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => commit(option)}
                    >
                      <span className="truncate">{option}</span>
                      {selected ? <Check size={13} strokeWidth={2.4} className="shrink-0" /> : null}
                    </button>
                  )
                })}
              </div>
              {/* 没滚到底时底部渐隐：滚动条是浮层式的，不给点提示看不出来还有选项 */}
              {atEnd ? null : <div className="v4-select-fade" aria-hidden />}
            </div>,
            portalTarget,
          )
        : null}
    </div>
  )
}

export default V4Select
