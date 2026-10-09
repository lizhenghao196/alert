const LINE = 'skeleton-line animate-shimmer rounded'

/**
 * 首屏骨架。六张卡片的轮廓和 AlertCard 对齐（标题行 / 编号行 / 摘要块 / 底部按钮），
 * 数据回来时是「填充」而不是「换版」，视觉上不会跳。
 */
function AlertGridSkeleton() {
  return (
    <div className="alert-grid">
      {[0, 1, 2, 3, 4, 5].map((key) => (
        <div
          key={key}
          className="flex flex-col gap-3 rounded-xl border border-l-[3px] border-line border-l-fg-mute/30 bg-panel p-4 shadow-card"
        >
          <div className={`${LINE} h-[18px] w-[55%]`} />
          <div className={`${LINE} h-[11px] w-[38%]`} />
          <div className={`${LINE} h-[62px] w-full`} />
          <div className={`${LINE} mt-auto h-[26px] w-[84px]`} />
        </div>
      ))}
    </div>
  )
}

export default AlertGridSkeleton
