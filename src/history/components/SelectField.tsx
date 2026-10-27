import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Check } from 'lucide-react'

type Props = {
  value: string
  options: readonly string[]
  placeholder?: string
  onChange: (value: string) => void
  disabled?: boolean
}

/**
 * 下拉选择器 —— 对齐 Element UI 的 el-select 形态（白底、1px 边框、右侧箭头，
 * 展开后是一张带投影的选项列表，选中项高亮并带对勾）。
 *
 * 组别下拉的 label 与 value 完全相同（字典 dict_system_group），所以这里直接用
 * 文案本身当值，不需要额外的 value/label 映射。
 *
 * 模式一 / 模式二共用（见 HistorySearchBar）。
 */
function SelectField({ value, options, placeholder, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

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

  return (
    <div className="aa-select" ref={wrapRef}>
      <div
        className={['aa-select__field', open ? 'is-open' : '', disabled ? 'is-disabled' : '']
          .filter(Boolean)
          .join(' ')}
        onClick={() => {
          if (!disabled) setOpen((v) => !v)
        }}
      >
        <span className={value ? 'aa-select__text' : 'aa-select__text is-placeholder'}>
          {value || placeholder || ''}
        </span>
        <ChevronDown className="aa-select__caret" size={14} strokeWidth={2} />
      </div>

      {open ? (
        <div className="aa-select__panel" role="listbox">
          {options.map((option) => {
            const active = option === value
            return (
              <div
                key={option}
                role="option"
                aria-selected={active}
                className={active ? 'aa-select__option is-active' : 'aa-select__option'}
                onClick={() => {
                  onChange(option)
                  setOpen(false)
                }}
              >
                <span>{option}</span>
                {active ? <Check size={13} strokeWidth={2.4} /> : null}
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

export default SelectField
