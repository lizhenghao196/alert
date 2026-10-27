import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import type { Row } from '../shape'
import type { ViewFieldType } from './AlarmTable'

/* ────────────────────────── markdown 轻量渲染 ──────────────────────────
   按行拆成块（标题 / 列表项 / 段落），行内再拆成 run（链接 / 加粗 / 代码 / 纯文本）。
   结果交给 React 渲染，不用 dangerouslySetInnerHTML，避免注入风险。 */

const HEADING_RE = /^(#{1,6})\s+(.*)$/
const ORDERED_RE = /^(\d{1,2})[.、]\s+(.*)$/
const UNORDERED_RE = /^[-*+]\s+(.*)$/
const INLINE_RE = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^)\s]+\))/g

type Run = { t: 'text' | 'b' | 'code' | 'a'; v: string; href?: string }
type Block = { type: 'h' | 'li' | 'p'; tag: 'h4' | 'div' | 'p'; marker: string; runs: Run[] }

function inlineRuns(text: string): Run[] {
  const runs: Run[] = []
  let last = 0
  let matched: RegExpExecArray | null
  INLINE_RE.lastIndex = 0
  while ((matched = INLINE_RE.exec(text)) !== null) {
    if (matched.index > last) runs.push({ t: 'text', v: text.slice(last, matched.index) })
    const token = matched[0]
    if (token.slice(0, 2) === '**') {
      runs.push({ t: 'b', v: token.slice(2, -2) })
    } else if (token.charAt(0) === '`') {
      runs.push({ t: 'code', v: token.slice(1, -1) })
    } else {
      const link = token.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/)
      if (link) runs.push({ t: 'a', v: link[1], href: link[2] })
    }
    last = matched.index + token.length
  }
  if (last < text.length) runs.push({ t: 'text', v: text.slice(last) })
  return runs
}

function parseMarkdown(text: string): Block[] {
  const blocks: Block[] = []
  String(text)
    .split('\n')
    .forEach((line) => {
      const trimmed = line.trim()
      if (trimmed === '') return
      let matched = trimmed.match(HEADING_RE)
      if (matched) {
        blocks.push({ type: 'h', tag: 'h4', marker: '', runs: inlineRuns(matched[2]) })
        return
      }
      matched = trimmed.match(ORDERED_RE)
      if (matched) {
        blocks.push({ type: 'li', tag: 'div', marker: `${matched[1]}.`, runs: inlineRuns(matched[2]) })
        return
      }
      matched = trimmed.match(UNORDERED_RE)
      if (matched) {
        blocks.push({ type: 'li', tag: 'div', marker: '•', runs: inlineRuns(matched[1]) })
        return
      }
      blocks.push({ type: 'p', tag: 'p', marker: '', runs: inlineRuns(trimmed) })
    })
  return blocks
}

/* ────────────────────────── 字段分组（更多字段） ────────────────────────── */

// 表格已展示的字段 + 通过按钮展示的字段，剩下的都在「更多字段」里动态展示
const SHOWN_KEYS = ['alertKey', 'summary', 'misinfoReason', 'alertReasonDesc', 'AgentTrace', 'output']
const HIDDEN_KEYS = ['alertSource', 'closedBy']
const SUMMARY_KEYS = ['level', 'status', 'sourceName']
const META_LABELS: Record<string, string> = { level: '告警级别', status: '告警状态', sourceName: '来源' }
const MS_KEYS = ['time', 'gte', 'lte', 'createTime', 'receiveTime']
const GROUP_DEFS: Array<{ name: string; keys: string[] }> = [
  { name: '告警时间', keys: ['startTime', 'endTime', 'createTime', 'receiveTime', 'time'] },
  { name: '告警指标', keys: ['metric', 'actual_value', 'gte', 'lte', 'metric_link'] },
  { name: '系统信息', keys: ['idc', 'runId', 'systemId'] },
]
const CLAMP_CLASS: Record<string, string> = { metric: 'is-clamp2' }
const CELL_WIDTH = 320
const CJK_RE = /[　-〿㐀-䶿一-鿿＀-￯]/
const URL_RE = /^https?:\/\//i

function estWidth(text: string): number {
  let width = 0
  for (let i = 0; i < text.length; i++) width += CJK_RE.test(text.charAt(i)) ? 13 : 6.5
  return width
}

const pad = (n: number) => String(n).padStart(2, '0')

