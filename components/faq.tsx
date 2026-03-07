"use client"

import { useState } from "react"
import { ChevronDown, Zap, CreditCard, Shield, ArrowUpDown, Headphones, Database } from "lucide-react"

const faqItems = [
  {
    icon: Zap,
    question: "Как быстро активируется сервер после оплаты?",
    answer: "Сервер активируется мгновенно после подтверждения оплаты. Вы получите доступ к панели управления в течение нескольких секунд."
  },
  {
    icon: CreditCard,
    question: "Какие способы оплаты вы принимаете?",
    answer: "Мы принимаем банковские карты, СБП, ЮMoney и криптовалюту. Все платежи обрабатываются через защищённые платёжные системы."
  },
  {
    icon: Shield,
    question: "Есть ли защита от DDoS-атак?",
    answer: "Да, все наши серверы защищены от DDoS-атак на уровне сети. Защита включена бесплатно во все тарифы и фильтрует вредоносный трафик автоматически."
  },
  {
    icon: ArrowUpDown,
    question: "Можно ли перейти на другой тариф?",
    answer: "Да, вы можете изменить тариф в любой момент через панель управления. При повышении тарифа разница будет рассчитана пропорционально оставшемуся времени."
  },
  {
    icon: Headphones,
    question: "Как работает техническая поддержка?",
    answer: "Наша поддержка работает 24/7 через тикет-систему и Discord. Среднее время ответа — 15 минут. Мы помогаем с настройкой серверов, плагинов и решением технических проблем."
  },
  {
    icon: Database,
    question: "Делаете ли вы бэкапы?",
    answer: "Автоматические бэкапы мы не делаем. Вы можете создавать бэкапы вручную через панель управления. Рекомендуем регулярно сохранять важные данные самостоятельно."
  },
]

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section id="faq" className="scroll-mt-24 px-3 sm:px-8 md:px-16 lg:px-24 py-16">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-foreground mb-3">
            Частые вопросы
          </h2>
          <p className="text-muted-foreground">
            Ответы на популярные вопросы о наших услугах
          </p>
        </div>

        {/* FAQ List */}
        <div className="space-y-3">
          {faqItems.map((item, index) => {
            const isOpen = openIndex === index
            const Icon = item.icon
            
            return (
              <div
                key={index}
                className={`rounded-2xl border transition-all duration-300 ${
                  isOpen 
                    ? "border-border bg-card shadow-sm" 
                    : "border-border/50 bg-card/30 hover:border-border hover:bg-card/50"
                }`}
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="flex w-full items-center gap-4 p-5 text-left transition-colors"
                >
                  <div className={`size-11 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${
                    isOpen ? "bg-muted" : "bg-muted/50"
                  }`}>
                    <Icon className={`size-5 transition-colors duration-300 ${
                      isOpen ? "text-foreground" : "text-muted-foreground"
                    }`} />
                  </div>
                  
                  <span className={`flex-1 font-medium transition-colors duration-300 ${
                    isOpen ? "text-foreground" : "text-foreground/80"
                  }`}>
                    {item.question}
                  </span>
                  
                  <div className={`size-9 rounded-lg flex items-center justify-center shrink-0 transition-all duration-300 ${
                    isOpen ? "bg-muted rotate-180" : "bg-muted/30"
                  }`}>
                    <ChevronDown className={`size-4 transition-colors duration-300 ${
                      isOpen ? "text-foreground" : "text-muted-foreground"
                    }`} />
                  </div>
                </button>
                
                <div className={`grid transition-all duration-300 ease-in-out ${
                  isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}>
                  <div className="overflow-hidden">
                    <div className="border-t border-border/50">
                      <div className="px-5 pb-5 pt-4 pl-20">
                        <p className="text-muted-foreground leading-relaxed">
                          {item.answer}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 text-center p-8 rounded-2xl border border-border/50 bg-card/30">
          <h3 className="font-semibold text-lg text-foreground mb-2">
            Не нашли ответ на свой вопрос?
          </h3>
          <p className="text-muted-foreground mb-6">
            Наша поддержка всегда готова помочь
          </p>
          <a
            href="https://discord.com/invite/hsC6TjHE8H"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-foreground px-6 py-3 text-sm font-medium text-background hover:bg-foreground/90 transition-colors"
          >
            <Headphones className="size-4" />
            Написать в поддержку
          </a>
        </div>
      </div>
    </section>
  )
}
