"use client"

export function BackgroundLines() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.04] dark:opacity-[0.03]"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        {/* Статичные диагональные линии */}
        <line x1="0%" y1="15%" x2="100%" y2="85%" className="stroke-foreground" strokeWidth="1" />
        <line x1="0%" y1="35%" x2="100%" y2="100%" className="stroke-foreground" strokeWidth="1" />
        <line x1="15%" y1="0%" x2="85%" y2="100%" className="stroke-foreground" strokeWidth="1" />
        <line x1="100%" y1="25%" x2="0%" y2="95%" className="stroke-foreground" strokeWidth="1" />
        <line x1="50%" y1="0%" x2="100%" y2="50%" className="stroke-foreground" strokeWidth="1" />
        <line x1="0%" y1="55%" x2="45%" y2="100%" className="stroke-foreground" strokeWidth="1" />
        <line x1="70%" y1="0%" x2="30%" y2="100%" className="stroke-foreground" strokeWidth="1" />
        <line x1="100%" y1="60%" x2="60%" y2="100%" className="stroke-foreground" strokeWidth="1" />
      </svg>
    </div>
  )
}
