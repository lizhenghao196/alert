import type { ReactNode } from 'react'
import { ChevronDown, Cpu, RefreshCw, Table2 } from 'lucide-react'
import type { SectionIcon } from '../shape'

const ICON_MAP = {
  table: Table2,
  nested: Cpu,
  duplicate: RefreshCw,
} as const

type Props = {
  title: string
  icon?: SectionIcon | null
  badge?: string
  collapsed: boolean
  onToggle: () => void
  children: ReactNode
}

/**
 * 可折叠区块。与 RuoYi 的 CollapseSection 一致：收起时**卸载**内容
 * （而不是隐藏），展开时重新挂载，避免表格在隐藏容器里量出的列宽残留。
 */
function CollapseSection({ title, icon, badge, collapsed, onToggle, children }: Props) {
  const Icon = icon ? ICON_MAP[icon] : null

  return (
    <section className={collapsed ? 'aa-cs is-collapsed' : 'aa-cs'}>
      <button
        type="button"
        className="aa-cs__head"
        title={collapsed ? '展开' : '收起'}
        aria-expanded={!collapsed}
        onClick={onToggle}
      >
        {Icon ? <Icon className="aa-cs__icon" size={16} strokeWidth={2} /> : null}
        <span className="aa-cs__title">{title}</span>
        {badge ? <span className="aa-cs__badge">{badge}</span> : null}
        <ChevronDown
          className={collapsed ? 'aa-cs__caret is-collapsed' : 'aa-cs__caret'}
          size={14}
          strokeWidth={2}
        />
      </button>

      {collapsed ? null : <div className="aa-cs__body">{children}</div>}
    </section>
  )
}

export default CollapseSection
