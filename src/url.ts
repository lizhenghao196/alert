/**
 * 只放行 http/https，并拒掉带凭据的 URL，避免 href 变成 javascript: 之类的注入点。
 * v1 的 AlertCard 里有一份等价的私有实现，等版本定下来后统一到这里。
 */
export function safeHref(value: string): string {
  try {
    const url = new URL(value)
    if (!['http:', 'https:'].includes(url.protocol)) return ''
    if (url.username || url.password) return ''
    return url.href
  } catch {
    return ''
  }
}
