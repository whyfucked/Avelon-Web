import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Mail, MessageCircle, Clock, FileText } from "lucide-react"
import Link from "next/link"

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      
      <div className="px-8 pt-32 pb-20 md:px-16 lg:px-24">
        <div className="mx-auto max-w-4xl">
          <h1 className="font-heading text-3xl font-bold text-foreground md:text-4xl">Поддержка</h1>
          <p className="mt-4 text-muted-foreground">Мы готовы помочь вам 24/7</p>
          
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            <a 
              href="mailto:support@yourdomain.ru"
              className="flex flex-col gap-4 rounded-2xl border border-border/50 bg-card/30 p-6 transition-all hover:border-primary/30"
            >
              <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10">
                <Mail className="size-6 text-primary" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-bold text-foreground">Email</h3>
                <p className="mt-1 text-sm text-muted-foreground">Напишите нам на почту</p>
                <p className="mt-2 text-sm text-primary">support@yourdomain.ru</p>
              </div>
            </a>

            <a 
              href="https://dsc.gg/avelonmy"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col gap-4 rounded-2xl border border-border/50 bg-card/30 p-6 transition-all hover:border-indigo-500/30"
            >
              <div className="flex size-12 items-center justify-center rounded-xl bg-indigo-500/10">
                <MessageCircle className="size-6 text-indigo-500" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-bold text-foreground">Discord</h3>
                <p className="mt-1 text-sm text-muted-foreground">Присоединяйтесь к сообществу</p>
                <p className="mt-2 text-sm text-indigo-500">dsc.gg/avelonmy</p>
              </div>
            </a>

          </div>

          <div className="mt-8 flex items-center gap-3 rounded-2xl border border-border/50 bg-card/30 p-6">
            <Clock className="size-5 text-green-500" />
            <div>
              <p className="font-medium text-foreground">Время работы поддержки: 24/7</p>
              <p className="text-sm text-muted-foreground">Среднее время ответа: 15-30 минут</p>
            </div>
          </div>

          <div className="mt-12">
            <h2 className="font-heading text-2xl font-bold text-foreground">Что включает поддержка</h2>
            <div className="mt-6 space-y-4 text-sm text-muted-foreground">
              <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4">
                <p className="font-medium text-green-600 dark:text-green-500">✓ Включено в поддержку:</p>
                <ul className="mt-2 ml-4 list-disc space-y-1">
                  <li>Помощь с настройкой сервера</li>
                  <li>Решение технических проблем инфраструктуры</li>
                  <li>Консультации по панели управления</li>
                  <li>Помощь с бэкапами и восстановлением</li>
                  <li>Вопросы по оплате и тарифам</li>
                </ul>
              </div>
              <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
                <p className="font-medium text-red-600 dark:text-red-500">✗ Не включено в поддержку:</p>
                <ul className="mt-2 ml-4 list-disc space-y-1">
                  <li>Настройка и отладка пользовательского ПО</li>
                  <li>Написание скриптов и плагинов</li>
                  <li>Администрирование игровых серверов</li>
                  <li>Обучение программированию</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-12">
            <h2 className="font-heading text-2xl font-bold text-foreground">Полезные ссылки</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Link 
                href="/docs"
                className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/30 p-4 transition-all hover:border-primary/30"
              >
                <FileText className="size-5 text-primary" />
                <span className="text-sm text-foreground">Документация</span>
              </Link>
              <Link 
                href="/terms"
                className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/30 p-4 transition-all hover:border-primary/30"
              >
                <FileText className="size-5 text-primary" />
                <span className="text-sm text-foreground">Пользовательское соглашение</span>
              </Link>
              <Link 
                href="/privacy"
                className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/30 p-4 transition-all hover:border-primary/30"
              >
                <FileText className="size-5 text-primary" />
                <span className="text-sm text-foreground">Политика конфиденциальности</span>
              </Link>
              <Link 
                href="/refund"
                className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/30 p-4 transition-all hover:border-primary/30"
              >
                <FileText className="size-5 text-primary" />
                <span className="text-sm text-foreground">Политика возврата</span>
              </Link>
            </div>
          </div>

        </div>
      </div>

      <Footer />
    </main>
  )
}
