import { Moon, Sun } from 'lucide-react'
import type { Theme } from '../theme'

type Props = {
  theme: Theme
  onToggle: () => void
}

function ThemeToggle({ theme, onToggle }: Props) {
  const isDark = theme === 'dark'
  const label = isDark ? '切换到浅色主题' : '切换到深色主题'

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      aria-pressed={isDark}
      title={label}
      className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line text-fg-soft transition-colors duration-200 hover:border-line-strong hover:bg-raise hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
    >
      <span className="relative block h-[17px] w-[17px]">
        <Sun
          size={17}
          strokeWidth={1.9}
          className={[
            'theme-icon absolute inset-0 transition-all duration-300 ease-out',
            isDark ? 'rotate-90 scale-50 opacity-0' : 'rotate-0 scale-100 opacity-100',
          ].join(' ')}
        />
        <Moon
          size={17}
          strokeWidth={1.9}
          className={[
            'theme-icon absolute inset-0 transition-all duration-300 ease-out',
            isDark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-50 opacity-0',
          ].join(' ')}
        />
      </span>
    </button>
  )
}

export default ThemeToggle
