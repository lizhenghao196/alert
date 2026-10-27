import type { ReactNode } from 'react'
import { LayoutGrid, Search } from 'lucide-react'
import { SYSTEM_GROUPS } from '../query'
import DateRangePicker from './DateRangePicker'
import SelectField from './SelectField'
import './search-bar.css'

type Props = {
  teamName: string
  systemId: string
  /** [startDate, endDate]，yyyy-MM-dd */
  dateRange: string[]
  loading?: boolean
  onChangeTeamName: (value: string) => void
  onChangeSystemId: (value: string) => void
  onChangeDateRange: (value: string[]) => void
  onQuery: () => void
  /**
   * 「查询」右侧的附加内容：紧挨查询的是「返回」，之后是模式一专属的
   * 「一键收起 / 一键展开」（两者都由 AppHistory 组装）。
   * 放在工具栏内部而不是当兄弟节点，是为了窄屏折行时它们跟着工具栏走，
   * 不会孤零零留在上一行。
   */
  trailing?: ReactNode
}

/**
 * 历史数据页的查询工具栏 —— **模式一 / 模式二共用同一份**（需求：两个模式共用
 * 模式一的搜索区域），外观是 RuoYi 告警分析页那条 el-* 风格的工具栏：
 * 组别 → 系统英文缩写 → 日期范围 → 查询。
 *
 * 它挂在 `history-header` 的第二行里（见 AppHistory / history.css），
 * 所以自身不带卡片外观与外边距；条件状态由 AppHistory 持有，这里只做受控读写。
 * `onQuery` 由 AppHistory 统一派发（递增 queryTick），哪个模式当前可见就查哪个。
 *
 * 回车（在系统缩写输入框里）与点「查询」等价。
 */
function HistorySearchBar({
  teamName,
  systemId,
  dateRange,
  loading = false,
  onChangeTeamName,
  onChangeSystemId,
  onChangeDateRange,
  onQuery,
  trailing,
}: Props) {
  return (
    <div className="aa-bar">
      {/* 组别：字典 dict_system_group（label 与 value 相同），历史数据默认「全量」 */}
      <div className="aa-bar__team">
        <SelectField
          value={teamName}
          options={SYSTEM_GROUPS}
          placeholder="组别"
          disabled={loading}
          onChange={onChangeTeamName}
        />
      </div>

      {/* 系统 ID 选填：不填也能查，组装参数时不会带 systemId 字段 */}
      <label className="aa-input">
        <LayoutGrid className="aa-input__prefix" size={14} strokeWidth={2} />
        <input
          className="aa-input__inner"
          type="text"
          value={systemId}
          placeholder="系统英文缩写（选填），如 AUTH"
          maxLength={32}
          onChange={(event) => onChangeSystemId(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') onQuery()
          }}
        />
      </label>

      <DateRangePicker value={dateRange} onChange={onChangeDateRange} disabled={loading} />

      <button type="button" className="aa-btn aa-btn--primary" disabled={loading} onClick={onQuery}>
        <Search size={14} strokeWidth={2} />
        查询
      </button>

      {trailing}
    </div>
  )
}

export default HistorySearchBar
