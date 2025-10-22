import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * CORS Middleware for Payload 3.x
 *
 * Payload 3.x 运行在 Next.js 之上，需要在 Next.js 层面处理 CORS
 */
export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin')

  // 检查是否允许该 origin
  const isAllowed = checkOrigin(origin)

  // 处理 preflight 请求
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 200 })

    if (isAllowed && origin) {
      response.headers.set('Access-Control-Allow-Origin', origin)
      response.headers.set('Access-Control-Allow-Credentials', 'true')
    }

    response.headers.set(
      'Access-Control-Allow-Methods',
      'GET,DELETE,PATCH,POST,PUT,OPTIONS'
    )
    response.headers.set(
      'Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, X-Payload-HTTP-Method-Override'
    )
    response.headers.set('Access-Control-Max-Age', '86400')

    return response
  }

  // 处理实际请求
  const response = NextResponse.next()

  if (isAllowed && origin) {
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Access-Control-Allow-Credentials', 'true')
  }

  return response
}

/**
 * 检查 origin 是否被允许
 */
function checkOrigin(origin: string | null): boolean {
  if (!origin) return false

  // 静态允许列表
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:8080',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'https://bfront.flashflock.com',
    process.env.PAYLOAD_PUBLIC_SERVER_URL || '',
    ...(process.env.CORS_ALLOWED_ORIGINS
      ? process.env.CORS_ALLOWED_ORIGINS.split(',').map((o) => o.trim())
      : []),
  ].filter(Boolean)

  // 精确匹配
  if (allowedOrigins.includes(origin)) {
    return true
  }

  // 匹配 lovable.app 所有子域名
  if (/^https:\/\/.*\.lovable\.app$/.test(origin)) {
    return true
  }

  // 匹配 lovableproject.com 所有子域名
  if (/^https:\/\/.*\.lovableproject\.com$/.test(origin)) {
    return true
  }

  // 支持自定义通配符域名
  const wildcardDomains = process.env.CORS_WILDCARD_DOMAINS?.split(',').map((d) => d.trim()) || []
  for (const domain of wildcardDomains) {
    if (domain.startsWith('*.')) {
      const baseDomain = domain.slice(2)
      const regex = new RegExp(`^https?://.*\\.${baseDomain.replace(/\./g, '\\.')}$`)
      if (regex.test(origin)) {
        return true
      }
    }
  }

  return false
}

// 配置 middleware 仅匹配 API 路由
export const config = {
  matcher: '/api/:path*',
}
