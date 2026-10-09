/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // 全部指向 index.css 里的 CSS 变量，<alpha-value> 让 bg-abnormal/10
      // 这类修饰符可用，主题切换时无需改任何 className。
      colors: {
        canvas: 'rgb(var(--c-canvas) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        panel: 'rgb(var(--c-panel) / <alpha-value>)',
        raise: 'rgb(var(--c-raise) / <alpha-value>)',
        line: {
          DEFAULT: 'rgb(var(--c-line) / <alpha-value>)',
          strong: 'rgb(var(--c-line-2) / <alpha-value>)',
        },
        fg: {
          DEFAULT: 'rgb(var(--c-fg) / <alpha-value>)',
          soft: 'rgb(var(--c-fg-2) / <alpha-value>)',
          mute: 'rgb(var(--c-fg-3) / <alpha-value>)',
        },
        accent: 'rgb(var(--c-accent) / <alpha-value>)',
        'on-accent': 'rgb(var(--c-on-accent) / <alpha-value>)',
        abnormal: 'rgb(var(--c-abnormal) / <alpha-value>)',
        normal: 'rgb(var(--c-normal) / <alpha-value>)',
        warn: 'rgb(var(--c-warn) / <alpha-value>)',

        // v2「值班终端」的令牌，定义在 .v2-root 下。与上面的 --c-* 完全隔离，
        // 两个版本可以在同一个文档里并存而不互相污染。
        term: {
          bg: 'rgb(var(--t-bg) / <alpha-value>)',
          alt: 'rgb(var(--t-bg-alt) / <alpha-value>)',
          rule: {
            DEFAULT: 'rgb(var(--t-rule) / <alpha-value>)',
            strong: 'rgb(var(--t-rule-2) / <alpha-value>)',
          },
          fg: {
            DEFAULT: 'rgb(var(--t-fg) / <alpha-value>)',
            dim: 'rgb(var(--t-fg-dim) / <alpha-value>)',
            mute: 'rgb(var(--t-fg-mute) / <alpha-value>)',
          },
          hover: 'rgb(var(--t-hover) / <alpha-value>)',
          amber: 'rgb(var(--t-amber) / <alpha-value>)',
          ok: 'rgb(var(--t-ok) / <alpha-value>)',
          alert: 'rgb(var(--t-alert) / <alpha-value>)',
        },
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        lift: 'var(--shadow-lift)',
        pop: 'var(--shadow-pop)',
      },
      keyframes: {
        statusPulse: {
          '0%, 100%': {
            opacity: '1',
            transform: 'scale(1)',
            boxShadow: '0 0 0 0 rgb(var(--c-normal) / 0.5)',
          },
          '50%': {
            opacity: '0.55',
            transform: 'scale(1.18)',
            boxShadow: '0 0 0 6px rgb(var(--c-normal) / 0)',
          },
        },
        accentBreathe: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.35' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        fadeSlideIn: {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'none' },
        },
        cardIn: {
          from: { opacity: '0', transform: 'translateY(10px) scale(0.985)' },
          to: { opacity: '1', transform: 'none' },
        },
        termPulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.2' },
        },
        termSweep: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '15%': { opacity: '1' },
          '100%': { transform: 'translateX(100%)', opacity: '0' },
        },
      },
      animation: {
        'status-pulse': 'statusPulse 2s ease-in-out infinite',
        'accent-breathe': 'accentBreathe 3s ease-in-out infinite',
        shimmer: 'shimmer 1.4s ease-in-out infinite',
        // 用 backwards 而不是 both：both 会让动画的终态一直压着 CSS，
        // 卡片的 hover:-translate-y 就永远不生效了。
        'fade-slide-in': 'fadeSlideIn 0.2s cubic-bezier(0.4, 0, 0.2, 1) backwards',
        'card-in': 'cardIn 0.34s cubic-bezier(0.16, 1, 0.3, 1) backwards',
        'term-pulse': 'termPulse 1.8s steps(1, end) infinite',
        'term-sweep': 'termSweep 0.7s cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
}
