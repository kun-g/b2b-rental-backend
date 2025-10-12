import { NextRequest, NextResponse } from 'next/server'

/**
 * 健康检查端点
 * 用于 Docker healthcheck 和负载均衡器
 */
export async function GET(request: NextRequest) {
  try {
    // 基础健康检查 - 应用运行中
    const healthData = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
    }

    return NextResponse.json(healthData, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    )
  }
}
