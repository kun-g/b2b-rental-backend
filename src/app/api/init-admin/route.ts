/**
 * 临时端点：初始化管理员账号
 * 仅在数据库为空时可用，创建后应该删除此文件
 */

import { getPayload } from 'payload'
import config from '@/payload.config'
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ message: 'Use POST method to initialize admin' })
}

export async function POST() {
  try {
    const payload = await getPayload({ config })

    // 检查是否已有账号
    const existingAccounts = await payload.find({
      collection: 'accounts',
      limit: 1,
    })

    if (existingAccounts.docs.length > 0) {
      return NextResponse.json(
        { error: '数据库已有账号，无法重复初始化' },
        { status: 400 }
      )
    }

    // 创建管理员 Account
    const adminAccount = await payload.create({
      collection: 'accounts',
      data: {
        username: 'kun',
        email: 'admin@platform.com',
        phone: '13900000001',
        password: '123',
        status: 'active',
      },
    })

    // 创建管理员 User
    const adminUser = await payload.create({
      collection: 'users',
      data: {
        account: adminAccount.id,
        user_type: 'platform',
        role: 'platform_admin',
        status: 'active',
      },
    })

    return NextResponse.json({
      success: true,
      message: '管理员账号创建成功',
      account: {
        username: adminAccount.username,
        email: adminAccount.email,
      },
      credentials: {
        username: 'kun',
        password: '123',
      },
    })
  } catch (error) {
    console.error('初始化管理员失败:', error)
    return NextResponse.json(
      { error: '初始化失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
