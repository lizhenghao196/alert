import { useState } from 'react'
import { ChevronDown, Clock, ExternalLink, FileText, ShieldCheck, UserRound, X } from 'lucide-react'
import SummaryTooltip from '../../components/SummaryTooltip'
import { safeHref } from '../../url'
import type { Alert, FilterStatus } from '../../types'

type Props = {
  abnormal: Alert[]
  normal: Alert[]
  filter: FilterStatus
  loading: boolean
  onOpenReport: (row: Alert) => void
  onCloseAlert: (row: Alert) => void
}

type AlertWithEventUrl = Alert & { event_url?: string }

function eventHref(row: Alert): string {
  return safeHref((row as AlertWithEventUrl).event_url ?? '')
}

/**
 * 告警时间。alertTime 是后端待上线的新字段，缺失时渲染 "--" 占位，
 * 位置先占住，字段上线后不用再动结构。
 */
function AlertTime({ row }: { row: Alert }) {
  return (
    <span className="v4-alert-time" title="告警时间">
      <Clock size={11} strokeWidth={1.9} />
      {row.alertTime || '--'}
    </span>
  )
}

/**
 * 处理人。后端给的是 "刘兴贵1(19129506274)" 这种「姓名 + 括号」的整体字符串，
 * 原样展示：不解析括号、不加统一前缀、不做二次排版，字段里是什么就显示什么
 * （括号里未必是手机号，拆开或改写都会丢信息）。
 * 悬浮提示也直接用原值，不改写。
 *
 * 排版：整串固定一行，放不下就省略号（不是换行、也不是从中间掰断），
 * 完整值靠 title 悬浮看——文字包一层 span 是为了让省略号有落脚点，
 * 匿名 flex 项挂不了 text-overflow。
 */
function Assignee({ row }: { row: Alert }) {
  return (
    <span className="v4-assignee" title={row.assignee || undefined}>
      <UserRound size={12} strokeWidth={1.9} />
      <span className="v4-assignee-text">{row.assignee || '--'}</span>
    </span>
  )
}

/**
 * 「查看报告 / 告警详情」两个入口。异常卡和正常行展开后共用同一组，
 * 中间那道竖线只是把它俩归成一组，不参与点击。
 */
function CardLinks({ row, onOpenReport }: { row: Alert; onOpenReport: () => void }) {
  const detailHref = safeHref(row.href)

  return (
    <div className="v4-card-links">
      {row.msg ? (
        <button type="button" onClick={onOpenReport}>
          <FileText size={12} />
          查看报告
        </button>
      ) : (
        <span>报告生成中</span>
      )}
      <i className="v4-link-divider" aria-hidden />
      {detailHref ? (
        <a href={detailHref} target="_blank" rel="noopener noreferrer">
          告警详情
          <ExternalLink size={11} />
        </a>
      ) : (
        <span>暂无详情链接</span>
      )}
    </div>
  )
}

function V4Body({ abnormal, normal, filter, loading, onOpenReport, onCloseAlert }: Props) {
  const [expandedNormalKey, setExpandedNormalKey] = useState<string | null>(null)
  const density = abnormal.length <= 2 ? 'detail' : abnormal.length >= 6 ? 'compact' : 'standard'

  if (filter === 'abnormal') {
    return (
      <div className="v4-workspace is-single">
        <AbnormalSection
          rows={abnormal}
          density={density}
          onOpenReport={onOpenReport}
          onCloseAlert={onCloseAlert}
        />
      </div>
    )
  }

  if (filter === 'normal') {
    return (
      <div className="v4-workspace is-single">
        <NormalSection
          rows={normal}
          expandedKey={expandedNormalKey}
          onToggle={setExpandedNormalKey}
          onOpenReport={onOpenReport}
        />
      </div>
    )
  }

  return (
    <div className={`v4-workspace is-split${loading ? ' is-refreshing' : ''}`}>
      <AbnormalSection
        rows={abnormal}
        density={density}
        onOpenReport={onOpenReport}
        onCloseAlert={onCloseAlert}
      />
      <NormalSection
        rows={normal}
        expandedKey={expandedNormalKey}
        onToggle={setExpandedNormalKey}
        onOpenReport={onOpenReport}
      />
    </div>
  )
}

