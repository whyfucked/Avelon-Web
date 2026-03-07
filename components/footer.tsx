"use client"

import Link from "next/link"
import { Mail, ShieldAlert, Server } from "lucide-react"

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
    </svg>
  )
}

export function Footer() {
  const currentYear = new Date().getFullYear()
  
  return (
    <footer className="relative border-t border-border/50 bg-card/20">
      <div className="px-3 sm:px-8 py-8 sm:py-12 md:px-16 lg:px-24">
        <div className="mb-8 sm:mb-12 flex flex-col items-center justify-between gap-4 sm:gap-6 rounded-xl sm:rounded-2xl border border-border/50 p-5 sm:p-8 text-center sm:flex-row sm:text-left">
          <div>
            <h3 className="font-heading text-lg sm:text-xl font-bold text-foreground">Готовы начать?</h3>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">Создайте свой сервер за пару минут</p>
          </div>
          <button 
            onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}
            className="w-full sm:w-auto rounded-lg sm:rounded-xl bg-primary px-5 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-primary-foreground transition-all duration-200 hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98]"
          >
            Выбрать тариф
          </button>
        </div>

        <div className="grid gap-8 sm:gap-10 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="col-span-2 sm:col-span-2 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="size-8 sm:size-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                <Server className="size-4 sm:size-5 text-primary" />
              </div>
              <span className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Avelon<span className="text-primary">.my</span>
              </span>
            </Link>
            <p className="mt-2 sm:mt-3 text-xs sm:text-sm leading-relaxed text-muted-foreground">
              Хостинг для тех, кто ценит скорость и надёжность
            </p>
          </div>

          <div>
            <h4 className="mb-3 sm:mb-4 text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">Навигация</h4>
            <ul className="space-y-2 sm:space-y-2.5">
              <li>
                <Link href="/docs" className="text-xs sm:text-sm text-foreground/70 transition-all duration-200 hover:text-foreground hover:translate-x-1 inline-block">
                  Документация
                </Link>
              </li>
              <li>
                <button
                  onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}
                  className="text-xs sm:text-sm text-foreground/70 transition-all duration-200 hover:text-foreground hover:translate-x-1 inline-block"
                >
                  Тарифы
                </button>
              </li>
              <li>
                <button
                  onClick={() => document.getElementById("faq")?.scrollIntoView({ behavior: "smooth" })}
                  className="text-xs sm:text-sm text-foreground/70 transition-all duration-200 hover:text-foreground hover:translate-x-1 inline-block"
                >
                  FAQ
                </button>
              </li>
              <li>
                <Link href="/support" className="text-xs sm:text-sm text-foreground/70 transition-all duration-200 hover:text-foreground hover:translate-x-1 inline-block">
                  Поддержка
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 sm:mb-4 text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">Правовое</h4>
            <ul className="space-y-2 sm:space-y-2.5">
              <li>
                <Link href="/docs" className="text-xs sm:text-sm text-foreground/70 transition-all duration-200 hover:text-foreground hover:translate-x-1 inline-block">
                  Соглашение
                </Link>
              </li>
              <li>
                <Link href="/docs" className="text-xs sm:text-sm text-foreground/70 transition-all duration-200 hover:text-foreground hover:translate-x-1 inline-block">
                  Конфиденциальность
                </Link>
              </li>
              <li>
                <Link href="/docs" className="text-xs sm:text-sm text-foreground/70 transition-all duration-200 hover:text-foreground hover:translate-x-1 inline-block">
                  Возврат средств
                </Link>
              </li>
            </ul>
          </div>

          <div className="col-span-2 sm:col-span-1">
            <h4 className="mb-3 sm:mb-4 text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">Связаться</h4>
            <div className="space-y-2 sm:space-y-3">
              <a 
                href="mailto:support@yourdomain.ru" 
                className="flex items-center gap-2 sm:gap-3 rounded-lg border border-border/50 bg-card/50 p-2 sm:p-3 transition-all duration-200 hover:border-primary/30 hover:scale-[1.02]"
              >
                <div className="flex size-7 sm:size-8 items-center justify-center rounded-md sm:rounded-lg bg-primary/10">
                  <Mail className="size-3.5 sm:size-4 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Email</p>
                  <p className="text-xs sm:text-sm text-foreground">support@yourdomain.ru</p>
                </div>
              </a>
              <a 
                href="mailto:abuse@yourdomain.ru" 
                className="flex items-center gap-2 sm:gap-3 rounded-lg border border-border/50 bg-card/50 p-2 sm:p-3 transition-all duration-200 hover:border-primary/30 hover:scale-[1.02]"
              >
                <div className="flex size-7 sm:size-8 items-center justify-center rounded-md sm:rounded-lg bg-red-500/10">
                  <ShieldAlert className="size-3.5 sm:size-4 text-red-500" />
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Abuse</p>
                  <p className="text-xs sm:text-sm text-foreground">abuse@yourdomain.ru</p>
                </div>
              </a>
              <a 
                href="https://dsc.gg/avelonmy" 
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 sm:gap-3 rounded-lg border border-border/50 bg-card/50 p-2 sm:p-3 transition-all duration-200 hover:border-primary/30 hover:scale-[1.02]"
              >
                <div className="flex size-7 sm:size-8 items-center justify-center rounded-md sm:rounded-lg bg-indigo-500/10">
                  <DiscordIcon className="size-3.5 sm:size-4 text-indigo-500" />
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Discord</p>
                  <p className="text-xs sm:text-sm text-foreground">Присоединиться</p>
                </div>
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 sm:mt-12 border-t border-border/30 pt-6 sm:pt-8">
          <div className="text-center text-[10px] sm:text-xs leading-relaxed text-muted-foreground">
            <p>© 2025{currentYear > 2025 ? `-${currentYear}` : ''} yourdomain.ru. All Rights Reserved.</p>
            <p className="mt-1.5 sm:mt-2">НПД Фиалковский Никита Максимович. ИНН 636705565800</p>
            <p className="mt-2 sm:mt-3">
              Сайт разработан{" "}
              <a 
                href="https://t.me/XEHKU" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-foreground hover:text-primary transition-colors"
              >
                @XEHKU
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
