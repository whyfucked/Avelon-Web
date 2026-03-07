"use client"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { useState, useEffect, useRef } from "react"
import { 
  FileText, 
  Download,
  Building2,
  Shield,
  Scale,
  RotateCcw,
  Lock,
  X,
  ScrollText
} from "lucide-react"

const documents = [
  { id: "terms", title: "Пользовательское соглашение", description: "Условия использования услуг компании", icon: FileText, hasLogo: true },
  { id: "offer", title: "Публичная оферта", description: "Условия договора на оказание услуг", icon: ScrollText, hasLogo: true },
  { id: "privacy", title: "Политика конфиденциальности", description: "Обработка и защита персональных данных", icon: Lock, hasLogo: true },
  { id: "refund", title: "Политика возврата средств", description: "Условия возврата денежных средств", icon: RotateCcw, hasLogo: true },
  { id: "sla", title: "Соглашение об уровне сервиса (SLA)", description: "Гарантии качества предоставляемых услуг", icon: Shield, hasLogo: true },
  { id: "liability", title: "Ограничение ответственности", description: "Пределы ответственности компании", icon: Scale, hasLogo: true },
]

const SignatureRyazanov = () => (
  <svg width="80" height="68" viewBox="0 0 121 102" fill="none" className="inline-block">
    <path d="M0.5 90.585C0.755529 92.126 2.29648 94.7046 5.00284 97.4148C9.39345 101.812 14.9339 101.163 28.1947 101.17C31.2138 101.172 32.4807 100.404 34.0333 98.6073C41.596 89.8564 41.7884 82.346 42.5705 78.0832C43.0325 75.5647 44.1192 72.7905 44.5063 63.1846C44.8315 55.1175 44.638 40.5465 44.5102 32.532C44.1269 23.4953 43.8636 20.3979 43.6081 16.9172C43.3526 15.4808 42.8415 14.7141 42.3149 13.9243" stroke="black" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M40.7663 45.6728C39.2254 45.6728 36.1357 44.6507 33.6772 42.5832C31.0659 40.3872 28.9033 37.9448 26.8358 31.8894C24.0822 23.8247 25.7904 14.2032 28.88 8.78277C30.1967 6.47292 31.2108 4.89552 32.4963 3.73786C34.1947 2.20824 36.1125 1.2793 42.768 0.892114C59.617 -0.0880801 71.7326 1.01601 73.2775 1.53097C77.5521 2.95587 81.2804 8.4885 82.9607 11.9731C85.5029 17.2448 86.9641 21.1259 87.8701 27.3168C88.6871 32.9001 87.7462 37.1472 86.9757 38.5643C84.6218 42.8936 76.6652 43.3498 72.4024 44.248C71.237 44.6352 69.9594 45.1463 66.107 45.4095C62.2546 45.6728 55.8662 45.6728 49.2842 45.6728" stroke="black" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M50.0586 78.1954C53.6516 78.1954 58.5687 78.7065 59.858 79.8642C61.0584 80.942 61.4106 82.8338 62.9515 83.9953C63.8323 84.6593 65.5146 84.3903 66.6878 84.0069C70.7463 82.6809 72.2515 79.7519 74.4313 78.5903C81.6246 74.7574 85.1522 82.0517 96.3454 82.7138C101.158 81.8116 103.737 81.0373 105.796 80.6501C106.834 80.5185 107.856 80.5185 108.909 80.5185" stroke="black" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M112.781 80.5186H119.75" stroke="black" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)

const SignatureFial = () => (
  <svg width="70" height="87" viewBox="0 0 50 62" fill="none" className="inline-block">
    <path d="M24.2153 2.61377C24.3356 4.77768 24.4558 6.94159 24.5478 13.4962C24.6397 20.0507 24.6999 30.9304 24.6106 37.3164C24.5214 43.7025 24.2809 45.2653 24.1571 48.1141C24.0332 50.9629 24.0332 55.0503 24.0332 59.2615" stroke="black" strokeLinecap="round"/>
    <path d="M24.0334 5.16386C23.3686 4.07462 21.9168 2.7413 19.3103 1.49542C17.1482 0.46193 14.3924 0.428033 12.0891 0.54825C10.2339 0.645082 8.31957 1.6976 6.34874 2.72764C4.93546 3.46628 3.82235 5.15293 2.45898 7.42339C1.05802 9.75647 0.658459 11.4753 0.567383 12.6219C0.390905 14.8437 0.596527 16.7557 0.777766 17.8449C1.00155 19.1899 1.80598 21.1801 2.74586 23.2729C3.72729 25.4583 5.75312 26.1691 6.75492 26.6855C8.58369 27.6281 10.3031 27.6262 13.7293 28.2037C14.6696 28.3621 15.1665 28.4168 16.7329 28.5989C23.1208 28.6007 23.7274 28.4186 24.1818 28.2975C24.3959 28.2364 24.5762 28.1763 24.762 28.1144" stroke="black" strokeLinecap="round"/>
    <path d="M24.7618 28.1143C25.3629 28.1143 25.964 28.1143 28.0769 28.1143C30.1898 28.1143 33.7963 28.1143 35.9848 28.0542C38.8391 27.9758 40.3573 27.3894 41.9028 26.6626C43.2073 26.0492 44.1259 25.2036 45.1541 24.1463C46.6945 22.5622 47.5885 20.3531 47.9828 18.4442C48.3111 16.8552 48.379 15.6118 48.5912 13.6509C48.7508 12.1768 48.7433 9.70655 48.7142 8.07633C48.6721 5.72045 48.2606 4.74122 47.8672 4.25671C47.0665 3.27065 45.1149 2.79953 40.2999 2.00902C38.3522 1.68924 35.5049 1.88516 33.4184 2.00537C28.4235 2.29316 27.2572 2.97804 26.2527 3.40062C25.4922 4.19114 24.7655 4.79587 24.066 5.49531C23.913 5.64831 23.7928 5.76853 23.6689 5.89239" stroke="black" strokeLinecap="round"/>
  </svg>
)

const AvelonLogoBlack = () => (
  <svg width="30" height="36" viewBox="0 0 40 48" fill="none" className="inline-block">
    <path d="M20 0L18 6L6 46H10L18 12L20 0Z" fill="black"/>
    <path d="M20 0L22 6L34 46H30L22 12L20 0Z" fill="black"/>
    <path d="M12 42C12 38 15 35 20 35C25 35 28 38 28 42" stroke="black" strokeWidth="1.5" fill="none"/>
    <rect x="14" y="14" width="12" height="2" rx="0.5" fill="black"/>
    <rect x="11" y="24" width="18" height="3" rx="0.5" fill="black"/>
    <rect x="8" y="36" width="24" height="2" rx="0.5" fill="black"/>
  </svg>
)


const documentContents: Record<string, { title: string; content: React.ReactNode; hasLogo: boolean }> = {
  offer: {
    title: "ПУБЛИЧНАЯ ОФЕРТА",
    hasLogo: true,
    content: (
      <div className="space-y-6 text-sm leading-relaxed">
        <p className="text-center font-bold">yourdomain.ru</p>
        <p className="text-center text-xs">НПД Фиалковский Никита Максимович. ИНН 636705565800</p>
        <div className="space-y-4">
          <h3 className="font-bold">1. ОБЩИЕ ПОЛОЖЕНИЯ</h3>
          <p>1.1. Настоящая публичная оферта является официальным предложением сервиса Avelon заключить договор на оказание услуг хостинга.</p>
          <p>1.2. Акцептом Оферты является оплата услуг Сервиса любым доступным способом.</p>
          <h3 className="font-bold">2. ПРЕДМЕТ ДОГОВОРА</h3>
          <p>2.1. Сервис предоставляет Пользователю услуги по аренде виртуальных игровых серверов.</p>
          <h3 className="font-bold">3. ОПЛАТА УСЛУГ</h3>
          <p>3.1. Оплата производится в рублях или криптовалюте через платёжные системы на сайте.</p>
          <p>3.2. Средства зачисляются на баланс после подтверждения платежа.</p>
          <h3 className="font-bold">4. ВОЗВРАТ СРЕДСТВ</h3>
          <p>4.1. Возврат неиспользованных средств возможен в течение 14 дней с момента пополнения.</p>
        </div>
      </div>
    )
  },
  terms: {
    title: "ПОЛЬЗОВАТЕЛЬСКОЕ СОГЛАШЕНИЕ",
    hasLogo: true,
    content: (
      <div className="space-y-6 text-sm leading-relaxed">
        <p className="text-center font-bold">yourdomain.ru</p>
        <p className="text-center text-xs">НПД Фиалковский Никита Максимович. ИНН 636705565800</p>
        <div className="space-y-4">
          <h3 className="font-bold">1. ОБЩИЕ ПОЛОЖЕНИЯ</h3>
          <p>1.1. Настоящее Соглашение регулирует отношения между сервисом Avelon и пользователем услуг.</p>
          <h3 className="font-bold">2. ПРЕДМЕТ СОГЛАШЕНИЯ</h3>
          <p>2.1. Сервис предоставляет услуги хостинга игровых серверов и VDS.</p>
          <h3 className="font-bold">3. ЗАПРЕЩЁННАЯ ДЕЯТЕЛЬНОСТЬ</h3>
          <p>3.1. Запрещено: DDoS-атаки, ботнеты, спам, фишинг, нелегальный контент.</p>
        </div>
      </div>
    )
  },
  privacy: {
    title: "ПОЛИТИКА КОНФИДЕНЦИАЛЬНОСТИ",
    hasLogo: true,
    content: (
      <div className="space-y-6 text-sm leading-relaxed">
        <p className="text-center font-bold">yourdomain.ru</p>
        <p className="text-center text-xs">НПД Фиалковский Никита Максимович. ИНН 636705565800</p>
        <div className="space-y-4">
          <h3 className="font-bold">1. СБОР ИНФОРМАЦИИ</h3>
          <p>1.1. Сервис собирает: email, платёжную информацию, IP-адреса.</p>
          <h3 className="font-bold">2. ЗАЩИТА ДАННЫХ</h3>
          <p>2.1. Данные хранятся на защищённых серверах с шифрованием.</p>
        </div>
      </div>
    )
  },
  refund: {
    title: "ПОЛИТИКА ВОЗВРАТА СРЕДСТВ",
    hasLogo: true,
    content: (
      <div className="space-y-6 text-sm leading-relaxed">
        <p className="text-center font-bold">yourdomain.ru</p>
        <p className="text-center text-xs">НПД Фиалковский Никита Максимович. ИНН 636705565800</p>
        <div className="space-y-4">
          <h3 className="font-bold">1. УСЛОВИЯ ВОЗВРАТА</h3>
          <p>1.1. Возврат возможен в течение 24 часов, если услуга не активирована.</p>
          <h3 className="font-bold">2. ПОРЯДОК ОБРАЩЕНИЯ</h3>
          <p>2.1. Обратитесь в службу поддержки с причиной запроса.</p>
        </div>
      </div>
    )
  },
  sla: {
    title: "СОГЛАШЕНИЕ ОБ УРОВНЕ СЕРВИСА (SLA)",
    hasLogo: true,
    content: (
      <div className="space-y-6 text-sm leading-relaxed">
        <p className="text-center font-bold">yourdomain.ru</p>
        <p className="text-center text-xs">НПД Фиалковский Никита Максимович. ИНН 636705565800</p>
        <div className="space-y-4">
          <h3 className="font-bold">1. ГАРАНТИИ ДОСТУПНОСТИ</h3>
          <p>1.1. Сервис гарантирует доступность 99.5% в месяц.</p>
          <h3 className="font-bold">2. ТЕХНИЧЕСКАЯ ПОДДЕРЖКА</h3>
          <p>2.1. Поддержка работает 24/7. Среднее время ответа: до 30 минут.</p>
        </div>
      </div>
    )
  },
  liability: {
    title: "ОГРАНИЧЕНИЕ ОТВЕТСТВЕННОСТИ",
    hasLogo: true,
    content: (
      <div className="space-y-6 text-sm leading-relaxed">
        <p className="text-center font-bold">yourdomain.ru</p>
        <p className="text-center text-xs">НПД Фиалковский Никита Максимович. ИНН 636705565800</p>
        <div className="space-y-4">
          <h3 className="font-bold">1. ПРЕДЕЛЫ ОТВЕТСТВЕННОСТИ</h3>
          <p>1.1. Максимальная ответственность ограничена суммой за текущий период услуги.</p>
          <h3 className="font-bold">2. ИСКЛЮЧЕНИЯ</h3>
          <p>2.1. Сервис не несёт ответственности за потерю данных Клиента.</p>
        </div>
      </div>
    )
  },
}


function DocumentModal({ docId, onClose }: { docId: string; onClose: () => void }) {
  const doc = documentContents[docId]
  const docInfo = documents.find(d => d.id === docId)
  const contentRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  
  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true))
  }, [])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 300)
  }
  
  if (!doc) return null

  const handleDownload = () => {
    const content = contentRef.current
    if (!content) return
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(`<!DOCTYPE html><html><head><title>${doc.title} - Avelon</title><style>body{font-family:'Times New Roman',serif;padding:40px 60px;max-width:800px;margin:0 auto}h1{text-align:center;font-size:18px}h3{font-size:13px;margin-top:16px}p{font-size:11px;line-height:1.5}</style></head><body><h1>${doc.title}</h1>${content.innerHTML}</body></html>`)
    printWindow.document.close()
    printWindow.print()
  }

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${isVisible ? 'bg-black/50' : 'bg-black/0'}`} 
      onClick={handleClose}
    >
      <div 
        className={`relative w-full max-w-3xl max-h-[90vh] overflow-auto bg-white text-black rounded-lg shadow-2xl transition-all duration-300 ${isVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between p-4 bg-white border-b border-gray-200">
          <button onClick={handleDownload} className="flex items-center gap-2 px-4 py-2 text-sm bg-black text-white rounded hover:bg-gray-800 transition-colors">
            <Download className="size-4" />
            Скачать PDF
          </button>
          <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="size-5" />
          </button>
        </div>
        <div className="p-12" style={{ fontFamily: "'Times New Roman', serif" }}>
          {docInfo?.hasLogo && (
            <div className="flex justify-center mb-6">
              <AvelonLogoBlack />
            </div>
          )}
          <h1 className="text-center text-xl font-bold mb-8 tracking-wide">{doc.title}</h1>
          <div ref={contentRef}>{doc.content}</div>
          <div className="mt-16 pt-8 border-t border-gray-300">
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-2">
                <p className="font-bold text-xs">Директор Avelon</p>
                <p className="text-sm">Кирилл Рязанов</p>
                <SignatureRyazanov />
                <div className="w-32 border-t border-black" />
              </div>
              <div className="space-y-2">
                <p className="font-bold text-xs">Директор Avelon</p>
                <p className="text-sm">Никита Фиалковский</p>
                <SignatureFial />
                <div className="w-32 border-t border-black" />
              </div>
            </div>
            <p className="text-xs text-gray-600 mt-6">Дата: {new Date().toLocaleDateString('ru-RU')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}


export default function DocsPage() {
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null)

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => e.preventDefault()
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I') || (e.ctrlKey && e.shiftKey && e.key === 'J') || (e.ctrlKey && e.key === 'u')) {
        e.preventDefault()
      }
    }
    document.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="px-8 pt-32 pb-20 md:px-16 lg:px-24">
        <div className="mx-auto max-w-5xl">
          <h1 className="font-heading text-3xl font-bold text-foreground md:text-4xl">Документация</h1>
          <p className="mt-4 text-muted-foreground">Официальные документы Avelon</p>
          
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {documents.map((doc) => (
              <button
                key={doc.id}
                onClick={() => setSelectedDoc(doc.id)}
                className="group flex flex-col items-start gap-4 rounded-2xl border border-border/50 bg-card/30 p-6 text-left transition-all hover:border-primary/50 hover:bg-card/60"
              >
                <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10">
                  <doc.icon className="size-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-foreground group-hover:text-primary transition-colors">{doc.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{doc.description}</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <FileText className="size-3" />
                  <span>Открыть документ</span>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-16 rounded-2xl border border-border/50 bg-card/20 p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10">
                <Building2 className="size-6 text-primary" />
              </div>
              <div>
                <h2 className="font-heading text-xl font-bold text-foreground">yourdomain.ru</h2>
                <p className="text-sm text-muted-foreground">Хостинг игровых серверов</p>
              </div>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2 text-sm text-muted-foreground">
                <p><span className="text-foreground font-medium">Email:</span> support@yourdomain.ru</p>
                <p><span className="text-foreground font-medium">Abuse:</span> abuse@yourdomain.ru</p>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p><span className="text-foreground font-medium">Директора:</span> Кирилл Рязанов, Никита Фиалковский</p>
                <p><span className="text-foreground font-medium">НПД:</span> Фиалковский Н.М. ИНН 636705565800</p>
              </div>
            </div>
          </div>
          <p className="mt-8 text-center text-xs text-muted-foreground">Все документы имеют юридическую силу</p>
        </div>
      </div>
      {selectedDoc && <DocumentModal docId={selectedDoc} onClose={() => setSelectedDoc(null)} />}
      <Footer />
    </main>
  )
}
