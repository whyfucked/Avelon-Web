import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  console.error('CRITICAL: JWT_SECRET environment variable is not set!')
}

function isAdmin(request: NextRequest): boolean {
  if (!JWT_SECRET) return false
  
  const token = request.cookies.get('auth-token')?.value
  if (!token) return false
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role?: string }
    return decoded.role === 'ADMIN'
  } catch {
    return false
  }
}

function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:;"
  )
  
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  )
  
  return response
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://yourdomain.ru'

  if (
    pathname.startsWith('/_next') ||
    pathname === '/maintenance' ||
    pathname.startsWith('/maintenance') ||
    pathname.includes('.')
  ) {
    return addSecurityHeaders(NextResponse.next())
  }

  if (pathname.startsWith('/api')) {
    const method = request.method
    
    if (pathname.startsWith('/api/admin')) {
      if (!JWT_SECRET) {
        console.error('[Middleware] JWT_SECRET not configured, blocking admin API access')
        return NextResponse.json(
          { error: 'Server configuration error' },
          { status: 500 }
        )
      }
      
      const token = request.cookies.get('auth-token')?.value
      
      if (!token) {
        return NextResponse.json(
          { error: 'Unauthorized: Authentication required' },
          { status: 401 }
        )
      }
      
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role?: string }
        
        if (decoded.role !== 'ADMIN') {
          console.warn(`[Middleware] Non-admin user attempted to access admin API: ${pathname}`)
          return NextResponse.json(
            { error: 'Forbidden: Admin access required' },
            { status: 403 }
          )
        }
      } catch (error) {
        console.warn(`[Middleware] Invalid token for admin API access: ${pathname}`)
        return NextResponse.json(
          { error: 'Unauthorized: Invalid or expired token' },
          { status: 401 }
        )
      }
    }
    
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      let origin = request.headers.get('origin')
      const referer = request.headers.get('referer')
      const forwardedHost = request.headers.get('x-forwarded-host')
      const forwardedProto = request.headers.get('x-forwarded-proto') || 'https'
      
      if (!origin && forwardedHost) {
        origin = `${forwardedProto}://${forwardedHost}`
        console.log(`[Middleware] Reconstructed origin from CDN headers: ${origin}`)
      }
      
      const webhookPaths = ['/api/heleket/', '/api/yoomoney/', '/api/crystalpay/', '/api/cron/']
      const isWebhook = webhookPaths.some(path => pathname.startsWith(path))
      
      if (isWebhook) {
        return addSecurityHeaders(NextResponse.next())
      }
      
      if (origin) {
        const allowedOrigins = [
          baseUrl,
          'https://yourdomain.ru',
          'http://localhost:3000',
          'http://127.0.0.1:3000'
        ]
        
        const isAllowed = allowedOrigins.some(allowed => 
          origin === allowed || origin.startsWith(allowed)
        )
        
        if (!isAllowed) {
          console.warn(`[Middleware] Blocked request from origin: ${origin} for path: ${pathname}`)
          console.warn(`[Middleware] Headers:`, {
            origin,
            referer,
            host: request.headers.get('host'),
            'x-forwarded-host': forwardedHost,
            'x-forwarded-proto': forwardedProto
          })
          return new NextResponse('Forbidden', { status: 403 })
        }
      } else if (!referer) {
        const allowedWithoutOrigin = ['/api/auth/login', '/api/auth/register', '/api/auth/me']
        if (!allowedWithoutOrigin.includes(pathname)) {
          console.warn(`[Middleware] Request without origin/referer to: ${pathname}`)
        }
      }
    }
    
    return addSecurityHeaders(NextResponse.next())
  }

  const maintenanceMode = request.cookies.get('maintenance-mode')?.value === 'true'
  
  if (maintenanceMode && !pathname.startsWith('/admin')) {
    const admin = isAdmin(request)
    if (!admin) {
      return NextResponse.redirect(new URL('/maintenance', baseUrl))
    }
  }

  // Защита админки
  if (pathname.startsWith('/admin')) {
    if (!JWT_SECRET) {
      console.error('[Middleware] JWT_SECRET not configured, blocking admin access')
      return NextResponse.redirect(new URL('/client', baseUrl))
    }
    
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.redirect(new URL('/client', baseUrl))
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role?: string }
      
      if (decoded.role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/client', baseUrl))
      }
    } catch {
      return NextResponse.redirect(new URL('/client', baseUrl))
    }
  }

  return addSecurityHeaders(NextResponse.next())
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
  runtime: 'nodejs',
}
