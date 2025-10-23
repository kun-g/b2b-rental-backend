import { describe, it, expect, beforeAll } from 'vitest'
import { getPayload, Payload } from 'payload'
import config from '@/payload.config'
import { createOrIncrementCreditHandler } from '@/endpoints/createOrIncrementCredit'

describe('授信创建或累加 API - /api/user-merchant-credit/create-or-increment', () => {
  let payload: Payload
  let merchantId: number
  let customerUserId: number

  beforeAll(async () => {
    const payloadConfig = await config
    payload = await getPayload({ config: payloadConfig })

    // 创建测试账号
    const account = await payload.create({
      collection: 'accounts',
      data: {
        username: 'test_create_increment',
        password: 'test123',
        phone: '13800000010',
        email: 'test_increment@example.com',
      },
    })

    // 创建商户
    const merchant = await payload.create({
      collection: 'merchants',
      data: {
        name: '测试商户',
        status: 'approved',
        contact: {
          name: '测试',
          phone: '13900000010',
          email: 'test@merchant10.com',
        },
        settlement_account: {
          bank_name: '测试银行',
          account_number: '1234567890',
          account_name: '测试商户有限公司',
        },
        notes: '测试',
      },
    })
    merchantId = merchant.id

    // 创建用户
    const user = await payload.create({
      collection: 'users',
      data: {
        account: account.id,
        role: 'customer',
        name: '测试用户',
      },
    })
    customerUserId = user.id
  })

  it('首次调用应该创建新授信', async () => {
    // 模拟 HTTP 请求
    const mockReq: any = {
      payload,
      body: {
        user: customerUserId,
        merchant: merchantId,
        credit_limit: 10000,
        notes: '首次创建',
      },
    }

    const mockRes: any = {
      status: (code: number) => ({
        json: (data: any) => {
          expect(code).toBe(200)
          expect(data.success).toBe(true)
          expect(data.action).toBe('created')
          expect(data.data.credit_limit).toBe(10000)
          // user 和 merchant 可能返回对象或 ID，两种情况都接受
          const userId = typeof data.data.user === 'object' ? data.data.user.id : data.data.user
          const merId = typeof data.data.merchant === 'object' ? data.data.merchant.id : data.data.merchant
          expect(userId).toBe(customerUserId)
          expect(merId).toBe(merchantId)
          expect(data.message).toBeUndefined() // 首次创建没有 message
          return data
        },
      }),
    }

    await createOrIncrementCreditHandler(mockReq, mockRes)
  })

  it('再次调用应该累加授信额度', async () => {
    const mockReq: any = {
      payload,
      body: {
        user: customerUserId,
        merchant: merchantId,
        credit_limit: 5000,
        notes: '追加授信',
      },
    }

    const mockRes: any = {
      status: (code: number) => ({
        json: (data: any) => {
          expect(code).toBe(200)
          expect(data.success).toBe(true)
          expect(data.action).toBe('incremented')
          expect(data.data.credit_limit).toBe(15000) // 10000 + 5000
          expect(data.message).toBeDefined()
          expect(data.message).toContain('10000')
          expect(data.message).toContain('15000')
          expect(data.message).toContain('5000')
          return data
        },
      }),
    }

    await createOrIncrementCreditHandler(mockReq, mockRes)
  })

  it('第三次调用应该继续累加', async () => {
    const mockReq: any = {
      payload,
      body: {
        user: customerUserId,
        merchant: merchantId,
        credit_limit: 3000,
        // 不提供 notes，应该使用默认消息
      },
    }

    const mockRes: any = {
      status: (code: number) => ({
        json: (data: any) => {
          expect(code).toBe(200)
          expect(data.success).toBe(true)
          expect(data.action).toBe('incremented')
          expect(data.data.credit_limit).toBe(18000) // 15000 + 3000
          expect(data.message).toContain('15000')
          expect(data.message).toContain('18000')
          expect(data.message).toContain('3000')
          return data
        },
      }),
    }

    await createOrIncrementCreditHandler(mockReq, mockRes)

    // 验证 notes 使用了默认消息
    const credits = await payload.find({
      collection: 'user-merchant-credit',
      where: {
        and: [
          {
            user: {
              equals: customerUserId,
            },
          },
          {
            merchant: {
              equals: merchantId,
            },
          },
        ],
      },
    })

    expect(credits.docs[0].notes).toContain('新增授信额度 3000元')
  })

  it('应该验证必填字段', async () => {
    const mockReq: any = {
      payload,
      body: {
        // 缺少 user 字段
        merchant: merchantId,
        credit_limit: 1000,
      },
    }

    const mockRes: any = {
      status: (code: number) => ({
        json: (data: any) => {
          expect(code).toBe(400)
          expect(data.success).toBe(false)
          expect(data.error).toContain('缺少必填字段')
          return data
        },
      }),
    }

    await createOrIncrementCreditHandler(mockReq, mockRes)
  })

  it('应该验证授信额度必须大于0', async () => {
    const mockReq: any = {
      payload,
      body: {
        user: customerUserId,
        merchant: merchantId,
        credit_limit: -100, // 负数
      },
    }

    const mockRes: any = {
      status: (code: number) => ({
        json: (data: any) => {
          expect(code).toBe(400)
          expect(data.success).toBe(false)
          expect(data.error).toContain('授信额度必须大于 0')
          return data
        },
      }),
    }

    await createOrIncrementCreditHandler(mockReq, mockRes)
  })
})
