import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getPayload } from 'payload'
import config from '../payload.config'

describe('Orders Collection - 订单创建与授信冻结', () => {
  let payload: any
  let testMerchant: any
  let testAccount: any
  let testUser: any
  let testCredit: any
  let testCategory: any
  let testSKU: any
  let testShippingTemplate: any
  let testReturnInfo: any

  beforeAll(async () => {
    payload = await getPayload({ config })

    // 1. 创建测试商户
    testMerchant = await payload.create({
      collection: 'merchants',
      data: {
        name: '测试商户-订单',
        status: 'approved',
        contact: {
          name: '测试联系人',
          phone: '13800138000',
        },
      },
    })

    // 2. 创建类目
    testCategory = await payload.create({
      collection: 'categories',
      data: {
        name: '测试类目',
        description: '用于测试订单',
        status: 'active',
      },
    })

    // 3. 创建运费模板
    testShippingTemplate = await payload.create({
      collection: 'shipping-templates',
      data: {
        merchant: testMerchant.id,
        name: '测试运费模板',
        status: 'active',
        is_default: true,
        default_fee: 15,
        free_shipping_threshold: 1000,
        blacklist_regions: [],
      },
    })

    // 4. 创建归还信息
    testReturnInfo = await payload.create({
      collection: 'return-info',
      data: {
        merchant: testMerchant.id,
        is_default: true,
        status: 'active',
        return_contact_name: '测试归还联系人',
        return_contact_phone: '13900139000',
        return_address: {
          province: '北京市',
          city: '北京市',
          district: '朝阳区',
          address: '测试归还地址',
        },
      },
    })

    // 5. 创建 SKU
    testSKU = await payload.create({
      collection: 'merchant-skus',
      data: {
        merchant: testMerchant.id,
        category: testCategory.id,
        name: '测试设备',
        description: '用于测试订单',
        daily_fee: 100,
        device_value: 5000,
        shipping_template: testShippingTemplate.id,
        status: 'active',
        rental_status: 'available',
      },
    })

    // 6. 创建测试账号
    testAccount = await payload.create({
      collection: 'accounts',
      data: {
        username: `test-order-user-${Date.now()}`,
        phone: '13800138888',
        password: 'Test123!',
        status: 'active',
      },
    })

    // 7. 创建测试用户（关联到账号）
    testUser = await payload.create({
      collection: 'users',
      data: {
        account: testAccount.id,
        user_type: 'customer',
        role: 'customer',
        status: 'active',
      },
    })

    // 8. 创建测试授信
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
    // 清理测试数据（先删除依赖关系，再删除主表）
    // 1. 先删除所有订单
    const orders = await payload.find({
      collection: 'orders',
      where: {
        customer: {
          equals: testUser?.id,
        },
      },
    })

    for (const order of orders.docs) {
      await payload.delete({
        collection: 'orders',
        id: order.id,
      })
    }

    // 2. 删除授信
    if (testCredit) {
      await payload.delete({
        collection: 'user-merchant-credit',
        id: testCredit.id,
      })
    }

    // 3. 删除用户和账号
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

    // 4. 删除 SKU 和商户相关
    if (testSKU) {
      await payload.delete({
        collection: 'merchant-skus',
        id: testSKU.id,
      })
    }
    if (testReturnInfo) {
      await payload.delete({
        collection: 'return-info',
        id: testReturnInfo.id,
      })
    }
    if (testShippingTemplate) {
      await payload.delete({
        collection: 'shipping-templates',
        id: testShippingTemplate.id,
      })
    }
    if (testCategory) {
      await payload.delete({
        collection: 'categories',
        id: testCategory.id,
      })
    }
    if (testMerchant) {
      await payload.delete({
        collection: 'merchants',
        id: testMerchant.id,
      })
    }
  })

  it('创建订单时应该冻结授信额度', async () => {
    // 查询授信初始状态
    const creditBefore = await payload.findByID({
      collection: 'user-merchant-credit',
      id: testCredit.id,
    })

    expect(creditBefore.used_credit).toBe(0)
    expect(creditBefore.available_credit).toBe(10000)

    // 创建订单（需要模拟登录用户）
    const order = await payload.create({
      collection: 'orders',
      data: {
        customer: testUser.id,
        merchant_sku: testSKU.id,
        rent_start_date: '2025-10-23',
        rent_end_date: '2025-10-30',
        shipping_address: {
          contact_name: '张三',
          contact_phone: '13800138000',
          province: '广东省',
          city: '深圳市',
          district: '南山区',
          address: '科技园南路15号',
        },
      },
      user: testAccount, // 模拟登录用户
    })

    // 验证订单创建成功
    expect(order).toBeDefined()
    expect(order.status).toBe('NEW')
    expect(order.credit_hold_amount).toBe(5000) // device_value_snapshot

    // 查询授信更新后的状态
    const creditAfter = await payload.findByID({
      collection: 'user-merchant-credit',
      id: testCredit.id,
    })

    // 验证授信额度已冻结
    expect(creditAfter.used_credit).toBe(5000)
    expect(creditAfter.available_credit).toBe(5000) // 10000 - 5000
  })

  it('订单完成时应该释放授信额度', async () => {
    // 创建订单
    const order = await payload.create({
      collection: 'orders',
      data: {
        customer: testUser.id,
        merchant_sku: testSKU.id,
        rent_start_date: '2025-10-23',
        rent_end_date: '2025-10-30',
        shipping_address: {
          contact_name: '李四',
          contact_phone: '13900139000',
          province: '北京市',
          city: '北京市',
          district: '朝阳区',
          address: '望京SOHO',
        },
      },
      user: testAccount,
    })

    // 查询授信状态（应该已冻结）
    const creditBeforeComplete = await payload.findByID({
      collection: 'user-merchant-credit',
      id: testCredit.id,
    })

    const usedCreditBefore = creditBeforeComplete.used_credit

    // 更新订单状态为 COMPLETED
    await payload.update({
      collection: 'orders',
      id: order.id,
      data: {
        status: 'COMPLETED',
      },
    })

    // 查询授信状态（应该已释放）
    const creditAfterComplete = await payload.findByID({
      collection: 'user-merchant-credit',
      id: testCredit.id,
    })

    // 验证授信额度已释放
    expect(creditAfterComplete.used_credit).toBe(usedCreditBefore - 5000)
    expect(creditAfterComplete.available_credit).toBe(
      creditBeforeComplete.available_credit + 5000
    )

    // 清理订单
    await payload.delete({
      collection: 'orders',
      id: order.id,
    })
  })

  it('订单取消时应该释放授信额度', async () => {
    // 创建订单
    const order = await payload.create({
      collection: 'orders',
      data: {
        customer: testUser.id,
        merchant_sku: testSKU.id,
        rent_start_date: '2025-10-23',
        rent_end_date: '2025-10-30',
        shipping_address: {
          contact_name: '王五',
          contact_phone: '13700137000',
          province: '上海市',
          city: '上海市',
          district: '浦东新区',
          address: '陆家嘴金融中心',
        },
      },
      user: testAccount,
    })

    // 查询授信状态（应该已冻结）
    const creditBeforeCancel = await payload.findByID({
      collection: 'user-merchant-credit',
      id: testCredit.id,
    })

    const usedCreditBefore = creditBeforeCancel.used_credit

    // 更新订单状态为 CANCELED
    await payload.update({
      collection: 'orders',
      id: order.id,
      data: {
        status: 'CANCELED',
      },
    })

    // 查询授信状态（应该已释放）
    const creditAfterCancel = await payload.findByID({
      collection: 'user-merchant-credit',
      id: testCredit.id,
    })

    // 验证授信额度已释放
    expect(creditAfterCancel.used_credit).toBe(usedCreditBefore - 5000)
    expect(creditAfterCancel.available_credit).toBe(
      creditBeforeCancel.available_credit + 5000
    )

    // 清理订单
    await payload.delete({
      collection: 'orders',
      id: order.id,
    })
  })

  it('授信额度不足时应该无法创建订单', async () => {
    // 先耗尽大部分授信额度
    await payload.update({
      collection: 'user-merchant-credit',
      id: testCredit.id,
      data: {
        used_credit: 9500, // 只剩 500 可用
        available_credit: 500,
      },
    })

    // 尝试创建订单（需要 5000 授信）
    await expect(
      payload.create({
        collection: 'orders',
        data: {
          customer: testUser.id,
          merchant_sku: testSKU.id,
          rent_start_date: '2025-10-23',
          rent_end_date: '2025-10-30',
          shipping_address: {
            contact_name: '赵六',
            contact_phone: '13600136000',
            province: '浙江省',
            city: '杭州市',
            district: '西湖区',
            address: '文三路',
          },
        },
        user: testAccount,
      })
    ).rejects.toThrow('授信额度不足')

    // 恢复授信额度
    await payload.update({
      collection: 'user-merchant-credit',
      id: testCredit.id,
      data: {
        used_credit: 0,
        available_credit: 10000,
      },
    })
  })

  it('应该自动填充地区编码（region_code）', async () => {
    const order = await payload.create({
      collection: 'orders',
      data: {
        customer: testUser.id,
        merchant_sku: testSKU.id,
        rent_start_date: '2025-11-01',
        rent_end_date: '2025-11-07',
        shipping_address: {
          contact_name: '测试用户',
          contact_phone: '13800138000',
          province: '广东省',
          city: '深圳市',
          district: '南山区',
          address: '科技园南路15号',
        },
      },
      user: testAccount,
    })

    // 验证 region_code 是6位数字编码
    expect(order.shipping_address.region_code).toMatch(/^\d{6}$/)
    // 深圳市南山区的编码是 440305
    expect(order.shipping_address.region_code).toBe('440305')

    // 清理
    await payload.delete({ collection: 'orders', id: order.id })
  })

  it('应该拦截禁运区的订单', async () => {
    // 更新运费模板，添加内蒙古为禁运区
    await payload.update({
      collection: 'shipping-templates',
      id: testShippingTemplate.id,
      data: {
        blacklist_regions: [
          {
            region_code_path: '150000',
            region_name: '内蒙古自治区',
            reason: '测试禁运区',
          },
        ],
      },
    })

    // 尝试创建内蒙古的订单，应该被拦截
    await expect(
      payload.create({
        collection: 'orders',
        data: {
          customer: testUser.id,
          merchant_sku: testSKU.id,
          rent_start_date: '2025-11-01',
          rent_end_date: '2025-11-07',
          shipping_address: {
            contact_name: '测试用户',
            contact_phone: '13800138000',
            province: '内蒙古自治区',
            city: '乌海市',
            district: '海南区',
            address: '光明小区',
          },
        },
        user: testAccount,
      })
    ).rejects.toThrow('该地址不在配送范围内')

    // 恢复运费模板
    await payload.update({
      collection: 'shipping-templates',
      id: testShippingTemplate.id,
      data: {
        blacklist_regions: [],
      },
    })
  })

  it('应该在省份无法识别时抛出错误', async () => {
    await expect(
      payload.create({
        collection: 'orders',
        data: {
          customer: testUser.id,
          merchant_sku: testSKU.id,
          rent_start_date: '2025-11-01',
          rent_end_date: '2025-11-07',
          shipping_address: {
            contact_name: '测试用户',
            contact_phone: '13800138000',
            province: '不存在的省份',
            city: '不存在的城市',
            district: '不存在的区',
            address: '测试地址',
          },
        },
        user: testAccount,
      })
    ).rejects.toThrow('无法识别省份')
  })
})
