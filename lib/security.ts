/**
 * Security Utilities
 * Централизованные функции безопасности
 */

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

// ============================================================================
// Rate Limiting (In-Memory для простоты, в production использовать Redis)
// ============================================================================

interface RateLimitEntry {
  count: number
  resetAt: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key)
    }
  }
}, 5 * 60 * 1000)

export interface RateLimitConfig {
  maxRequests: number  // Максимум запросов
  windowMs: number     // Окно времени в миллисекундах
}

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = { maxRequests: 10, windowMs: 60 * 1000 }
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const key = identifier
  
  let entry = rateLimitStore.get(key)
  
  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + config.windowMs }
    rateLimitStore.set(key, entry)
  }
  
  entry.count++
  
  return {
    allowed: entry.count <= config.maxRequests,
    remaining: Math.max(0, config.maxRequests - entry.count),
    resetAt: entry.resetAt
  }
}

export function rateLimitResponse(resetAt: number): NextResponse {
  const secondsLeft = Math.ceil((resetAt - Date.now()) / 1000)
  return NextResponse.json(
    { error: `Слишком много попыток. Повторите через ${secondsLeft} сек.` },
    { 
      status: 429,
      headers: {
        'Retry-After': String(secondsLeft),
        'X-RateLimit-Reset': String(resetAt)
      }
    }
  )
}

// ============================================================================
// CSRF Protection
// ============================================================================

const CSRF_SECRET = process.env.CSRF_SECRET || process.env.JWT_SECRET || ''

export function generateCsrfToken(sessionId: string): string {
  const timestamp = Date.now().toString()
  const data = `${sessionId}:${timestamp}`
  const signature = crypto
    .createHmac('sha256', CSRF_SECRET)
    .update(data)
    .digest('hex')
  return Buffer.from(`${data}:${signature}`).toString('base64')
}

export function validateCsrfToken(token: string, sessionId: string): boolean {
  try {
    const decoded = Buffer.from(token, 'base64').toString()
    const [storedSessionId, timestamp, signature] = decoded.split(':')
    
    if (storedSessionId !== sessionId) return false
    
    const tokenAge = Date.now() - parseInt(timestamp)
    if (tokenAge > 60 * 60 * 1000) return false
    
    const expectedSignature = crypto
      .createHmac('sha256', CSRF_SECRET)
      .update(`${storedSessionId}:${timestamp}`)
      .digest('hex')
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  } catch {
    return false
  }
}

// ============================================================================
// Input Validation
// ============================================================================

export function sanitizeString(input: string, maxLength: number = 255): string {
  if (typeof input !== 'string') return ''
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>\"\'&]/g, (char) => {
      const entities: Record<string, string> = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '&': '&amp;'
      }
      return entities[char] || char
    })
}

const TRUSTED_EMAIL_DOMAINS = [
  'gmail.com', 'googlemail.com',
  'outlook.com', 'hotmail.com', 'live.com', 'msn.com',
  'yahoo.com', 'yahoo.ru', 'yandex.ru', 'yandex.com', 'ya.ru',
  'mail.ru', 'inbox.ru', 'list.ru', 'bk.ru',
  'rambler.ru',
  'icloud.com', 'me.com', 'mac.com',
  'protonmail.com', 'proton.me',
  'aol.com',
  'zoho.com',
  'gmx.com', 'gmx.net',
  'tutanota.com', 'tuta.io',
]

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email) && email.length <= 255
}

export function isEmailFromTrustedDomain(email: string): boolean {
  const domain = email.toLowerCase().split('@')[1]
  if (!domain) return false
  return TRUSTED_EMAIL_DOMAINS.includes(domain)
}

export function getEmailDomain(email: string): string {
  return email.toLowerCase().split('@')[1] || ''
}

