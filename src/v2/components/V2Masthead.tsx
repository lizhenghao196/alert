import { Moon, Sun, Volume2, VolumeX } from 'lucide-react'
import type { ReactNode } from 'react'
import VersionNav from '../../components/VersionNav'
import { frequencyLabel, type Selection } from '../../types'
import type { AlertSound } from '../../hooks/useAlertSound'
import type { Theme } from '../../theme'

/** 与提示音/主题按钮同形，三个图标并排时尺寸才一致 */
const ICON_BUTTON =
  'grid h-7 w-7 place-items-center border border-term-rule text-term-fg-dim transition-colors duration-100 hover:bg-term-hover hover:text-term-fg'

function soundTitle(sound: AlertSound): string {
  if (sound.blocked && !sound.muted) {
    return '浏览器拦截了自动播放，点击页面任意处即可启用提示音'
  }
  return sound.muted ? '提示音已静音，点击开启' : '发现新的异常告警时播提示音，点击静音'
}

type Props = {
  applied: Selection | null
  running: boolean
  loading: boolean
  queried: boolean
  lastUpdated: string
  theme: Theme
  onToggleTheme: () => void
  sound: AlertSound
  /** 条件编辑器是否展开 */
  editing: boolean
  onToggleEditor: () => void
  /** 展开时渲染的浮层，锚在条件按钮下方 */
  editor?: ReactNode
  /**
   * 计数（V2KpiStrip）。领导要求把原来独占一行的计数条并进 header，
   * 所以做成插槽：数据在 AppV2/AppV3 手里，这里只负责摆位置。
   * 启动页/条件编辑时会话传 null，header 只剩品牌与图标。
   */
  kpi?: ReactNode
}

export function statusText(
  loading: boolean,
  running: boolean,
  queried: boolean,
  frequency: number,
): string {
  if (loading) return '正在查询'
  if (running) return '持续观测中'
  if (!queried) return '等待开始观测'
  return frequency === 0 ? '单次查询完成' : '观测已暂停'
}

function V2Masthead({
  applied,
  running,
  loading,
  queried,
  lastUpdated,
  theme,
  onToggleTheme,
  sound,
  editing,
  onToggleEditor,
  editor,
  kpi,
}: Props) {
  const isDark = theme === 'dark'
  const text = applied ? statusText(loading, running, queried, applied.frequency) : ''
  // 只有真正在持续轮询时才闪。暂停/单次查询下闪一个静止状态是在骗人。
  const live = running && !loading

  return (
    <header className="v2-masthead flex items-center gap-4 px-5 xl:px-7">
      <span className="v2-mono text-[13px] font-semibold tracking-[0.22em] text-term-amber">
        AISRE
      </span>
      <span className="v2-masthead-subtitle text-[13px] text-term-fg-dim">告警观测</span>

      {kpi}

      <div className="ml-auto flex items-center gap-4">
        {applied ? (
          <>
            <span className="v2-live-status v2-mono flex items-center gap-2 text-[11px] text-term-fg-dim">
              <span
                aria-hidden
                className={[
                  'inline-block h-[6px] w-[6px]',
                  live ? 'bg-term-amber animate-term-pulse' : 'bg-term-fg-mute',
                ].join(' ')}
              />
              {text}
            </span>
            <span className="v2-updated v2-mono text-[11px] text-term-fg-mute">
              {lastUpdated ? `最近更新 ${lastUpdated}` : '尚未获取数据'}
            </span>

            {/* 观测条件按钮挪到右侧、紧挨图标组：模式一的「修改条件」也在这个位置，
                两版头部的右端就对齐了。它是条件展示 + 触发器二合一，所以摆放位置
                直接决定了浮层往哪边展开（见 .v2-popover 的 right: 0）。 */}
            <div className="relative">
              <button
                type="button"
                data-condition-trigger
                onClick={onToggleEditor}
                aria-haspopup="dialog"
                aria-expanded={editing}
                title={editing ? '收起观测条件' : '点击修改观测条件'}
                className={[
                  // nowrap：header 只有 56px 高，条件在一行里放不下时宁可撑宽，
                  // 也不能折成两行顶出 header（窄屏实测过）
                  'v2-mono border px-2.5 py-1 text-[11px] whitespace-nowrap transition-colors duration-100',
                  editing
                    ? 'border-term-amber bg-term-amber/10 text-term-fg'
                    : 'border-term-rule text-term-fg-dim hover:border-term-rule-strong hover:bg-term-hover hover:text-term-fg',
                ].join(' ')}
              >
                {applied.teamName || '全量'} / {applied.systemId || '全部系统'} /{' '}
                {frequencyLabel(applied.frequency)}
              </button>
              {editor}
            </div>
          </>
        ) : null}
        <div className="flex items-center gap-1.5">
          <VersionNav buttonClassName={ICON_BUTTON} iconSize={13} tone="terminal" />
          <button
            type="button"
            onClick={sound.toggleMuted}
            aria-pressed={sound.muted}
            aria-label={sound.muted ? '开启提示音' : '静音提示音'}
            title={soundTitle(sound)}
            className={[
              'grid h-7 w-7 place-items-center border transition-colors duration-100',
              sound.blocked && !sound.muted
                ? 'border-term-amber text-term-amber'
                : 'border-term-rule text-term-fg-dim hover:bg-term-hover hover:text-term-fg',
            ].join(' ')}
          >
            {sound.muted ? (
              <VolumeX size={13} strokeWidth={1.75} />
            ) : (
              <Volume2 size={13} strokeWidth={1.75} />
            )}
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={isDark ? '切换到浅色主题' : '切换到深色主题'}
            title={isDark ? '切换到浅色主题' : '切换到深色主题'}
            className="grid h-7 w-7 place-items-center border border-term-rule text-term-fg-dim transition-colors duration-100 hover:bg-term-hover hover:text-term-fg"
          >
            {isDark ? (
              <Sun size={13} strokeWidth={1.75} />
            ) : (
              <Moon size={13} strokeWidth={1.75} />
            )}
          </button>
        </div>
      </div>
    </header>
  )
}

export default V2Masthead
