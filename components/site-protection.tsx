"use client"

import { useEffect } from "react"

export function SiteProtection() {
  useEffect(() => {
    // Console spam
    const spamConsole = () => {
      console.log(
        "%cAvelon Protect hehe 🛡️",
        "color: #a855f7; font-size: 20px; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.5);"
      )
    }
    const spamInterval = setInterval(spamConsole, 1000)
    spamConsole()

    // Проверка можно ли копировать элемент
    const canCopy = (element: Element | null): boolean => {
      while (element) {
        const tag = element.tagName?.toLowerCase()
        
        // Разрешаем для инпутов, textarea, code, pre
        if (tag === "input" || tag === "textarea" || tag === "code" || tag === "pre") {
          return true
        }
        
        // Разрешаем для contenteditable
        if (element.getAttribute?.("contenteditable") === "true") {
          return true
        }
        
        // Разрешаем для элементов с классами или атрибутом
        if (element.classList?.contains("selectable") || 
            element.classList?.contains("copyable") ||
            element.hasAttribute?.("data-copyable")) {
          return true
        }
        
        element = element.parentElement
      }
      return false
    }

    // Блокировка контекстного меню
    const onContextMenu = (e: MouseEvent) => {
      const target = e.target as Element
      if (!canCopy(target)) {
        e.preventDefault()
      }
    }

    // Блокировка выделения
    const onSelectStart = (e: Event) => {
      const target = e.target as Element
      if (!canCopy(target)) {
        e.preventDefault()
      }
    }

    // Блокировка копирования
    const onCopy = (e: ClipboardEvent) => {
      const selection = window.getSelection()
      const anchorNode = selection?.anchorNode
      const element = anchorNode instanceof Element ? anchorNode : anchorNode?.parentElement ?? null
      
      if (!canCopy(element)) {
        e.preventDefault()
      }
    }

    // Блокировка вырезания
    const onCut = (e: ClipboardEvent) => {
      const selection = window.getSelection()
      const anchorNode = selection?.anchorNode
      const element = anchorNode instanceof Element ? anchorNode : anchorNode?.parentElement ?? null
      
      if (!canCopy(element)) {
        e.preventDefault()
      }
    }

    // Блокировка горячих клавиш
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as Element
      const activeElement = document.activeElement
      
      // Разрешаем в инпутах
      if (canCopy(activeElement) || canCopy(target)) {
        return
      }

      // Блокируем DevTools
      if (e.key === "F12") {
        e.preventDefault()
        return
      }
      
      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase()
        
        // Ctrl+U, Ctrl+S, Ctrl+P, Ctrl+A, Ctrl+C, Ctrl+X
        if (["u", "s", "p", "a", "c", "x"].includes(key)) {
          e.preventDefault()
          return
        }
        
        // Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
        if (e.shiftKey && ["i", "j", "c"].includes(key)) {
          e.preventDefault()
          return
        }
      }
    }

    // Блокировка перетаскивания
    const onDragStart = (e: DragEvent) => {
      e.preventDefault()
    }

    document.addEventListener("contextmenu", onContextMenu)
    document.addEventListener("selectstart", onSelectStart)
    document.addEventListener("copy", onCopy)
    document.addEventListener("cut", onCut)
    document.addEventListener("keydown", onKeyDown)
    document.addEventListener("dragstart", onDragStart)

    return () => {
      clearInterval(spamInterval)
      document.removeEventListener("contextmenu", onContextMenu)
      document.removeEventListener("selectstart", onSelectStart)
      document.removeEventListener("copy", onCopy)
      document.removeEventListener("cut", onCut)
      document.removeEventListener("keydown", onKeyDown)
      document.removeEventListener("dragstart", onDragStart)
    }
  }, [])

  return null
}
