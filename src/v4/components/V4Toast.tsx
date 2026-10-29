import { CircleCheck, TriangleAlert } from 'lucide-react'

export type ToastTone = 'success' | 'warning'

type Props = {
  /** 空字符串表示不显示 */
  message: string
  tone: ToastTone
}

/**
 * 轻量提示，样式对齐 ElementUI 的 $message：顶部居中、白底、左侧图标、
 * 几秒后自己消失（计时器在 AppV4 里，这里只负责画）。
 *
 * 两档：success（绿勾，code === 0）/ warning（琥珀色感叹号，code !== 0）。
 *
 * 用 fixed 定位而不是塞进 main 里：它是全局反馈，不该被页面滚动位置和
 * 内容区宽度影响。
 */
function V4Toast({ message, tone }: Props) {
  if (!message) return null

  const Icon = tone === 'warning' ? TriangleAlert : CircleCheck

  return (
    <div
      className={['v4-toast', tone === 'warning' ? 'is-warning' : ''].join(' ')}
      role="status"
      aria-live="polite"
    >
      <Icon size={16} strokeWidth={2.2} />
      <span>{message}</span>
    </div>
  )
}

export default V4Toast
