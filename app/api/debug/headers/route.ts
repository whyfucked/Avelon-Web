import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const headers: Record<string, string> = {}
  
  request.headers.forEach((value, key) => {
    headers[key] = value
  })
  
  return NextResponse.json({
    headers,
    url: request.url,
    method: request.method,
    ip: request.ip,
  })
}

export async function POST(request: NextRequest) {
  const headers: Record<string, string> = {}
  
  request.headers.forEach((value, key) => {
    headers[key] = value
  })
  
  let body = null
  try {
    body = await request.json()
  } catch {
    // ignore
  }
  
  return NextResponse.json({
    headers,
    body,
    url: request.url,
    method: request.method,
    ip: request.ip,
  })
}
