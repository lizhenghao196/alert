import type { ReactNode } from 'react'
import { TriangleAlert } from 'lucide-react'
import { FREQUENCY_OPTIONS, TEAMS } from '../../types'

/**
 * 组别多一个空值项，对应原来下拉里的「不限定组别」。
 * 值域与原来的 <select> 逐项一致。
 */
const TEAM_CHOICES: Array<{ value: string; label: string }> = [
  { value: '', label: '不限定组别' },
  ...TEAMS.map((team) => ({ value: team, label: team })),
]

type Props = {
  teamName: string
  systemId: string
  frequency: number
  error: string
  onChangeTeamName: (value: string) => void
  onChangeSystemId: (value: string) => void
  onChangeFrequency: (value: number) => void
}

/**
 * 观测条件的三个字段。首次进入的整页面板和 masthead 下的浮层共用这一份，
 * 两者只是外面的壳不同。
 *
 * 组别和频率原来是原生 <select>：5 到 7 个固定选项、互斥、一次性选择，
 * 用下拉要走「展开再选」两步，而且系统原生菜单在终端风格里很出戏。
 * 换成平方块选择器后选项全可见、一次点击，选中态就是亮起的琥珀块。
 */
function V2ConditionForm({
  teamName,
  systemId,
  frequency,
  error,
  onChangeTeamName,
  onChangeSystemId,
  onChangeFrequency,
}: Props) {
  return (
    <div className="flex flex-col gap-5">
      <Field label="组别">
        <div className="flex flex-wrap gap-1.5">
          {TEAM_CHOICES.map((choice) => (
            <button
              key={choice.value || '__unset__'}
              type="button"
              aria-pressed={teamName === choice.value}
              className="v2-chip"
              onClick={() => onChangeTeamName(choice.value)}
            >
              {choice.label}
            </button>
          ))}
        </div>
      </Field>

      <Field label="系统名">
        <input
          className="v2-field"
          type="text"
          maxLength={100}
          placeholder="例如 DASP"
          value={systemId}
          onChange={(event) => onChangeSystemId(event.target.value)}
        />
      </Field>

      <Field label="巡检频率">
        <div className="flex flex-wrap gap-1.5">
          {FREQUENCY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={frequency === option.value}
              className="v2-chip"
              onClick={() => onChangeFrequency(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </Field>

      {error ? (
        <p className="v2-mono flex items-start gap-2 border-l-2 border-term-alert bg-term-alert/[0.06] px-3 py-2 text-[11.5px] leading-relaxed text-term-alert">
          <TriangleAlert size={13} strokeWidth={2} className="mt-px shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="v2-label">{label}</span>
      {children}
    </div>
  )
}

export default V2ConditionForm