function formatMs(value: unknown): string {
  const num = Number(value)
  if (!isFinite(num) || num < 1e12 || num >= 1e13) return ''
  const d = new Date(num + 8 * 3600 * 1000)
  if (isNaN(d.getTime())) return ''
  const date = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
  const time = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
  return `${date} ${time}`
}

type FieldModel = {
  key: string
  display: string
  href: string
  tooltip: string
  copy: string
  clamp: string
}

function buildField(key: string, raw: unknown): FieldModel {
  const empty = raw === undefined || raw === null || raw === ''
  const value = empty ? '' : String(raw)
  const trimmed = value.trim()
  const human = MS_KEYS.indexOf(key) >= 0 ? formatMs(raw) : ''
  const href = !empty && URL_RE.test(trimmed) ? trimmed : ''
  const display = empty ? '-' : human || href || value
  let tooltip = ''
  if (!empty && (human || estWidth(value) > CELL_WIDTH)) {
    tooltip = human ? `${key}: ${value}` : value
  }
  return { key, display, href, tooltip, copy: value, clamp: CLAMP_CLASS[key] || '' }
}

/* ────────────────────────── 组件 ────────────────────────── */

const TITLES: Record<ViewFieldType, string> = {
  trace: '使用到的智能体',
  report: '告警详情',
  more: '告警详情',
}

type TraceItem = { expert?: unknown; callTime?: unknown; reason?: unknown; skillName?: unknown }

type Props = {
  visible: boolean
  type: ViewFieldType
  item: Row
  onClose: () => void
}

/**
 * 字段查看弹窗（对应 RuoYi 的 FieldDialog）。
 *
 *   trace  使用到的智能体：AgentTrace 列表
 *   report 告警详情：把 output 当 markdown 渲染
 *   more   更多字段：摘要区 + 按分组罗列其余字段（原页面已无入口，这里保留同款能力）
 */
