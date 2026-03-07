import { currencies, Currency, ServerData, Node } from "./types"

export const formatPrice = (price: number, currency: Currency) => {
  const { symbol, rate } = currencies[currency]
  const converted = price * rate
  // Для рубля и гривны показываем целые числа
  if (currency === "₽" || currency === "₴") return `${Math.round(converted)} ${symbol}`
  // Для доллара и евро показываем 2 знака после запятой
  return `${converted.toFixed(2)} ${symbol}`
}

export const formatBytes = (mb: number) => {
  if (mb >= 1024) return `${(mb / 1024).toFixed(0)} ГБ`
  return `${mb} МБ`
}

export const calculateRefund = (server: ServerData) => {
  if (!server.expiresAt) return 0
  const now = new Date()
  const expires = new Date(server.expiresAt)
  const msRemaining = expires.getTime() - now.getTime()
  if (msRemaining <= 0) return 0
  
  const daysRemaining = msRemaining / (1000 * 60 * 60 * 24)
  // Используем paidAmount если есть, иначе plan.price + node.priceModifier
  const actualPaidPrice = server.paidAmount ?? (server.plan.price + (server.node?.priceModifier ?? 0))
  const dailyRate = actualPaidPrice / 30
  return Math.floor(daysRemaining * dailyRate)
}

export const formatTimeRemaining = (server: ServerData) => {
  if (!server.expiresAt) return 'Не указано'
  const now = new Date()
  const expires = new Date(server.expiresAt)
  const msRemaining = expires.getTime() - now.getTime()
  if (msRemaining <= 0) return 'Истекло'
  
  const days = Math.floor(msRemaining / (1000 * 60 * 60 * 24))
  const hours = Math.floor((msRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  
  if (days > 0) return `${days} дн. ${hours} ч.`
  return `${hours} ч.`
}

export const calculateNodeLoad = (node: Node): number => {
  const maxServers = 60
  const serverCount = node._count?.servers || 0
  const loadPercent = (serverCount / maxServers) * 100
  return Math.min(Math.round(loadPercent), 100)
}
