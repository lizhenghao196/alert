import { safeHref } from '../url'

type Props = {
  alertKey: string
  /** 接口给的原始 event_url。协议校验在这里做，调用方传原值即可。 */
  eventUrl?: string
  /** 悬停态样式由各版本自己给，三版用的是不同的令牌 */
  className?: string
}

/**
 * 告警编号。有安全的 event_url 时渲染成新标签页链接，否则就是纯文本。
 *
 * 抽成一个组件而不是三处各写一遍，是因为 target="_blank" 必须配
 * rel="noopener noreferrer"：漏掉的话被打开的页面能通过 window.opener
 * 反向操作本页（tabnabbing）。把它和 safeHref 锁在一起，调用方没有漏的机会。
 */
function AlertKeyLink({ alertKey, eventUrl, className }: Props) {
  const safe = safeHref(eventUrl ?? '')
  if (!safe) return <>{alertKey}</>

  return (
    <a
      href={safe}
      target="_blank"
      rel="noopener noreferrer"
      title="在新标签页打开事件详情"
      className={className}
    >
      {alertKey}
    </a>
  )
}

export default AlertKeyLink
