/**
 * 为 alice 创建 3 个测试订单
 * 1. 逾期订单 - 租期已过但未归还
 * 2. 退运费订单 - 实际运费低于预付运费
 * 3. 补运费订单 - 实际运费高于预付运费
 */

import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../src/payload.config'

async function createTestOrders() {
  console.log('🚀 开始创建 alice 的测试订单...\n')

  const payload = await getPayload({ config })

  try {
    // 1. 查找 alice 账号和用户
    const aliceAccount = await payload.find({
      collection: 'accounts',
      where: { username: { equals: 'alice' } },
      limit: 1,
    })

    if (aliceAccount.docs.length === 0) {
      throw new Error('找不到 alice 账号')
    }

    const aliceUsers = await payload.find({
      collection: 'users',
      where: {
        account: { equals: aliceAccount.docs[0].id },
        role: { equals: 'customer' },
      },
      limit: 1,
    })

    if (aliceUsers.docs.length === 0) {
      throw new Error('找不到 alice 的 customer 用户')
    }

    const alice = aliceUsers.docs[0]
    console.log(`✓ 找到用户: alice (ID: ${alice.id}, type: ${typeof alice.id})`)
    
    // 确保 ID 是数字
    const aliceId = Number(alice.id)
    if (isNaN(aliceId)) {
      throw new Error(`alice.id 无法转换为数字: ${alice.id}`)
    }
    console.log(`✓ 转换后的 ID: ${aliceId}`)

    // 2. 查找商户A和SKU
    const merchantA = await payload.find({
      collection: 'merchants',
      where: { name: { equals: '极客科技租赁' } },
      limit: 1,
    })

    if (merchantA.docs.length === 0) {
      throw new Error('找不到商户A')
    }

    const merchant = merchantA.docs[0]
    console.log(`✓ 找到商户: ${merchant.name} (ID: ${merchant.id})`)

    // 查找 SKU
    const skus = await payload.find({
      collection: 'merchant-skus',
      where: {
        merchant: { equals: merchant.id },
        listing_status: { equals: 'approved' },
        is_listed: { equals: true },
      },
      limit: 3,
    })

    if (skus.docs.length === 0) {
      throw new Error('商户A没有上架的SKU')
    }

    console.log(`✓ 找到 ${skus.docs.length} 个SKU\n`)
    
    // 如果SKU不足3个，重复使用第一个
    const sku1 = skus.docs[0]
    const sku2 = skus.docs[1] || skus.docs[0]
    const sku3 = skus.docs[2] || skus.docs[0]

    // 3. 创建订单1：逾期订单
    console.log('📦 创建订单1: 逾期订单...')
    const now = new Date()
    const overdueStartDate = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000) // 20天前开始
    const overdueEndDate = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000) // 5天前应该归还

    const order1 = await payload.create({
      collection: 'orders',
      data: {
        order_number: `TEST-OVERDUE-${Date.now()}`,
        user: aliceId,
        merchant: merchant.id,
        merchant_sku: sku1.id,
        status: 'IN_RENT',
        rental_days: 15,
        daily_rent: sku1.daily_rent,
        deposit: sku1.deposit,
        start_date: overdueStartDate.toISOString(),
        end_date: overdueEndDate.toISOString(),
        shipping_address: {
          province: '广东省',
          city: '深圳市',
          district: '南山区',
          address: '科技园南区深圳湾科技生态园10栋A座',
          postal_code: '518000',
          region_code_path: '440000/440300/440305',
          contact_name: 'Alice',
          contact_phone: '13800138001',
        },
        prepaid_shipping_fee: 15,
        actual_shipping_fee: 15,
        actual_return_shipping_fee: 0,
        total_amount: sku1.daily_rent * 15 + sku1.deposit + 15,
        payment_status: 'PAID',
        shipped_at: overdueStartDate.toISOString(),
        received_at: new Date(overdueStartDate.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
    })
    console.log(`   ✓ 订单1创建成功: ${order1.order_number}`)
    console.log(`   - 租期: ${overdueStartDate.toLocaleDateString()} ~ ${overdueEndDate.toLocaleDateString()}`)
    console.log(`   - 状态: 租赁中（已逾期 5 天）\n`)

    // 4. 创建订单2：退运费订单（实际运费低于预付）
    console.log('📦 创建订单2: 退运费订单...')
    const order2StartDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000) // 10天前开始
    const order2EndDate = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000) // 5天后归还

    const order2 = await payload.create({
      collection: 'orders',
      data: {
        order_number: `TEST-REFUND-${Date.now()}`,
        user: aliceId,
        merchant: merchant.id,
        merchant_sku: sku2.id,
        status: 'IN_RENT',
        rental_days: 15,
        daily_rent: sku2.daily_rent,
        deposit: sku2.deposit,
        start_date: order2StartDate.toISOString(),
        end_date: order2EndDate.toISOString(),
        shipping_address: {
          province: '广东省',
          city: '深圳市',
          district: '福田区',
          address: '福田中心区益田路6001号',
          postal_code: '518000',
          region_code_path: '440000/440300/440304',
          contact_name: 'Alice',
          contact_phone: '13800138001',
        },
        prepaid_shipping_fee: 20, // 预付20元
        actual_shipping_fee: 20,
        actual_return_shipping_fee: 0, // 实际只需12元，应退8元
        total_amount: sku2.daily_rent * 15 + sku2.deposit + 20,
        payment_status: 'PAID',
        shipped_at: order2StartDate.toISOString(),
        received_at: new Date(order2StartDate.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        notes: '测试退运费：预付20元，实际应该只需12元',
      },
    })
    console.log(`   ✓ 订单2创建成功: ${order2.order_number}`)
    console.log(`   - 租期: ${order2StartDate.toLocaleDateString()} ~ ${order2EndDate.toLocaleDateString()}`)
    console.log(`   - 预付运费: 20元（实际应该只需12元，需退8元）\n`)

    // 5. 创建订单3：补运费订单（实际运费高于预付）
    console.log('📦 创建订单3: 补运费订单...')
    const order3StartDate = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000) // 8天前开始
    const order3EndDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7天后归还

    const order3 = await payload.create({
      collection: 'orders',
      data: {
        order_number: `TEST-EXTRA-${Date.now()}`,
        user: aliceId,
        merchant: merchant.id,
        merchant_sku: sku3.id,
        status: 'IN_RENT',
        rental_days: 15,
        daily_rent: sku3.daily_rent,
        deposit: sku3.deposit,
        start_date: order3StartDate.toISOString(),
        end_date: order3EndDate.toISOString(),
        shipping_address: {
          province: '新疆维吾尔自治区',
          city: '乌鲁木齐市',
          district: '天山区',
          address: '解放南路1号',
          postal_code: '830000',
          region_code_path: '650000/650100/650102',
          contact_name: 'Alice',
          contact_phone: '13800138001',
        },
        prepaid_shipping_fee: 15, // 预付15元
        actual_shipping_fee: 15,
        actual_return_shipping_fee: 0, // 实际需要30元，需补15元
        total_amount: sku3.daily_rent * 15 + sku3.deposit + 15,
        payment_status: 'PAID',
        shipped_at: order3StartDate.toISOString(),
        received_at: new Date(order3StartDate.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        notes: '测试补运费：预付15元，实际需要30元（偏远地区），需补15元',
      },
    })
    console.log(`   ✓ 订单3创建成功: ${order3.order_number}`)
    console.log(`   - 租期: ${order3StartDate.toLocaleDateString()} ~ ${order3EndDate.toLocaleDateString()}`)
    console.log(`   - 预付运费: 15元（实际需要30元，需补15元）\n`)

    console.log('✅ 所有测试订单创建完成！\n')
    console.log('📊 订单汇总:')
    console.log(`   1. ${order1.order_number} - 逾期订单（已逾期5天）`)
    console.log(`   2. ${order2.order_number} - 退运费订单（应退8元）`)
    console.log(`   3. ${order3.order_number} - 补运费订单（需补15元）`)
    console.log('\n💡 测试说明:')
    console.log('   - 订单1: 完成订单时会计算逾期费用')
    console.log('   - 订单2: 归还时商户填写实际运费12元，系统自动退8元')
    console.log('   - 订单3: 归还时商户填写实际运费30元，系统提示需补15元')

  } catch (error) {
    console.error('\n❌ 创建失败:', error)
    throw error
  }
}

createTestOrders()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