function AbnormalSection({
  rows,
  density,
  onOpenReport,
  onCloseAlert,
}: {
  rows: Alert[]
  density: 'detail' | 'standard' | 'compact'
  onOpenReport: (row: Alert) => void
  onCloseAlert: (row: Alert) => void
}) {
  return (
    <section className="v4-abnormal-section">
      <SectionHeading title="异常告警" count={rows.length} tone="abnormal" />
      {rows.length ? (
        <div className={`v4-abnormal-grid is-${density}`}>
          {rows.map((row, index) => (
            <AbnormalCard
              key={`${row.alertKey}:${row.systemId}:${index}`}
              row={row}
              density={density}
              onOpenReport={() => onOpenReport(row)}
              onCloseAlert={() => onCloseAlert(row)}
            />
          ))}
        </div>
      ) : (
        <HealthyState />
      )}
    </section>
  )
}

function AbnormalCard({
  row,
  density,
  onOpenReport,
  onCloseAlert,
}: {
  row: Alert
  density: 'detail' | 'standard' | 'compact'
  onOpenReport: () => void
  onCloseAlert: () => void
}) {
  const clamp = density === 'detail' ? 'line-clamp-4' : density === 'compact' ? 'line-clamp-2' : 'line-clamp-3'

  return (
    <article className="v4-abnormal-card">
      <div className="v4-card-head">
        {/* 系统名一行省略（见 .v4-card-head h3 的 nowrap + ellipsis），
            超长时靠 title 悬浮看全，跟旁边的类型徽标同一套做法 */}
        <h3 title={row.systemId || '未标注系统'}>{row.systemId || '未标注系统'}</h3>
        {/* 徽标和叉号成组贴右：不再被 space-between 甩到卡片中间，
            两者各自超长时都走省略号（见 .v4-card-head-right 的宽度上限） */}
        <div className="v4-card-head-right">
          {row.type ? (
            <span className="v4-progress-chip" title={row.type}>
              {row.type}
            </span>
          ) : null}
          {/* 关闭告警：右上角的叉号，负外边距让它更贴卡片右边缘 */}
          <button
            type="button"
            className="v4-card-close"
            aria-label="关闭告警"
            title="关闭告警"
            onClick={onCloseAlert}
          >
            <X size={13} strokeWidth={2.4} />
          </button>
        </div>
      </div>

      {/* 告警单号 + 告警时间同一行：单号占剩余宽度、超长省略，时间贴右不换行 */}
      <div className="v4-alert-key">
        <span className="v4-alert-key-text">
          <AlertKey row={row} />
        </span>
        <AlertTime row={row} />
      </div>

      <div className="v4-card-summary">
        <SummaryTooltip text={row.summary || '暂无告警描述'} className={`${clamp} break-words`} />
      </div>

      {/* 底部一行两区：左是查看报告 / 告警详情，右是处理人 */}
      <footer className="v4-card-actions">
        <CardLinks row={row} onOpenReport={onOpenReport} />
        <Assignee row={row} />
      </footer>
    </article>
  )
}

