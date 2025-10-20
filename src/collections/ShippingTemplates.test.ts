import { describe, it, expect, beforeAll, afterEach, beforeEach } from 'vitest'
import { getPayload, Payload } from 'payload'
import config from '@/payload.config'
import type { Account, User, Merchant, ShippingTemplate } from '../payload-types'

/**
 * ShippingTemplates Collection 测试
 *
 * 重点测试：
 * 1. Access Control（访问控制）
 *    - 平台管理员可以查看所有模板
 *    - 商户管理员只能查看自己商户的模板
 *    - 普通用户只能查看有授信的商户的模板
 */
describe('ShippingTemplates Collection - Access Control', () => {
  let payload: Payload
  let platformAdminAccount: Account
  let platformAdminUser: User
  let merchantAdminAccount: Account
  let merchantAdminUser: User
  let customerAccount: Account
  let customerUser: User
  let merchant1: Merchant
  let merchant2: Merchant
  let template1: ShippingTemplate // merchant1 的模板
  let template2: ShippingTemplate // merchant2 的模板

  beforeAll(async () => {
    const payloadConfig = await config
    payload = await getPayload({ config: payloadConfig })
  })

  beforeEach(async () => {
    // 使用时间戳确保用户名唯一
    const timestamp = Date.now()
    // 生成有效的手机号（11位，1[3-9]开头）
    const phoneBase = timestamp % 100000000 // 8位数字
    const phone1 = `138${String(phoneBase).padStart(8, '0')}`
    const phone2 = `139${String(phoneBase).padStart(8, '0')}`
    const phone3 = `137${String(phoneBase).padStart(8, '0')}`

    // 1. 创建平台管理员账号
    platformAdminAccount = await payload.create({
      collection: 'accounts',
      data: {
        username: `test_platform_admin_${timestamp}`,
        phone: phone1,
        password: 'admin123',
        status: 'active',
      },
    })

    platformAdminUser = await payload.create({
      collection: 'users',
      data: {
        account: platformAdminAccount.id,
        user_type: 'platform',
        role: 'platform_admin',
        status: 'active',
      },
    })

    // 2. 创建两个商户（包含必填的 contact group 字段）
    merchant1 = await payload.create({
      collection: 'merchants',
      data: {
        name: `测试商户1_${timestamp}`,
        status: 'approved',
        contact: {
          name: '张三',
          phone: '13800001002',
        },
      },
    })

    merchant2 = await payload.create({
      collection: 'merchants',
      data: {
        name: `测试商户2_${timestamp}`,
        status: 'approved',
        contact: {
          name: '李四',
          phone: '13800001003',
        },
      },
    })

    // 3. 创建商户1的管理员
    merchantAdminAccount = await payload.create({
      collection: 'accounts',
      data: {
        username: `test_merchant_admin_${timestamp}`,
        phone: phone2,
        password: 'merchant123',
        status: 'active',
      },
    })

    merchantAdminUser = await payload.create({
      collection: 'users',
      data: {
        account: merchantAdminAccount.id,
        user_type: 'merchant',
        role: 'merchant_admin',
        merchant: merchant1.id,
        status: 'active',
      },
    })

    // 4. 创建普通用户
    customerAccount = await payload.create({
      collection: 'accounts',
      data: {
        username: `test_customer_${timestamp}`,
        phone: phone3,
        password: 'customer123',
        status: 'active',
      },
    })

    customerUser = await payload.create({
      collection: 'users',
      data: {
        account: customerAccount.id,
        user_type: 'customer',
        role: 'customer',
        status: 'active',
      },
    })

    // 5. 创建快递模板
    template1 = await payload.create({
      collection: 'shipping-templates',
      data: {
        merchant: merchant1.id,
        name: '商户1默认模板',
        default_fee: 10,
        status: 'active',
        is_default: true,
      },
    })

    template2 = await payload.create({
      collection: 'shipping-templates',
      data: {
        merchant: merchant2.id,
        name: '商户2默认模板',
        default_fee: 15,
        status: 'active',
        is_default: true,
      },
    })

    // 6. 创建授信：普通用户对商户1有授信
    await payload.create({
      collection: 'user-merchant-credit',
      data: {
        user: customerUser.id,
        merchant: merchant1.id,
        credit_limit: 10000,
        status: 'active',
      },
    })
  })

  afterEach(async () => {
    // 清理测试数据
    // 1. 删除授信
    const credits = await payload.find({
      collection: 'user-merchant-credit',
      where: {
        user: {
          equals: customerUser.id,
        },
      },
      limit: 100,
    })
    for (const credit of credits.docs) {
      await payload.delete({
        collection: 'user-merchant-credit',
        id: credit.id,
      })
    }

    // 2. 删除快递模板
    const templates = await payload.find({
      collection: 'shipping-templates',
      where: {
        or: [
          { merchant: { equals: merchant1.id } },
          { merchant: { equals: merchant2.id } },
        ],
      },
      limit: 100,
    })
    for (const template of templates.docs) {
      await payload.delete({
        collection: 'shipping-templates',
        id: template.id,
      })
    }

    // 3. 删除用户
    for (const userId of [platformAdminUser.id, merchantAdminUser.id, customerUser.id]) {
      await payload.delete({
        collection: 'users',
        id: userId,
      })
    }

    // 4. 删除账号
    for (const accountId of [platformAdminAccount.id, merchantAdminAccount.id, customerAccount.id]) {
      await payload.delete({
        collection: 'accounts',
        id: accountId,
      })
    }

    // 5. 删除商户
    for (const merchantId of [merchant1.id, merchant2.id]) {
      await payload.delete({
        collection: 'merchants',
        id: merchantId,
      })
    }
  })

  describe('Access Control - Read', () => {
    it('应该允许平台管理员查看所有快递模板', async () => {
      const result = await payload.find({
        collection: 'shipping-templates',
        overrideAccess: false,
        user: platformAdminAccount,
      })

      // 平台管理员可以看到所有模板
      expect(result.docs.length).toBeGreaterThanOrEqual(2)
      const templateIds = result.docs.map((t) => t.id)
      expect(templateIds).toContain(template1.id)
      expect(templateIds).toContain(template2.id)
    })

    it('应该限制商户管理员只能查看自己商户的模板', async () => {
      const result = await payload.find({
        collection: 'shipping-templates',
        overrideAccess: false,
        user: merchantAdminAccount,
      })

      // 商户管理员只能看到自己商户的模板
      expect(result.docs).toHaveLength(1)
      expect(result.docs[0].id).toBe(template1.id)
    })

    it('应该限制普通用户只能查看有授信的商户的模板', async () => {
      const result = await payload.find({
        collection: 'shipping-templates',
        overrideAccess: false,
        user: customerAccount,
      })

      // 普通用户只能看到有授信的商户（merchant1）的模板
      expect(result.docs).toHaveLength(1)
      expect(result.docs[0].id).toBe(template1.id)

      // 确认看不到 merchant2 的模板
      const templateIds = result.docs.map((t) => t.id)
      expect(templateIds).not.toContain(template2.id)
    })

    it('应该拒绝没有授信的普通用户查看任何模板', async () => {
      // 创建一个没有任何授信的新用户
      const timestamp = Date.now()
      const phoneBase = timestamp % 100000000
      const phone = `136${String(phoneBase).padStart(8, '0')}`
      const noreditAccount = await payload.create({
        collection: 'accounts',
        data: {
          username: `test_no_credit_user_${timestamp}`,
          phone,
          password: 'password123',
          status: 'active',
        },
      })

      const noCreditUser = await payload.create({
        collection: 'users',
        data: {
          account: noreditAccount.id,
          user_type: 'customer',
          role: 'customer',
          status: 'active',
        },
      })

      // 没有授信的用户尝试访问模板时会被拒绝
      await expect(
        payload.find({
          collection: 'shipping-templates',
          overrideAccess: false,
          user: noreditAccount,
        }),
      ).rejects.toThrow('You are not allowed to perform this action.')

      // 清理
      await payload.delete({ collection: 'users', id: noCreditUser.id })
      await payload.delete({ collection: 'accounts', id: noreditAccount.id })
    })

    it('应该拒绝未登录用户查看快递模板', async () => {
      await expect(
        payload.find({
          collection: 'shipping-templates',
          overrideAccess: false,
          // 不提供 user 参数
        }),
      ).rejects.toThrow('You are not allowed to perform this action.')
    })

    it('授信状态为 disabled 时，用户不应该看到该商户的模板', async () => {
      // 禁用授信
      const credits = await payload.find({
        collection: 'user-merchant-credit',
        where: {
          user: {
            equals: customerUser.id,
          },
          merchant: {
            equals: merchant1.id,
          },
        },
      })

      await payload.update({
        collection: 'user-merchant-credit',
        id: credits.docs[0].id,
        data: {
          status: 'disabled',
        },
      })

      // 授信被禁用后，用户尝试访问模板时会被拒绝
      await expect(
        payload.find({
          collection: 'shipping-templates',
          overrideAccess: false,
          user: customerAccount,
        }),
      ).rejects.toThrow('You are not allowed to perform this action.')
    })

    it('用户有多个授信时，应该看到所有对应商户的模板', async () => {
      // 给用户添加对 merchant2 的授信
      await payload.create({
        collection: 'user-merchant-credit',
        data: {
          user: customerUser.id,
          merchant: merchant2.id,
          credit_limit: 5000,
          status: 'active',
        },
      })

      const result = await payload.find({
        collection: 'shipping-templates',
        overrideAccess: false,
        user: customerAccount,
      })

      // 用户现在可以看到两个商户的模板
      expect(result.docs).toHaveLength(2)
      const templateIds = result.docs.map((t) => t.id)
      expect(templateIds).toContain(template1.id)
      expect(templateIds).toContain(template2.id)
    })
  })
})
