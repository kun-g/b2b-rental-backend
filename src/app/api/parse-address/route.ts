import { NextRequest, NextResponse } from 'next/server'
import { parseAddress } from '@/utils/addressParser'

/**
 * 地址解析端点
 * 将完整的中国地址字符串解析为结构化的省市区街道组件
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { address } = body

    // 验证输入
    if (!address || typeof address !== 'string') {
      return NextResponse.json(
        {
          error: 'Invalid input',
          message: '请提供有效的地址字符串',
        },
        { status: 400 }
      )
    }

    // 解析地址
    const parsed = parseAddress(address.trim())

    // 返回解析结果
    return NextResponse.json({
      success: true,
      data: parsed,
      original: address,
    }, { status: 200 })

  } catch (error) {
    console.error('地址解析错误:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Parse error',
        message: error instanceof Error ? error.message : '地址解析失败',
      },
      { status: 500 }
    )
  }
}