function FieldDialog({ visible, type, item, onClose }: Props) {
  const [copied, setCopied] = useState('')

  useEffect(() => {
    if (!visible) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [visible, onClose])

  const headKey = item && item.alertKey !== undefined && item.alertKey !== null ? String(item.alertKey) : ''
  const summaryText = item && item.summary ? String(item.summary) : ''
  const isMore = type === 'more'

  const metaItems = useMemo(() => {
    const source = item || {}
    return SUMMARY_KEYS.filter((key) => {
      const val = source[key]
      return val !== undefined && val !== null && val !== ''
    }).map((key) => ({ key, label: META_LABELS[key], value: String(source[key]) }))
  }, [item])

  const traceList = useMemo<TraceItem[]>(() => {
    const list = item && item.AgentTrace
    return Array.isArray(list) ? (list.filter((t) => t && typeof t === 'object') as TraceItem[]) : []
  }, [item])

  const reportBlocks = useMemo(() => {
    const text = item && item.output
    if (text === undefined || text === null || text === '') return []
    return parseMarkdown(String(text))
  }, [item])

  const fieldGroups = useMemo(() => {
    if (!isMore) return []
    const source = item || {}
    const keys = Object.keys(source).filter(
      (key) => SHOWN_KEYS.indexOf(key) < 0 && HIDDEN_KEYS.indexOf(key) < 0 && SUMMARY_KEYS.indexOf(key) < 0,
    )
    const groups = GROUP_DEFS.map((def) => ({
      name: def.name,
      keys: def.keys.filter((key) => keys.indexOf(key) >= 0),
    }))
    const grouped = groups.reduce<string[]>((acc, group) => acc.concat(group.keys), [])
    const rest = keys.filter((key) => grouped.indexOf(key) < 0)
    if (rest.length > 0) groups.push({ name: '其他信息', keys: rest })
    return groups
      .filter((group) => group.keys.length > 0)
      .map((group) => ({
        name: group.name,
        fields: group.keys.map((key) => buildField(key, source[key])),
      }))
  }, [item, isMore])

  if (!visible) return null

  const copy = (value: string) => {
    navigator.clipboard?.writeText(value).then(
      () => {
        setCopied(value)
        window.setTimeout(() => setCopied(''), 1200)
      },
      () => undefined,
    )
  }

  return (
    <div className="aa-dialog-mask" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <div className="aa-dialog" role="dialog" aria-modal="true" aria-label={TITLES[type]}>
        <header className="aa-dialog__head">
          <div className="aa-dialog__title">
            <span className="aa-dialog__title-main">{TITLES[type]}</span>
            {headKey ? (
              <span className="aa-dialog__title-sub" title={headKey}>
                {headKey}
              </span>
            ) : null}
          </div>
          <button type="button" className="aa-dialog__close" aria-label="关闭" onClick={onClose}>
            <X size={16} strokeWidth={2} />
          </button>
        </header>

        <div className="aa-dialog__body">
          {type === 'trace' ? (
            traceList.length > 0 ? (
              <div className="aa-fd__trace">
                {traceList.map((trace, index) => {
                  const skills = Array.isArray(trace.skillName) ? trace.skillName : []
                  return (
                    <div className="aa-fd__trace-item" key={index}>
                      <div className="aa-fd__trace-head">
                        <span className="aa-fd__trace-index">{index + 1}</span>
                        <span className="aa-fd__trace-expert">{String(trace.expert ?? '')}</span>
                        {skills.length > 0 ? (
                          <div className="aa-fd__trace-skills">
                            {skills.map((skill) => (
                              <span className="aa-fd__trace-skill" key={String(skill)}>
                                {String(skill)}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        <span className="aa-fd__trace-time">{String(trace.callTime ?? '')}</span>
                      </div>
                      <div className="aa-fd__trace-reason">{String(trace.reason ?? '')}</div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="aa-dialog__empty">该告警无智能体调用记录</div>
            )
          ) : null}

          {type === 'report' ? (
            reportBlocks.length > 0 ? (
              <div className="aa-fd__report">
                {reportBlocks.map((block, index) => (
                  <BlockView key={index} block={block} />
                ))}
              </div>
            ) : (
              <div className="aa-dialog__empty">该告警暂无告警详情</div>
            )
          ) : null}

          {isMore ? (
            <>
              <div className="aa-fd-summary">
                {metaItems.length > 0 ? (
                  <div className="aa-fd-summary__meta">
                    {metaItems.map((meta) => (
                      <span className="aa-fd-summary__meta-item" key={meta.key}>
                        <span className="aa-fd-summary__meta-label">{meta.label}</span>
                        <span className="aa-fd-summary__meta-tag">{meta.value}</span>
                      </span>
                    ))}
                  </div>
                ) : null}
                {summaryText ? (
                  <div className="aa-fd-summary__content">
                    <div className="aa-fd-summary__label">告警摘要</div>
                    <div className="aa-fd-summary__text" title={summaryText}>
                      {summaryText}
                    </div>
                  </div>
                ) : null}
              </div>

              {fieldGroups.map((group) => (
                <div className="aa-fd-group" key={group.name}>
                  <div className="aa-fd-group__title">{group.name}</div>
                  <div className="aa-fd-group__grid">
                    {group.fields.map((field) => (
                      <div className="aa-fd-field" key={field.key}>
                        <div className="aa-fd-field__label" title={field.key}>
                          {field.key}
                        </div>
                        <div className={`aa-fd-field__value ${field.clamp}`} title={field.tooltip}>
                          {field.href ? (
                            <a
                              className="aa-fd-field__link"
                              href={field.href}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {field.display}
                            </a>
                          ) : (
                            field.display
                          )}
                        </div>
                        <button
                          type="button"
                          className="aa-fd-field__copy"
                          title={copied === field.copy ? '已复制' : '复制原始值'}
                          onClick={() => copy(field.copy)}
                        >
                          {copied === field.copy ? '已复制' : '复制'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}

/** 单个 markdown 块（标题 / 列表项 / 段落） */
function BlockView({ block }: { block: Block }): ReactNode {
  const Tag = block.tag
  return (
    <Tag className={`aa-fd__report-block is-${block.type}`}>
      {block.marker ? <span className="aa-fd__report-marker">{block.marker}</span> : null}
      {block.runs.map((run, index) => {
        if (run.t === 'a') {
          return (
            <a
              key={index}
              className="aa-fd__report-link"
              href={run.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              {run.v}
            </a>
          )
        }
        if (run.t === 'code') {
          return (
            <code key={index} className="aa-fd__report-code">
              {run.v}
            </code>
          )
        }
        if (run.t === 'b') return <strong key={index}>{run.v}</strong>
        return <span key={index}>{run.v}</span>
      })}
    </Tag>
  )
}

export default FieldDialog