function NormalSection({
  rows,
  expandedKey,
  onToggle,
  onOpenReport,
}: {
  rows: Alert[]
  expandedKey: string | null
  onToggle: (key: string | null) => void
  onOpenReport: (row: Alert) => void
}) {
  return (
    <section className="v4-normal-section">
      <SectionHeading title="正常 · AI处理进度" count={rows.length} tone="normal" />
      <div className="v4-normal-columns" aria-hidden="true">
        <span>所属系统</span>
        <span>告警编号</span>
        <span>处理进度</span>
        <span />
      </div>
      <div className="v4-normal-list">
        {rows.length ? (
          rows.map((row, index) => {
            const itemKey = `${row.alertKey}:${row.systemId}:${index}`
            const expanded = expandedKey === itemKey
            return (
              <NormalItem
                key={itemKey}
                row={row}
                expanded={expanded}
                onToggle={() => onToggle(expanded ? null : itemKey)}
                onOpenReport={() => onOpenReport(row)}
              />
            )
          })
        ) : (
          <div className="v4-section-empty">暂无正常数据</div>
        )}
      </div>
    </section>
  )
}

function NormalItem({
  row,
  expanded,
  onToggle,
  onOpenReport,
}: {
  row: Alert
  expanded: boolean
  onToggle: () => void
  onOpenReport: () => void
}) {
  return (
    <article className={expanded ? 'v4-normal-item is-expanded' : 'v4-normal-item'}>
      <div className="v4-normal-row">
        <span className="v4-normal-system">{row.systemId || '未标注系统'}</span>
        <span className="v4-normal-key">
          <AlertKey row={row} />
        </span>
        <span className="v4-normal-type">{row.type || '—'}</span>
        <button
          type="button"
          className="v4-expand-button"
          aria-expanded={expanded}
          aria-label={expanded ? '收起正常告警详情' : '展开正常告警详情'}
          title={expanded ? '收起详情' : '展开详情'}
          onClick={onToggle}
        >
          <ChevronDown size={14} strokeWidth={2} />
        </button>
      </div>

      {expanded ? (
        <div className="v4-normal-detail">
          <p>{row.summary || '暂无告警描述'}</p>
          {/* 跟异常卡同一套排布：左侧两个入口，右侧时间 + 处理人 */}
          <div>
            <CardLinks row={row} onOpenReport={onOpenReport} />
            <span className="v4-normal-meta">
              <AlertTime row={row} />
              <Assignee row={row} />
            </span>
          </div>
        </div>
      ) : null}
    </article>
  )
}

function AlertKey({ row }: { row: Alert }) {
  const href = eventHref(row)
  // 单号占剩余宽度、超长会省略，所以悬浮提示里带上完整值（同 v4-progress-chip）
  if (!href) return <span title={row.alertKey}>{row.alertKey}</span>

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={`${row.alertKey} · 在新标签页打开事件详情`}
    >
      {row.alertKey}
    </a>
  )
}

function HealthyState() {
  return (
    <div className="v4-healthy">
      <ShieldCheck size={30} strokeWidth={1.7} />
      <div>
        <span>当前无异常</span>
        <p>观测范围内的告警状态均正常，右侧仍会持续展示全部正常数据。</p>
      </div>
    </div>
  )
}

function SectionHeading({
  title,
  count,
  tone,
}: {
  title: string
  count: number
  tone: 'abnormal' | 'normal'
}) {
  return (
    <header className={`v4-section-heading is-${tone}`}>
      <span>{title}</span>
      <strong>{count}</strong>
    </header>
  )
}

export function V4BodySkeleton() {
  return (
    <div className="v4-workspace is-split" aria-label="正在加载告警">
      <section className="v4-abnormal-section">
        <div className="v4-skeleton-heading" />
        <div className="v4-abnormal-grid is-standard">
          {[0, 1, 2].map((item) => (
            <div key={item} className="v4-skeleton-card">
              <div className="v4-skeleton-line w-20" />
              <div className="v4-skeleton-line mt-5 w-full" />
              <div className="v4-skeleton-line mt-2 w-4/5" />
            </div>
          ))}
        </div>
      </section>
      <section className="v4-normal-section">
        <div className="v4-skeleton-heading" />
        <div className="p-3">
          <div className="v4-skeleton-line w-full" />
          <div className="v4-skeleton-line mt-4 w-full" />
          <div className="v4-skeleton-line mt-4 w-full" />
        </div>
      </section>
    </div>
  )
}

export default V4Body
