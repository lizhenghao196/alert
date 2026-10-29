import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { TriangleAlert, X } from 'lucide-react'
import { ApiError, closeAlert } from '../../api'
import type { RecoverStatus } from '../../api'
import { useAnimatedDialog } from '../../hooks/useAnimatedDialog'
import type { Alert } from '../../types'
import V4Select from './V4Select'

type Props = {
  /** 要关闭的告警；null 表示弹窗关闭 */
  row: Alert | null
  onClose: () => void
  /** 请求完成：带上后端返回的文案和业务是否成功，父级负责提示 + 刷新 */
  onSubmitted: (row: Alert, message: string, ok: boolean) => void
}

/**
 * 告警原因类别。value 就是提交上去的 misinfoReason，和后端给的可选项一一对应。
 */
const REASON_CATEGORIES = [
  '业务活动影响',
  '变更发布引起',
  '性能容量问题',
  '第三方故障',
  '告警配置设置不当',
  '监控系统自身问题',
  '监控配置调试',
  '应用程序问题',
  '设备故障',
  '基础设施故障',
  '数据质量',
  '总行原因',
  '软件产品缺陷',
  '硬件产品缺陷',
]

/** 告警是否恢复的选项，值原样提交给后端 */
const RECOVER_OPTIONS: RecoverStatus[] = ['未经处置自行恢复', '未恢复', '经处置恢复']

/** 告警是否恢复的默认值 */
const DEFAULT_RECOVER: RecoverStatus = '未经处置自行恢复'

/** 告警影响评估的默认值，也是需求里写死的初值 */
const DEFAULT_IMPACT = '无业务影响'

/** 告警原因描述的字数下限 */
const MIN_REASON_LENGTH = 10

const FIELD =
  'w-full rounded-lg border border-line bg-surface px-3 py-2 text-[13px] leading-6 text-fg transition-colors duration-200 placeholder:text-fg-mute focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25'

const FIELD_ERROR = 'border-abnormal focus:border-abnormal focus:ring-abnormal/20'

const LABEL = 'flex flex-col gap-1.5 text-xs font-medium text-fg-soft'

type Errors = {
  category?: string
  reason?: string
  forceReason?: string
  processDesc?: string
}

