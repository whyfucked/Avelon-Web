"use client"

import { useState, useEffect } from "react"

const folders = [
  { name: "MyServer", delay: 0 },
  { name: "yourdomain.ru", delay: 1500 },
  { name: "Новая папка", delay: 3000 },
]

export function FoldersAnimation() {
  const [visibleFolders, setVisibleFolders] = useState([true, true, true])
  const [selectedFolder, setSelectedFolder] = useState<number | null>(null)
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 })
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const sequence = async () => {
      // Выбираем случайную папку
      const randomIndex = Math.floor(Math.random() * 3)
      
      // Курсор двигается к папке
      setSelectedFolder(randomIndex)
      setCursorPosition({ x: randomIndex * 70 + 35, y: 30 })
      
      await new Promise(r => setTimeout(r, 800))
      
      // Показываем контекстное меню
      setShowContextMenu(true)
      
      await new Promise(r => setTimeout(r, 600))
      
      // Курсор двигается к "Удалить"
      setCursorPosition({ x: randomIndex * 70 + 60, y: 70 })
      setIsDeleting(true)
      
      await new Promise(r => setTimeout(r, 400))
      
      // Удаляем папку
      setVisibleFolders(prev => {
        const newState = [...prev]
        newState[randomIndex] = false
        return newState
      })
      setShowContextMenu(false)
      setIsDeleting(false)
      
      await new Promise(r => setTimeout(r, 1000))
      
      // Восстанавливаем папку
      setVisibleFolders([true, true, true])
      setSelectedFolder(null)
    }

    const interval = setInterval(sequence, 4000)
    sequence()
    
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="relative flex items-center justify-center gap-2 h-16">
      {folders.map((folder, index) => (
        <div
          key={folder.name}
          className={`relative flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg transition-all duration-300 ${
            visibleFolders[index] 
              ? "opacity-100 scale-100" 
              : "opacity-0 scale-75"
          } ${selectedFolder === index ? "bg-white/20" : "bg-white/10"}`}
        >
          <img src="/folder.png" alt="Folder" className="h-7 w-auto drop-shadow-lg" />
          <span className="text-white/80 text-[7px] font-medium whitespace-nowrap">{folder.name}</span>
          
          {/* Context Menu */}
          {showContextMenu && selectedFolder === index && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-slate-800 rounded-lg shadow-xl border border-white/10 py-1 px-1 z-20 min-w-[70px]">
              <div className={`text-[8px] px-2 py-1 rounded ${isDeleting ? "bg-red-500/30 text-red-300" : "text-white/70"}`}>
                Удалить
              </div>
            </div>
          )}
        </div>
      ))}
      
      {/* Cursor */}
      <div 
        className="absolute transition-all duration-500 ease-out z-30 pointer-events-none"
        style={{ 
          left: cursorPosition.x, 
          top: cursorPosition.y,
          transform: 'translate(-50%, -50%)'
        }}
      >
        <svg className="size-4 text-white drop-shadow-lg" viewBox="0 0 24 24" fill="currentColor">
          <path d="M4 4l16 8-8 2-2 8z"/>
        </svg>
      </div>
    </div>
  )
}
