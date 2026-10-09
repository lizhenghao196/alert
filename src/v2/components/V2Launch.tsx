import { useState } from 'react'
import V2ConditionForm from './V2ConditionForm'
import type { Selection } from '../../types'

type Props = {
  teamName: string
  systemId: string
  frequency: number
  hasApplied: boolean
  onChangeTeamName: (value: string) => void
  onChangeSystemId: (value: string) => void
  onChangeFrequency: (value: number) => void
  /** 校验不通过时返回提示文案，通过则返回 null */
  onConfirm: (selection: Selection) => string | null
  onReset: () => void
}

/**
 * 首次进入（还没有任何生效条件）时的整页面板。
 * 条件字段与浮层共用 V2ConditionForm，这里只多一个外壳和「重置」。
 */
function V2Launch({
  teamName,
  systemId,
  frequency,
  hasApplied,
  onChangeTeamName,
  onChangeSystemId,
  onChangeFrequency,
  onConfirm,
  onReset,
}: Props) {
  const [error, setError] = useState('')

  return (
    <div className="px-5 pb-16 pt-14 xl:px-7">
      <form
        className="w-full max-w-[620px] border border-term-rule-strong"
        onSubmit={(event) => {
          event.preventDefault()
          setError(onConfirm({ teamName, systemId, frequency }) ?? '')
        }}
      >
        <div className="border-b border-term-rule-strong px-5 py-3">
          <span className="v2-label">观测条件</span>
        </div>

        <div className="px-5 py-5">
          <p className="mb-6 text-[12.5px] leading-relaxed text-term-fg-dim">
            填写组别或系统名（至少一项），选择巡检频率，确认后开始定时查询。
          </p>

          <V2ConditionForm
            teamName={teamName}
            systemId={systemId}
            frequency={frequency}
            error={error}
            onChangeTeamName={onChangeTeamName}
            onChangeSystemId={onChangeSystemId}
            onChangeFrequency={onChangeFrequency}
          />
        </div>

        <div className="flex justify-end gap-2 border-t border-term-rule px-5 py-4">
          <button type="button" className="v2-btn" onClick={onReset}>
            重置
          </button>
          <button type="submit" className="v2-btn v2-btn-primary">
            {hasApplied ? '重新观测' : '确认观测'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default V2Launch
