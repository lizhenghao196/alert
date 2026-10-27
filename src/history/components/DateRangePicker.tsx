import { useEffect, useRef, useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { WEEKDAYS, fmt, monthCells, parse, sameDay } from '../calendar'

type Props = {
  /** [startDate, endDate]，yyyy-MM-dd；空数组表示未选 */
  value: string[]
  onChange: (value: string[]) => void
  disabled?: boolean
}

/**
 * 日期范围选择器 —— 对齐 Element UI 的 `daterange` 形态：
 * 一个输入框里两段日期 + 「至」分隔 + 日历图标，点开是**并排两个月**的面板。
 *
 * 交互：第一次点选起点，第二次点选终点（自动收起）；第二次点的日期早于起点时，
 * 把该日期当作新的起点。面板底部有「清空」。
 */
function DateRangePicker({ value, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false)
  const [draftStart, setDraftStart] = useState<string>('')
  const [draftEnd, setDraftEnd] = useState<string>('')
  // 面板显示的第一个月（右边那格是它的下一个月）
  const [cursor, setCursor] = useState(() => {
    const base = parse(value?.[0] || '') || new Date()
    return new Date(base.getFullYear(), base.getMonth(), 1)
  })
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    setDraftStart(value?.[0] || '')
    setDraftEnd(value?.[1] || '')
    const base = parse(value?.[0] || '') || new Date()
    setCursor(new Date(base.getFullYear(), base.getMonth(), 1))
    // 只在打开的那一刻同步一次，之后的改动由交互驱动
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null
      if (target && wrapRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const pick = (date: Date) => {
    const text = fmt(date)
    if (!draftStart || (draftStart && draftEnd)) {
      setDraftStart(text)
      setDraftEnd('')
      return
    }
    if (text >= draftStart) {
      setDraftEnd(text)
      onChange([draftStart, text])
      setOpen(false)
      return
    }
    setDraftStart(text)
  }

  const months = [cursor, new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)]
  const draftStartDate = parse(draftStart)
  const draftEndDate = parse(draftEnd)

  return (
    <div className="aa-range" ref={wrapRef}>
      <div
        className={disabled ? 'aa-range__field is-disabled' : 'aa-range__field'}
        onClick={() => {
          if (!disabled) setOpen((v) => !v)
        }}
      >
        <Calendar className="aa-range__icon" size={14} strokeWidth={2} />
        <span className={value?.[0] ? 'aa-range__text' : 'aa-range__text is-placeholder'}>
          {value?.[0] || '开始日期'}
        </span>
        <span className="aa-range__sep">至</span>
        <span className={value?.[1] ? 'aa-range__text' : 'aa-range__text is-placeholder'}>
          {value?.[1] || '结束日期'}
        </span>
      </div>

      {open ? (
        <div className="aa-range__panel">
          <div className="aa-range__panel-head">
            <button
              type="button"
              className="aa-range__nav"
              aria-label="上个月"
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            >
              <ChevronLeft size={14} strokeWidth={2} />
            </button>
            <span className="aa-range__nav-spacer" />
            <button
              type="button"
              className="aa-range__nav"
              aria-label="下个月"
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            >
              <ChevronRight size={14} strokeWidth={2} />
            </button>
          </div>

          <div className="aa-range__months">
            {months.map((month) => (
              <div className="aa-range__month" key={`${month.getFullYear()}-${month.getMonth()}`}>
                <div className="aa-range__month-label">
                  {month.getFullYear()} 年 {month.getMonth() + 1} 月
                </div>
                <div className="aa-range__grid">
                  {WEEKDAYS.map((day) => (
                    <span className="aa-range__weekday" key={day}>
                      {day}
                    </span>
                  ))}
                  {monthCells(month.getFullYear(), month.getMonth()).map((cell, index) => {
                    if (!cell) return <span key={`e${index}`} />
                    const text = fmt(cell)
                    const isStart = sameDay(cell, draftStartDate)
                    const isEnd = sameDay(cell, draftEndDate)
                    const inRange =
                      !!draftStartDate && !!draftEndDate && text > draftStart && text < draftEnd
                    const isToday = sameDay(cell, new Date())
                    return (
                      <button
                        type="button"
                        key={text}
                        className={[
                          'aa-range__day',
                          isStart || isEnd ? 'is-edge' : '',
                          inRange ? 'is-in-range' : '',
                          isToday ? 'is-today' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        onClick={() => pick(cell)}
                      >
                        {cell.getDate()}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="aa-range__panel-foot">
            <button
              type="button"
              className="aa-range__link"
              onClick={() => {
                onChange([])
                setOpen(false)
              }}
            >
              清空
            </button>
            <button
              type="button"
              className="aa-range__link is-primary"
              onClick={() => {
                if (draftStart && draftEnd) onChange([draftStart, draftEnd])
                setOpen(false)
              }}
            >
              确定
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default DateRangePicker
