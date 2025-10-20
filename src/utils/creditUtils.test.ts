import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getPayload } from 'payload'
import config from '../payload.config'
import { freezeCredit, releaseCredit } from './creditUtils'

describe('Credit Utils - 授信额度管理', () => {
  let payload: any
  let testMerchant: any
  let testAccount: any
  let testUser: any
  let testCredit: any

  beforeAll(async () => {
    payload = await getPayload({ config })

    // 创建测试商户
    testMerchant = await payload.create({
      collection: 'merchants',
      data: {
        name: '测试商户-授信',
        status: 'approved',
        contact: {
          name: '测试联系人',
          phone: '13800138000',
        },
      },
    })

    // 创建测试账号
    testAccount = await payload.create({
      collection: 'accounts',
      data: {
        username: `test-credit-user-${Date.now()}`,
        phone: '13800138999',
        password: 'Test123!',
        status: 'active',
      },
    })

    // 创建测试用户（关联到账号）
    testUser = await payload.create({
      collection: 'users',
      data: {
        account: testAccount.id,
        user_type: 'customer',
        role: 'customer',
        status: 'active',
      },
    })

    // 创建测试授信
    testCredit = await payload.create({
      collection: 'user-merchant-credit',
      data: {
        user: testUser.id,
        merchant: testMerchant.id,
        credit_limit: 10000,
        used_credit: 0,
        status: 'active',
      },
    })
  })

  afterAll(async () => {
    // 清理测试数据
    if (testCredit) {
      await payload.delete({
        collection: 'user-merchant-credit',
        id: testCredit.id,
      })
    }
    if (testUser) {
      await payload.delete({
        collection: 'users',
        id: testUser.id,
      })
    }
    if (testAccount) {
      await payload.delete({
        collection: 'accounts',
        id: testAccount.id,
      })
    }
    if (testMerchant) {
      await payload.delete({
        collection: 'merchants',
        id: testMerchant.id,
      })
    }
  })

  it('应该能够冻结授信额度', async () => {
    // 冻结 3000 元
    await freezeCredit(payload, testUser.id, testMerchant.id, 3000)

    // 验证 used_credit 已更新
    const updatedCredit = await payload.findByID({
      collection: 'user-merchant-credit',
      id: testCredit.id,
    })

    expect(updatedCredit.used_credit).toBe(3000)
    expect(updatedCredit.available_credit).toBe(7000)
  })

  it('应该能够释放授信额度', async () => {
    // 先确保有已用额度
    await payload.update({
      collection: 'user-merchant-credit',
      id: testCredit.id,
      data: {
        used_credit: 5000,
      },
    })

    // 释放 2000 元
    await releaseCredit(payload, testUser.id, testMerchant.id, 2000)

    // 验证 used_credit 已更新
    const updatedCredit = await payload.findByID({
      collection: 'user-merchant-credit',
      id: testCredit.id,
    })

    expect(updatedCredit.used_credit).toBe(3000)
    expect(updatedCredit.available_credit).toBe(7000)
  })

  it('授信额度不足时应该抛出错误', async () => {
    // 重置 used_credit
    await payload.update({
      collection: 'user-merchant-credit',
      id: testCredit.id,
      data: {
        used_credit: 0,
      },
    })

    // 尝试冻结超过额度的金额
    await expect(
      freezeCredit(payload, testUser.id, testMerchant.id, 15000)
    ).rejects.toThrow('授信额度不足')
  })

  it('授信状态不可用时应该抛出错误', async () => {
    // 禁用授信
    await payload.update({
      collection: 'user-merchant-credit',
      id: testCredit.id,
      data: {
        status: 'disabled',
        used_credit: 0,
      },
    })

    // 尝试冻结额度
    await expect(
      freezeCredit(payload, testUser.id, testMerchant.id, 1000)
    ).rejects.toThrow('授信状态不可用')

    // 恢复授信状态
    await payload.update({
      collection: 'user-merchant-credit',
      id: testCredit.id,
      data: {
        status: 'active',
      },
    })
  })

  it('释放额度时不应该让 used_credit 变为负数', async () => {
    // 设置 used_credit 为 1000
    await payload.update({
      collection: 'user-merchant-credit',
      id: testCredit.id,
      data: {
        used_credit: 1000,
      },
    })

    // 释放 2000 元（超过已用额度）
    await releaseCredit(payload, testUser.id, testMerchant.id, 2000)

    // 验证 used_credit 为 0 而不是负数
    const updatedCredit = await payload.findByID({
      collection: 'user-merchant-credit',
      id: testCredit.id,
    })

    expect(updatedCredit.used_credit).toBe(0)
    expect(updatedCredit.available_credit).toBe(10000)
  })
})
