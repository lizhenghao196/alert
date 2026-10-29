import type { ReactNode } from 'react'
import {
  Activity,
  FilePlus2,
  History,
  Radar,
  SlidersHorizontal,
  Volume2,
  VolumeX,
} from 'lucide-react'
import ThemeToggle from './ThemeToggle'
import VersionNav from './VersionNav'
import { HISTORY_HREF, PROBLEM_HREF } from '../version'
import { frequencyLabel, type FilterStatus, type Selection } from '../types'
import type { Theme } from '../theme'

type Counts = { total: number; abnormal: number; normal: number }

/**
 * 提示音按钮需要的三个字段。v4 的 useV4AlertSound 与 v1/v2/v3 的 useAlertSound
 * 返回的正是同一组（各自的返回类型多出来的字段这里用不到），所以两个 hook 的
 * 结果都能直接传进来，不必为了共用头部去改其中一个。
 */
type SoundLike = { muted: boolean; blocked: boolean; toggleMuted: () => void }

type Props = {
  theme: Theme
  onToggleTheme: () => void
  sound: SoundLike
  counts: Counts
  filter: FilterStatus
  onFilter: (filter: FilterStatus) => void
  applied: Selection | null
  running: boolean
  loading: boolean
  lastUpdated: string
  onEdit: () => void
  /**
   * 启动页/条件编辑时正文是整页表单，头部就不摆数据了——两个模式原来的行为
   * 都是这时把计数整块拿掉、只留品牌与图标。false = 不渲染中间的 command-bar。
   */
  showCommandBar?: boolean
  /**
   * 锚在「修改条件」按钮下方的浮层（模式二的条件编辑器）。模式一点「修改条件」
   * 是切到整页表单，不需要这一格，传空即可。
   */
  editor?: ReactNode
}

/**
 * 两个模式共用的顶部栏 —— 就是原来模式一（v4）的 header：左侧品牌
 * （雷达图标 + 文案）、中间一张 command-bar 卡片（计数 | 观测条件 | 实时状态 |
 * 修改条件）、右侧图标组。
 *
 * 之所以抽成共享件：领导要求「模式一和模式二顶部保持一致，用模式一的顶部」。
 * 于是这里只有一份实现，两版都渲染它，形态不会再各自漂移。
 *
 * 注意它落在模式二的 .v2-root 里：那份「全直角」的锁定规则已经显式排除了
 * .v4-header 及其子树（见 v2.css），否则圆角与圆形图标会被压平。
 */
function AppHeader({
  theme,
  onToggleTheme,
  sound,
  counts,
  filter,
  onFilter,
  applied,
  running,
  loading,
  lastUpdated,
  onEdit,
  showCommandBar = true,
  editor,
}: Props) {
  const blocked = sound.blocked && !sound.muted
  const soundTitle = blocked
    ? '浏览器拦截了自动播放，点击页面任意处后将在下轮巡检重试'
    : sound.muted
      ? '告警提示音已静音，点击开启'
      : '每轮巡检发现异常时播放提示音，点击静音'
  const status = loading ? '正在刷新' : running ? '持续观测' : '单次查询'

  return (
    <header className="v4-header">
      {/* 左侧品牌：雷达图标 + 文案。原来整块被注释掉（位置让给数据），
          现在按要求恢复显示；V4 版本徽标不再挂出来。 */}
      <div className="v4-brand">
        <span className="v4-brand-mark">
          <Radar size={16} strokeWidth={2} />
        </span>
        <strong>告警观测</strong>
      </div>

      {showCommandBar ? (
        <section className="v4-command-bar" aria-label="告警概览与观测条件">
          <div className="v4-counts" aria-label="告警状态筛选">
            <button
              type="button"
              className={filter === 'all' ? 'v4-count is-active is-all' : 'v4-count is-all'}
              aria-pressed={filter === 'all'}
              onClick={() => onFilter('all')}
            >
              <span>全部</span>
              <strong>{counts.total}</strong>
            </button>
            <button
              type="button"
              className={
                filter === 'abnormal' ? 'v4-count is-active is-abnormal' : 'v4-count is-abnormal'
              }
              aria-pressed={filter === 'abnormal'}
              onClick={() => onFilter(filter === 'abnormal' ? 'all' : 'abnormal')}
            >
              <span>异常</span>
              <strong>{counts.abnormal}</strong>
            </button>
            <button
              type="button"
              className={filter === 'normal' ? 'v4-count is-active is-normal' : 'v4-count is-normal'}
              aria-pressed={filter === 'normal'}
              onClick={() => onFilter(filter === 'normal' ? 'all' : 'normal')}
            >
              <span>正常</span>
              <strong>{counts.normal}</strong>
            </button>
          </div>

          {/* 始终占住这一列（没有生效条件时渲染空壳），否则 grid 会把后面的
              实时状态/修改条件往前挪一格。 */}
          <div className="v4-condition-line">
            {applied ? (
              <>
                <span>{applied.teamName || '全量组别'}</span>
                <i />
                <span>{applied.systemId || '全部系统'}</span>
                <i />
                <span>{frequencyLabel(applied.frequency)}</span>
              </>
            ) : null}
          </div>

          <div className="v4-live-status" aria-live="polite">
            <Activity size={13} strokeWidth={2} />
            <span>{status}</span>
            <time>{lastUpdated || '--:--:--'}</time>
          </div>

          {/* 包一层 relative：模式二的条件编辑器浮层挂在这颗按钮下方。
              data-condition-trigger 是浮层「点外关闭」时要放行的标记。 */}
          <div className="v4-edit-wrap">
            <button
              type="button"
              className="v4-edit-condition"
              onClick={onEdit}
              data-condition-trigger
            >
              <SlidersHorizontal size={14} strokeWidth={2} />
              修改条件
            </button>
            {/* 「历史数据」紧挨「修改条件」右侧：新标签页打开独立的历史数据页
                （页内再分模式一 / 模式二）。用真实 <a href> 而不是 window.open，
                这样中键新开、右键复制链接都能用，也不受弹窗拦截影响。 */}
            <a
              className="v4-edit-condition v4-header-link"
              href={HISTORY_HREF}
              target="_blank"
              rel="noopener noreferrer"
              title="在新标签页打开历史数据"
            >
              <History size={14} strokeWidth={2} />
              历史数据
            </a>
            {/* 「问题登记」指向行内知识库的登记页，同样是真实 <a> 新标签页打开 */}
            <a
              className="v4-edit-condition v4-header-link"
              href={PROBLEM_HREF}
              target="_blank"
              rel="noopener noreferrer"
              title="在新标签页打开问题登记"
            >
              <FilePlus2 size={14} strokeWidth={2} />
              问题登记
            </a>
            {editor}
          </div>
        </section>
      ) : null}

      <div className="v4-header-actions">
        <VersionNav buttonClassName="v4-icon-button" />
        <button
          type="button"
          className={blocked ? 'v4-icon-button is-blocked' : 'v4-icon-button'}
          onClick={sound.toggleMuted}
          aria-pressed={sound.muted}
          aria-label={sound.muted ? '开启提示音' : '静音提示音'}
          title={soundTitle}
        >
          {sound.muted ? (
            <VolumeX size={16} strokeWidth={1.9} />
          ) : (
            <Volume2 size={16} strokeWidth={1.9} />
          )}
        </button>
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>
    </header>
  )
}

export default AppHeader
