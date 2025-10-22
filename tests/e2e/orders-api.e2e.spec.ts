import { test, expect } from '@playwright/test'

/**
 * 订单 API E2E 测试
 * 测试通过 HTTP API 创建订单，验证授信冻结功能
 */
test.describe('Orders API - 订单创建与授信', () => {
  const baseURL = 'http://localhost:3000'
  let authToken: string
  let userId: string
  let merchantId: string
  let skuId: string
  let creditId: string

  test.beforeAll(async ({ request }) => {
    // 1. 登录获取 token（使用 seed 数据中的用户）
    const loginRes = await request.post(`${baseURL}/api/accounts/login`, {
      data: {
        username: 'user1',
        password: 'user123456',
      },
    })

    if (!loginRes.ok()) {
      const errorText = await loginRes.text()
      console.error('登录失败:', loginRes.status(), errorText)
      throw new Error(`登录失败: ${loginRes.status()} - ${errorText}`)
    }

    const loginData = await loginRes.json()
    authToken = loginData.token
    expect(authToken).toBeTruthy()

    // 2. 获取当前用户信息
    const meRes = await request.get(`${baseURL}/api/accounts/me`, {
      headers: {
        Authorization: `JWT ${authToken}`,
      },
    })

    expect(meRes.ok()).toBeTruthy()
    const meData = await meRes.json()
    expect(meData.user).toBeTruthy()

    // 从关联的 users 中找到 customer 角色的用户
    const customerUser = meData.user.users?.find((u: any) => u.role === 'customer')
    expect(customerUser).toBeTruthy()
    userId = customerUser.id

    // 3. 获取用户的授信信息（找到一个有授信的商户）
    const creditsRes = await request.get(
      `${baseURL}/api/user-merchant-credit?where[user][equals]=${userId}&limit=1`,
      {
        headers: {
          Authorization: `JWT ${authToken}`,
        },
      }
    )

    expect(creditsRes.ok()).toBeTruthy()
    const creditsData = await creditsRes.json()
    expect(creditsData.docs.length).toBeGreaterThan(0)

    const credit = creditsData.docs[0]
    creditId = credit.id
    merchantId = typeof credit.merchant === 'object' ? credit.merchant.id : credit.merchant

    // 4. 获取该商户的一个可用 SKU
    const skusRes = await request.get(
      `${baseURL}/api/merchant-skus?where[merchant][equals]=${merchantId}&where[status][equals]=active&limit=1`,
      {
        headers: {
          Authorization: `JWT ${authToken}`,
        },
      }
    )

    expect(skusRes.ok()).toBeTruthy()
    const skusData = await skusRes.json()
    expect(skusData.docs.length).toBeGreaterThan(0)
    skuId = skusData.docs[0].id
  })

  test('应该能够通过 POST /api/orders 创建订单', async ({ request }) => {
    // 1. 查询创建订单前的授信状态
    const creditBeforeRes = await request.get(`${baseURL}/api/user-merchant-credit/${creditId}`, {
      headers: {
        Authorization: `JWT ${authToken}`,
      },
    })

    expect(creditBeforeRes.ok()).toBeTruthy()
    const creditBefore = await creditBeforeRes.json()
    const usedCreditBefore = creditBefore.used_credit || 0
    const availableCreditBefore = creditBefore.available_credit || creditBefore.credit_limit

    console.log('创建订单前授信状态:', {
      used_credit: usedCreditBefore,
      available_credit: availableCreditBefore,
    })

    // 2. 创建订单
    const createOrderRes = await request.post(`${baseURL}/api/orders`, {
      headers: {
        Authorization: `JWT ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        merchant_sku: skuId,
        rent_start_date: '2025-10-23',
        rent_end_date: '2025-10-30',
        shipping_address: {
          contact_name: 'E2E测试用户',
          contact_phone: '13800138000',
          province: '广东省',
          city: '深圳市',
          district: '南山区',
          address: '科技园南路15号',
        },
      },
    })

    expect(createOrderRes.ok()).toBeTruthy()
    const orderData = await createOrderRes.json()
    console.log('创建的订单:', {
      id: orderData.doc.id,
      order_no: orderData.doc.order_no,
      status: orderData.doc.status,
      credit_hold_amount: orderData.doc.credit_hold_amount,
    })

    // 3. 验证订单创建成功
    expect(orderData.doc).toBeTruthy()
    expect(orderData.doc.order_no).toBeTruthy()
    expect(orderData.doc.status).toBe('NEW')
    expect(orderData.doc.credit_hold_amount).toBeGreaterThan(0)

    const holdAmount = orderData.doc.credit_hold_amount

    // 4. 查询创建订单后的授信状态
    const creditAfterRes = await request.get(`${baseURL}/api/user-merchant-credit/${creditId}`, {
      headers: {
        Authorization: `JWT ${authToken}`,
      },
    })

    expect(creditAfterRes.ok()).toBeTruthy()
    const creditAfter = await creditAfterRes.json()

    console.log('创建订单后授信状态:', {
      used_credit: creditAfter.used_credit,
      available_credit: creditAfter.available_credit,
    })

    // 5. 验证授信额度已冻结
    expect(creditAfter.used_credit).toBe(usedCreditBefore + holdAmount)
    expect(creditAfter.available_credit).toBe(availableCreditBefore - holdAmount)

    // 6. 清理：删除创建的订单（需要平台管理员权限，这里跳过）
    // 注：在实际测试中，可以用平台管理员账号登录后删除
  })

  test('授信额度不足时应该无法创建订单', async ({ request }) => {
    // 1. 查询当前授信状态
    const creditRes = await request.get(`${baseURL}/api/user-merchant-credit/${creditId}`, {
      headers: {
        Authorization: `JWT ${authToken}`,
      },
    })

    const credit = await creditRes.json()
    const availableCredit = credit.available_credit || 0
    console.log('当前可用授信额度:', availableCredit)

    // 2. 如果可用额度充足，先通过创建订单耗尽额度
    let exhaustOrderIds: string[] = []
    let remainingCredit = availableCredit

    // 假设每个订单需要约 5000 元授信（device_value）
    // 创建足够多的订单直到额度不足
    while (remainingCredit >= 5000) {
      const exhaustOrderRes = await request.post(`${baseURL}/api/orders`, {
        headers: {
          Authorization: `JWT ${authToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          merchant_sku: skuId,
          rent_start_date: '2025-10-25',
          rent_end_date: '2025-11-01',
          shipping_address: {
            contact_name: 'E2E测试用户',
            contact_phone: '13800138000',
            province: '广东省',
            city: '深圳市',
            district: '南山区',
            address: `科技园南路${exhaustOrderIds.length + 1}号`,
          },
        },
      })

      if (exhaustOrderRes.ok()) {
        const exhaustOrder = await exhaustOrderRes.json()
        exhaustOrderIds.push(exhaustOrder.doc.id)
        remainingCredit -= exhaustOrder.doc.credit_hold_amount || 5000
        console.log(`创建耗尽订单 ${exhaustOrderIds.length}，剩余额度:`, remainingCredit)
      } else {
        // 如果创建失败，可能是其他原因，停止循环
        break
      }

      // 安全限制：最多创建 5 个订单
      if (exhaustOrderIds.length >= 5) {
        console.log('已创建 5 个订单，停止耗尽额度')
        break
      }
    }

    console.log(`共创建 ${exhaustOrderIds.length} 个订单耗尽额度`)

    // 3. 尝试创建订单（此时应该失败）
    const createOrderRes = await request.post(`${baseURL}/api/orders`, {
      headers: {
        Authorization: `JWT ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        merchant_sku: skuId,
        rent_start_date: '2025-10-25',
        rent_end_date: '2025-11-01',
        shipping_address: {
          contact_name: 'E2E测试用户',
          contact_phone: '13800138000',
          province: '北京市',
          city: '北京市',
          district: '朝阳区',
          address: '望京SOHO',
        },
      },
    })

    // 4. 验证返回错误
    expect(createOrderRes.ok()).toBeFalsy()
    expect(createOrderRes.status()).toBe(400)

    const errorData = await createOrderRes.json()
    console.log('授信不足错误:', errorData)
    expect(errorData.errors).toBeTruthy()

    // 验证错误消息包含"授信额度不足"
    const errorMessage = errorData.message || errorData.errors?.[0]?.message || ''
    expect(errorMessage).toContain('授信额度不足')

    // 5. 清理：取消创建的订单以释放授信
    console.log(`开始清理 ${exhaustOrderIds.length} 个耗尽额度的订单`)
    for (const orderId of exhaustOrderIds) {
      try {
        await request.patch(`${baseURL}/api/orders/${orderId}`, {
          headers: {
            Authorization: `JWT ${authToken}`,
            'Content-Type': 'application/json',
          },
          data: {
            status: 'CANCELED',
          },
        })
        console.log(`已取消订单 ${orderId}`)
      } catch (error) {
        console.error(`取消订单 ${orderId} 失败:`, error)
      }
    }
  })

  test('应该能够查询自己的订单列表', async ({ request }) => {
    const ordersRes = await request.get(`${baseURL}/api/orders?limit=10&depth=2`, {
      headers: {
        Authorization: `JWT ${authToken}`,
      },
    })

    expect(ordersRes.ok()).toBeTruthy()
    const ordersData = await ordersRes.json()

    console.log('订单列表:', {
      totalDocs: ordersData.totalDocs,
      page: ordersData.page,
      limit: ordersData.limit,
    })

    // 验证返回的订单都是当前用户的
    expect(ordersData.docs).toBeTruthy()
    expect(Array.isArray(ordersData.docs)).toBeTruthy()

    // 如果有订单，验证都是当前用户的
    if (ordersData.docs.length > 0) {
      for (const order of ordersData.docs) {
        const customerId = typeof order.customer === 'object' ? order.customer.id : order.customer
        expect(String(customerId)).toBe(String(userId))
      }
    }
  })
})