export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (password.length < 8) {
    errors.push('Пароль должен быть минимум 8 символов')
  }
  if (password.length > 128) {
    errors.push('Пароль слишком длинный')
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Пароль должен содержать строчные буквы')
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Пароль должен содержать заглавные буквы')
  }
  if (!/\d/.test(password)) {
    errors.push('Пароль должен содержать цифры')
  }
  
  return { valid: errors.length === 0, errors }
}

export function validateAmount(amount: unknown): { valid: boolean; value: number; error?: string } {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return { valid: false, value: 0, error: 'Сумма должна быть числом' }
  }
  if (amount <= 0) {
    return { valid: false, value: 0, error: 'Сумма должна быть положительной' }
  }
  if (amount < 10) {
    return { valid: false, value: 0, error: 'Минимальная сумма: 10 ₽' }
  }
  if (amount > 100000) {
    return { valid: false, value: 0, error: 'Максимальная сумма: 100 000 ₽' }
  }
  return { valid: true, value: Math.round(amount * 100) / 100 }
}

// ============================================================================
// Request Helpers
// ============================================================================

export function getClientIp(request: NextRequest): string {
  // Bunny.net CDN headers
  const bunnyIp = request.headers.get('cdn-real-ip') || 
                  request.headers.get('x-pullzone-ip') ||
                  request.headers.get('x-bunny-ip')
  
  if (bunnyIp) return bunnyIp
  
  // Standard proxy headers
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    const ips = forwardedFor.split(',').map(ip => ip.trim())
    return ips[0]
  }
  
  return (
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') || // Cloudflare
    request.headers.get('true-client-ip') || // Cloudflare Enterprise
    request.headers.get('x-client-ip') ||
    'unknown'
  )
}

export function getUserAgent(request: NextRequest): string {
  return request.headers.get('user-agent') || 'unknown'
}

// ============================================================================
// Secure Comparison
// ============================================================================

export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

// ============================================================================
// Webhook Signature Validation
// ============================================================================

export function validateWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
  algorithm: 'sha256' | 'md5' = 'sha256'
): boolean {
  const expectedSignature = crypto
    .createHmac(algorithm, secret)
    .update(payload)
    .digest('hex')
  
  return secureCompare(expectedSignature.toLowerCase(), signature.toLowerCase())
}

// ============================================================================
// Idempotency (защита от replay атак)
// ============================================================================

const processedWebhooks = new Map<string, number>()

setInterval(() => {
  const now = Date.now()
  const maxAge = 24 * 60 * 60 * 1000 // 24 часа
  for (const [key, timestamp] of processedWebhooks.entries()) {
    if (now - timestamp > maxAge) {
      processedWebhooks.delete(key)
    }
  }
}, 10 * 60 * 1000)

export function isWebhookProcessed(webhookId: string): boolean {
  return processedWebhooks.has(webhookId)
}

export function markWebhookProcessed(webhookId: string): void {
  processedWebhooks.set(webhookId, Date.now())
}

export function generateWebhookId(provider: string, orderId: string, amount: number): string {
  return crypto
    .createHash('sha256')
    .update(`${provider}:${orderId}:${amount}`)
    .digest('hex')
}

// ============================================================================
// Security Headers
// ============================================================================

export function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  return response
}

// ============================================================================
// Audit Logging
// ============================================================================

export interface AuditLogEntry {
  timestamp: string
  userId?: string
  action: string
  resource?: string
  resourceId?: string
  ip: string
  userAgent: string
  details?: Record<string, unknown>
  success: boolean
}

export function createAuditLog(
  request: NextRequest,
  action: string,
  options: {
    userId?: string
    resource?: string
    resourceId?: string
    details?: Record<string, unknown>
    success?: boolean
  } = {}
): AuditLogEntry {
  const entry: AuditLogEntry = {
    timestamp: new Date().toISOString(),
    userId: options.userId,
    action,
    resource: options.resource,
    resourceId: options.resourceId,
    ip: getClientIp(request),
    userAgent: getUserAgent(request),
    details: options.details,
    success: options.success ?? true
  }
  
  console.log('[AUDIT]', JSON.stringify(entry))
  
  return entry
}