function V4CloseAlertDialog({ row, onClose, onSubmitted }: Props) {
  const open = row !== null
  const { ref, requestClose, handlers } = useAnimatedDialog(open, onClose)

  // 退场动画期间 row 已经被父级置空，留一份快照，避免标题区先空掉
  const [snapshot, setSnapshot] = useState<Alert | null>(null)

  const [category, setCategory] = useState('')
  const [reason, setReason] = useState('')
  const [recovered, setRecovered] = useState<RecoverStatus>(DEFAULT_RECOVER)
  const [forceReason, setForceReason] = useState('')
  const [processDesc, setProcessDesc] = useState('')
  const [impact, setImpact] = useState(DEFAULT_IMPACT)
  const [errors, setErrors] = useState<Errors>({})
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // 每次换一条告警都重置表单：上一条填的内容不该带到下一条上。
  // 原因描述优先用接口带回来的 reason 预填，没有才留空。
  useEffect(() => {
    if (!row) return
    setSnapshot(row)
    setCategory('')
    setReason(row.reason?.trim() ?? '')
    setRecovered(DEFAULT_RECOVER)
    setForceReason('')
    setProcessDesc('')
    setImpact(DEFAULT_IMPACT)
    setErrors({})
    setSubmitError('')
    setSubmitting(false)
  }, [row])

  const reasonLength = reason.trim().length
  /** 选「未恢复」才要关单理由，选「经处置恢复」才要处置说明，另一个不传 */
  const needForceReason = recovered === '未恢复'
  const needProcessDesc = recovered === '经处置恢复'

  /** 提交中不允许关弹窗：关掉了请求还在跑，成功回调就没地方落 */
  const guardClose = () => {
    if (submitting) return
    requestClose()
  }

  const validate = (): boolean => {
    const next: Errors = {}
    if (!category) next.category = '请选择告警原因类别'
    if (reasonLength === 0) next.reason = '请填写告警原因描述'
    else if (reasonLength < MIN_REASON_LENGTH) {
      next.reason = `告警原因描述不少于 ${MIN_REASON_LENGTH} 个字（当前 ${reasonLength} 个）`
    }
    if (needForceReason && !forceReason.trim()) next.forceReason = '请说明关单理由'
    if (needProcessDesc && !processDesc.trim()) next.processDesc = '请说明处置内容'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting || !snapshot) return
    if (!validate()) return

    setSubmitting(true)
    setSubmitError('')
    try {
      const result = await closeAlert({
        alertKey: snapshot.alertKey,
        misinfoReason: category,
        reason: reason.trim(),
        recover: recovered,
        // 两个补充字段互斥：选中的那个才带值，另一个固定传空串
        forceReason: needForceReason ? forceReason.trim() : '',
        processDesc: needProcessDesc ? processDesc.trim() : '',
        impact: impact.trim() || DEFAULT_IMPACT,
      })
      // 请求成功（HTTP 200）就关窗 + 重查；业务是否成功只影响提示的样式和文案，
      // 由父级根据 ok 决定弹 success 还是 warning
      onSubmitted(snapshot, result.msg, result.ok)
      requestClose()
    } catch (error) {
      // ApiError 的 message 本身就是一句完整的话（含"请稍后重试"），原样显示；
      // 网络层的 TypeError 才是那句没头没尾的英文，统一换成人话
      setSubmitError(
        error instanceof ApiError ? error.message : '提交失败，请稍后重试。',
      )
      setSubmitting(false)
    }
  }

  return (
    <dialog
      ref={ref}
      className="report-dialog m-auto max-h-[86vh] w-[min(640px,calc(100vw-32px))] overflow-hidden rounded-2xl border border-line bg-panel text-fg shadow-pop"
      aria-labelledby="close-alert-title"
      // 只认「右上角叉号」和「取消」两个出口：
      // 点遮罩、按 Esc 都不关——填了一半的表单被误触清掉太亏，preventDefault
      // 拦掉浏览器默认的 Esc 关闭。
      onCancel={(event) => event.preventDefault()}
      onAnimationEnd={handlers.onAnimationEnd}
    >
      {snapshot ? (
        <form className="flex max-h-[86vh] flex-col" onSubmit={handleSubmit} noValidate>
          <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div className="min-w-0">
              <h3 id="close-alert-title" className="text-[16px] font-semibold text-fg">
                关闭告警
              </h3>
              <p className="mt-1 truncate font-mono text-[11px] text-fg-mute tabular-nums">
                {snapshot.systemId || '未标注系统'} · {snapshot.alertKey}
              </p>
            </div>
            <button
              type="button"
              onClick={guardClose}
              aria-label="关闭弹窗"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-line text-fg-soft transition-colors duration-200 hover:bg-raise hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            >
              <X size={15} strokeWidth={2} />
            </button>
          </header>

          <div className="flex flex-col gap-4 overflow-y-auto px-5 py-4">
            <div className={LABEL}>
              <span>
                告警原因类别
                <Required />
              </span>
              <V4Select
                value={category}
                options={REASON_CATEGORIES}
                placeholder="请选择告警原因类别"
                invalid={Boolean(errors.category)}
                onChange={(next) => {
                  setCategory(next)
                  if (errors.category) setErrors((prev) => ({ ...prev, category: undefined }))
                }}
              />
              <FieldError message={errors.category} />
            </div>

            <label className={LABEL}>
              <span className="flex items-baseline justify-between gap-3">
                <span>
                  告警原因描述
                  <Required />
                </span>
                <span
                  className={[
                    'text-[11px] font-normal tabular-nums',
                    reasonLength >= MIN_REASON_LENGTH ? 'text-normal' : 'text-fg-mute',
                  ].join(' ')}
                >
                  {reasonLength >= MIN_REASON_LENGTH
                    ? `${reasonLength} 字`
                    : `至少 ${MIN_REASON_LENGTH} 字`}
                </span>
              </span>
              <textarea
                className={[FIELD, 'resize-none', errors.reason ? FIELD_ERROR : ''].join(' ')}
                rows={4}
                maxLength={500}
                placeholder="描述这次告警的原因，不少于 10 个字"
                value={reason}
                aria-invalid={Boolean(errors.reason)}
                onChange={(event) => {
                  setReason(event.target.value)
                  if (errors.reason) setErrors((prev) => ({ ...prev, reason: undefined }))
                }}
              />
              <FieldError message={errors.reason} />
            </label>

            <div className={LABEL}>
              <span>
                告警是否恢复
                <Required />
              </span>
              <V4Select
                value={recovered}
                options={RECOVER_OPTIONS}
                placeholder="请选择告警是否恢复"
                onChange={(next) => {
                  setRecovered(next as RecoverStatus)
                  // 切走时把另一条分支的报错清掉，免得提交后还挂着一句过期的红字
                  setErrors((prev) => ({ ...prev, forceReason: undefined, processDesc: undefined }))
                }}
              />
            </div>

            {/* 关单理由：只有选「未恢复」才出现 */}
            {needForceReason ? (
              <label className={LABEL}>
                <span>
                  关单理由
                  <Required />
                </span>
                <textarea
                  className={[FIELD, 'resize-none', errors.forceReason ? FIELD_ERROR : ''].join(' ')}
                  rows={2}
                  maxLength={200}
                  placeholder="说明为什么告警还没恢复也要关单"
                  value={forceReason}
                  aria-invalid={Boolean(errors.forceReason)}
                  onChange={(event) => {
                    setForceReason(event.target.value)
                    if (errors.forceReason) {
                      setErrors((prev) => ({ ...prev, forceReason: undefined }))
                    }
                  }}
                />
                <FieldError message={errors.forceReason} />
              </label>
            ) : null}

            {/* 处置说明：只有选「经处置恢复」才出现 */}
            {needProcessDesc ? (
              <label className={LABEL}>
                <span>
                  处置说明
                  <Required />
                </span>
                <textarea
                  className={[FIELD, 'resize-none', errors.processDesc ? FIELD_ERROR : ''].join(' ')}
                  rows={2}
                  maxLength={200}
                  placeholder="说明做了哪些处置动作，告警得以恢复"
                  value={processDesc}
                  aria-invalid={Boolean(errors.processDesc)}
                  onChange={(event) => {
                    setProcessDesc(event.target.value)
                    if (errors.processDesc) {
                      setErrors((prev) => ({ ...prev, processDesc: undefined }))
                    }
                  }}
                />
                <FieldError message={errors.processDesc} />
              </label>
            ) : null}

            <label className={LABEL}>
              <span>告警影响评估</span>
              <input
                type="text"
                className={FIELD}
                maxLength={100}
                placeholder={DEFAULT_IMPACT}
                value={impact}
                onChange={(event) => setImpact(event.target.value)}
              />
            </label>

            {submitError ? (
              <div className="flex items-start gap-2 rounded-lg border border-abnormal/40 bg-abnormal/5 px-3 py-2 text-[11.5px] leading-5 text-abnormal">
                <TriangleAlert size={14} strokeWidth={2} className="mt-0.5 shrink-0" />
                {submitError}
              </div>
            ) : null}
          </div>

          <footer className="flex items-center justify-end gap-2.5 border-t border-line bg-surface/60 px-5 py-3">
            <button
              type="button"
              disabled={submitting}
              className="h-9 rounded-lg border border-line px-4 text-[13px] text-fg-soft transition-colors duration-200 hover:bg-raise hover:text-fg disabled:cursor-not-allowed disabled:opacity-60"
              onClick={guardClose}
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent px-4 text-[13px] font-semibold text-on-accent transition-[filter,opacity] duration-200 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? '提交中…' : '确定'}
            </button>
          </footer>
        </form>
      ) : null}
    </dialog>
  )
}

function Required() {
  return (
    <span className="ml-0.5 text-abnormal" aria-hidden>
      *
    </span>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <span className="text-[11px] font-normal text-abnormal">{message}</span>
}

export default V4CloseAlertDialog
