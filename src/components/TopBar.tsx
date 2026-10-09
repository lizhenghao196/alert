import { Radar, Volume2, VolumeX } from 'lucide-react'
import ThemeToggle from './ThemeToggle'
import VersionNav from './VersionNav'
import type { AlertSound } from '../hooks/useAlertSound'
import type { Theme } from '../theme'

type Props = {
  theme: Theme
  onToggleTheme: () => void
  sound: AlertSound
}

/** 与 ThemeToggle / 提示音按钮同形：三个图标并排时尺寸才一致 */
const ICON_BUTTON =
  'grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line text-fg-soft transition-colors duration-200 hover:border-line-strong hover:bg-raise hover:text-fg'

function soundTitle(sound: AlertSound): string {
  if (sound.blocked && !sound.muted) {
    return '浏览器拦截了自动播放，点击页面任意处即可启用提示音'
  }
  return sound.muted ? '提示音已静音，点击开启' : '发现新的异常告警时播提示音，点击静音'
}

/**
 * 盖在启动页和观测页之上。两种状态下都渲染同一个顶栏，切换按钮才不会跳位。
 */
function TopBar({ theme, onToggleTheme, sound }: Props) {
  const blocked = sound.blocked && !sound.muted

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur-md">
      <div className="flex h-14 items-center gap-2.5 px-4 md:px-6 xl:px-10">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-accent/10 text-accent">
          <Radar size={16} strokeWidth={2} />
        </span>
        <h1 className="truncate text-[15px] font-semibold tracking-tight text-fg">
          告警实时观测
        </h1>
        <div className="ml-auto flex items-center gap-2">
          <VersionNav buttonClassName={ICON_BUTTON} />
          <button
            type="button"
            onClick={sound.toggleMuted}
            aria-pressed={sound.muted}
            aria-label={sound.muted ? '开启提示音' : '静音提示音'}
            title={soundTitle(sound)}
            className={[
              'grid h-9 w-9 shrink-0 place-items-center rounded-full border transition-colors duration-200',
              blocked
                ? 'border-warn text-warn'
                : 'border-line text-fg-soft hover:border-line-strong hover:bg-raise hover:text-fg',
            ].join(' ')}
          >
            {sound.muted ? (
              <VolumeX size={16} strokeWidth={1.9} />
            ) : (
              <Volume2 size={16} strokeWidth={1.9} />
            )}
          </button>
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </div>
      </div>
    </header>
  )
}

export default TopBar
