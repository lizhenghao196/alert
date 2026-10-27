/** 日历相关的纯函数 —— 模式一的日期范围选择器与模式二的单个日期选择器共用。 */

export const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

export const pad = (n: number) => String(n).padStart(2, '0')

/** Date → yyyy-MM-dd */
export function fmt(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** yyyy-MM-dd → Date（格式不对返回 null） */
export function parse(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''))
  if (!m) return null
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

export function sameDay(a: Date | null, b: Date | null): boolean {
  return (
    !!a &&
    !!b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/** 某月的日期格子（前面补空位对齐星期） */
export function monthCells(year: number, month: number): Array<Date | null> {
  const first = new Date(year, month, 1)
  const days = new Date(year, month + 1, 0).getDate()
  const cells: Array<Date | null> = []
  for (let i = 0; i < first.getDay(); i++) cells.push(null)
  for (let d = 1; d <= days; d++) cells.push(new Date(year, month, d))
  return cells
}

/** 今天（yyyy-MM-dd） */
export function todayString(): string {
  return fmt(new Date())
}
