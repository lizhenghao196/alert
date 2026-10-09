import { useEffect, useRef, useState } from 'react'
import V2ConditionForm from './V2ConditionForm'
import type { Selection } from '../../types'

type Props = {
  applied: Selection
  /** 校验不通过时返回提示文案，通过则返回 null */
  onApply: (next: Selection) => string | null
  onCancel: () => void
}

/**
 * 锚在 masthead 条件按钮下方的编辑器。
 *
 * 草稿是组件内的 state：关掉即丢弃，所以「取消」不需要任何回滚逻辑，
 * 每次打开都是当前生效条件的干净副本。
 */
function V2ConditionPopover({ applied, onApply, onCancel }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  const [teamName, setTeamName] = useState(applied.teamName)
  const [systemId, setSystemId] = useState(applied.systemId)
  const [frequency, setFrequency] = useState(applied.frequency)
  const [error, setError] = useState('')

  useEffect(() => {
    ref.current?.focus()
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel()
    }
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (!target) return
      if (ref.current?.contains(target)) return
      // 触发按钮自己负责开合。这里放行，否则 mousedown 先关、click 再开，等于点不动。
      if (target.closest('[data-condition-trigger]')) return
      onCancel()
    }

    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onPointerDown)
    }
  }, [onCancel])

  const submit = () => {
    const message = onApply({ teamName, systemId, frequency })
    setError(message ?? '')
  }

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="dialog"
      aria-label="观测条件"
      className="v2-popover"
    >
      <div className="border-b border-term-rule-strong px-4 py-2.5">
        <span className="v2-label">观测条件</span>
      </div>

      <div className="px-4 py-4">
        <V2ConditionForm
          teamName={teamName}
          systemId={systemId}
          frequency={frequency}
          error={error}
          onChangeTeamName={setTeamName}
          onChangeSystemId={setSystemId}
          onChangeFrequency={setFrequency}
        />
      </div>

      <div className="flex justify-end gap-2 border-t border-term-rule px-4 py-3">
        <button type="button" className="v2-btn" onClick={onCancel}>
          取消
        </button>
        <button type="button" className="v2-btn v2-btn-primary" onClick={submit}>
          确认
        </button>
      </div>
    </div>
  )
}

export default V2ConditionPopover
