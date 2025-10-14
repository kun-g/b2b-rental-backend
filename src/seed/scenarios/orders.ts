/**
 * 订单场景数据
 * 覆盖所有订单状态和业务场景
 */

import type { Payload } from 'payload'
import type { User, Merchant, MerchantSkus, Device } from '@/payload-types'

/**
 * 创建订单相关的所有数据
 */
export async function createOrderScenarios(
  payload: Payload,
  context: {
    users: { alice: User; bob: User; charlie: User }
    merchants: { merchantA: Merchant; merchantB: Merchant }
    skus: { djiMini3: MerchantSkus; tent2Person: MerchantSkus }
    devices: { djiMini3_003: Device; tent2Person_003: Device; sonyA7M4_001: Device }
  },
) {
  const { users, merchants, skus, devices } = context

  console.log('\n📦 创建订单场景...')

  // ===== 1. NEW状态 - 未支付 =====
  const order1 = await payload.create({
    collection: 'orders',
    data: {
      order_no: 'ORD202410120001',
      user: users.alice.id,
      merchant: merchants.merchantA.id,
      merchant_sku: skus.djiMini3.id,
      status: 'NEW',
      rent_start_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3天后
      rent_end_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), // 10天后
      daily_fee_snapshot: 50,
      shipping_fee: 5,
      credit_hold_amount: 5000,
      total_amount: 355, // 50*7 + 5
      shipping_address: {
        province: '广东省',
        city: '深圳市',
        district: '南山区',
        address: '科技园南区',
        region_code: '440305',
        contact_name: 'Alice',
        contact_phone: '13800138001',
      },
    },
  })
  console.log(`   ✓ 订单1: NEW状态 (未支付)`)

  // ===== 2. TO_SHIP状态 - 已支付，待发货 =====
  const order2 = await payload.create({
    collection: 'orders',
    data: {
      order_no: 'ORD202410120002',
      user: users.bob.id,
      merchant: merchants.merchantA.id,
      merchant_sku: skus.djiMini3.id,
      status: 'TO_SHIP',
      rent_start_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      rent_end_date: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString(),
      daily_fee_snapshot: 50,
      shipping_fee: 10,
      credit_hold_amount: 5000,
      total_amount: 360, // 50*7 + 10
      shipping_address: {
        province: '上海市',
        city: '上海市',
        district: '浦东新区',
        address: '陆家嘴金融中心',
        region_code: '310115',
        contact_name: 'Bob',
        contact_phone: '13800138002',
      },
    },
  })

  // 创建支付记录
  await payload.create({
    collection: 'payments',
    data: {
      order: order2.id,
      transaction_no: 'PAY202410120002',
      amount_rent: 350,
      amount_shipping: 10,
      amount_total: 360,
      status: 'paid',
      channel: 'wechat',
      paid_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1小时前支付
    },
  })
  console.log(`   ✓ 订单2: TO_SHIP状态 (已支付)`)

  // ===== 3. TO_SHIP状态 - 改过1次地址 =====
  const order3 = await payload.create({
    collection: 'orders',
    data: {
      order_no: 'ORD202410120003',
      user: users.bob.id,
      merchant: merchants.merchantB.id,
      merchant_sku: skus.tent2Person.id,
      status: 'TO_SHIP',
      rent_start_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      rent_end_date: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
      daily_fee_snapshot: 25,
      shipping_fee: 15, // 改址后的运费
      credit_hold_amount: 1500,
      total_amount: 185, // 25*7 + 15 (原始) + 5 (改址补差)
      shipping_address: {
        province: '广东省',
        city: '广州市',
        district: '天河区',
        address: '珠江新城',
        region_code: '440106',
        contact_name: 'Bob',
        contact_phone: '13800138002',
      },
    },
  })

  await payload.create({
    collection: 'payments',
    data: {
      order: order3.id,
      transaction_no: 'PAY202410120003',
      amount_rent: 175,
      amount_shipping: 10,
      amount_total: 185,
      status: 'paid',
      channel: 'alipay',
      paid_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
  })

  // 创建改址补差记录
  await payload.create({
    collection: 'surcharges',
    data: {
      order: order3.id,
      type: 'addr_up',
      amount: 5,
      status: 'paid',
      description: '改址运费补差：10元 -> 15元',
    },
  })
  console.log(`   ✓ 订单3: TO_SHIP状态 (改址1次)`)

  // ===== 4. TO_SHIP状态 - 改址2次达上限 =====
  const order4 = await payload.create({
    collection: 'orders',
    data: {
      order_no: 'ORD202410120004',
      user: users.alice.id,
      merchant: merchants.merchantA.id,
      merchant_sku: skus.djiMini3.id,
      status: 'TO_SHIP',
      rent_start_date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
      rent_end_date: new Date(Date.now() + 11 * 24 * 60 * 60 * 1000).toISOString(),
      daily_fee_snapshot: 50,
      shipping_fee: 12, // 最终运费
      credit_hold_amount: 5000,
      total_amount: 362, // 50*7 + 12
      shipping_address: {
        province: '北京市',
        city: '北京市',
        district: '朝阳区',
        address: '三里屯SOHO',
        region_code: '110105',
        contact_name: 'Alice',
        contact_phone: '13800138001',
      },
    },
  })

  await payload.create({
    collection: 'payments',
    data: {
      order: order4.id,
      transaction_no: 'PAY202410120004',
      amount_rent: 350,
      amount_shipping: 12,
      amount_total: 362,
      status: 'paid',
      channel: 'wechat',
      paid_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
  })
  console.log(`   ✓ 订单4: TO_SHIP状态 (改址2次,已达上限)`)

  // ===== 5. SHIPPED状态 - 已发货 =====
  const order5 = await payload.create({
    collection: 'orders',
    data: {
      order_no: 'ORD202410120005',
      user: users.bob.id,
      merchant: merchants.merchantA.id,
      merchant_sku: skus.djiMini3.id,
      device: devices.djiMini3_003.id, // 绑定设备
      status: 'SHIPPED',
      rent_start_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
      rent_end_date: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
      actual_start_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 发货次日开始计费
      daily_fee_snapshot: 50,
      shipping_fee: 10,
      credit_hold_amount: 5000,
      total_amount: 360,
      shipping_address: {
        province: '上海市',
        city: '上海市',
        district: '浦东新区',
        address: '陆家嘴金融中心',
        region_code: '310115',
        contact_name: 'Bob',
        contact_phone: '13800138002',
      },
    },
  })

  await payload.create({
    collection: 'payments',
    data: {
      order: order5.id,
      transaction_no: 'PAY202410120005',
      amount_rent: 350,
      amount_shipping: 10,
      amount_total: 360,
      status: 'paid',
      channel: 'wechat',
      paid_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
  })

  // 创建物流记录
  await payload.create({
    collection: 'logistics',
    data: {
      order: order5.id,
      ship_no: 'SF1234567890',
      carrier: '顺丰速运',
      ship_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1天前发货
      tracking_events: [
        {
          time: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          desc: '已发货 - 快递员已揽件',
        },
        {
          time: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
          desc: '运输中 - 快件已到达上海转运中心',
        },
      ],
    },
  })
  console.log(`   ✓ 订单5: SHIPPED状态 (已发货)`)

  // ===== 6. IN_RENT状态 - 租赁中 =====
  const order6 = await payload.create({
    collection: 'orders',
    data: {
      order_no: 'ORD202409100006',
      user: users.bob.id,
      merchant: merchants.merchantB.id,
      merchant_sku: skus.tent2Person.id,
      device: devices.tent2Person_003.id,
      status: 'IN_RENT',
      rent_start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30天前
      rent_end_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), // 10天后
      actual_start_date: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString(),
      daily_fee_snapshot: 25,
      shipping_fee: 20,
      credit_hold_amount: 1500,
      total_amount: 770, // 25*30 + 20
      shipping_address: {
        province: '上海市',
        city: '上海市',
        district: '浦东新区',
        address: '陆家嘴金融中心',
        region_code: '310115',
        contact_name: 'Bob',
        contact_phone: '13800138002',
      },
    },
  })

  await payload.create({
    collection: 'payments',
    data: {
      order: order6.id,
      transaction_no: 'PAY202409100006',
      amount_rent: 750,
      amount_shipping: 20,
      amount_total: 770,
      status: 'paid',
      channel: 'alipay',
      paid_at: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
    },
  })

  await payload.create({
    collection: 'logistics',
    data: {
      order: order6.id,
      ship_no: 'YTO9876543210',
      carrier: '圆通速递',
      ship_at: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000).toISOString(),
      sign_at: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString(), // 已签收
      tracking_events: [],
    },
  })
  console.log(`   ✓ 订单6: IN_RENT状态 (租赁中)`)

  // ===== 7. RETURNING状态 - 归还中 =====
  const order7 = await payload.create({
    collection: 'orders',
    data: {
      order_no: 'ORD202409200007',
      user: users.alice.id,
      merchant: merchants.merchantA.id,
      merchant_sku: skus.djiMini3.id,
      device: devices.djiMini3_003.id, // 注意：这里复用设备，实际场景中不会
      status: 'RETURNING',
      rent_start_date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      rent_end_date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      actual_start_date: new Date(Date.now() - 19 * 24 * 60 * 60 * 1000).toISOString(),
      daily_fee_snapshot: 50,
      shipping_fee: 5,
      credit_hold_amount: 5000,
      total_amount: 705, // 50*14 + 5
      shipping_address: {
        province: '广东省',
        city: '深圳市',
        district: '南山区',
        address: '科技园南区',
        region_code: '440305',
        contact_name: 'Alice',
        contact_phone: '13800138001',
      },
    },
  })

  await payload.create({
    collection: 'payments',
    data: {
      order: order7.id,
      transaction_no: 'PAY202409200007',
      amount_rent: 700,
      amount_shipping: 5,
      amount_total: 705,
      status: 'paid',
      channel: 'wechat',
      paid_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
    },
  })

  await payload.create({
    collection: 'logistics',
    data: {
      order: order7.id,
      ship_no: 'SF1111111111',
      carrier: '顺丰速运',
      ship_at: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000).toISOString(),
      sign_at: new Date(Date.now() - 19 * 24 * 60 * 60 * 1000).toISOString(),
      return_ship_no: 'SF2222222222', // 回寄单号
      tracking_events: [],
    },
  })
  console.log(`   ✓ 订单7: RETURNING状态 (归还中)`)

  // ===== 8. RETURNED状态 - 已归还 =====
  const order8 = await payload.create({
    collection: 'orders',
    data: {
      order_no: 'ORD202409050008',
      user: users.bob.id,
      merchant: merchants.merchantB.id,
      merchant_sku: skus.tent2Person.id,
      device: devices.tent2Person_003.id,
      status: 'RETURNED',
      rent_start_date: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
      rent_end_date: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
      actual_start_date: new Date(Date.now() - 34 * 24 * 60 * 60 * 1000).toISOString(),
      daily_fee_snapshot: 25,
      shipping_fee: 20,
      credit_hold_amount: 1500,
      total_amount: 195, // 25*7 + 20
      shipping_address: {
        province: '上海市',
        city: '上海市',
        district: '浦东新区',
        address: '陆家嘴金融中心',
        region_code: '310115',
        contact_name: 'Bob',
        contact_phone: '13800138002',
      },
    },
  })

  await payload.create({
    collection: 'payments',
    data: {
      order: order8.id,
      transaction_no: 'PAY202409050008',
      amount_rent: 175,
      amount_shipping: 20,
      amount_total: 195,
      status: 'paid',
      channel: 'wechat',
      paid_at: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
    },
  })

  await payload.create({
    collection: 'logistics',
    data: {
      order: order8.id,
      ship_no: 'YTO1111111111',
      carrier: '圆通速递',
      ship_at: new Date(Date.now() - 38 * 24 * 60 * 60 * 1000).toISOString(),
      sign_at: new Date(Date.now() - 34 * 24 * 60 * 60 * 1000).toISOString(),
      return_ship_no: 'YTO2222222222',
      return_sign_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 商户已签收
      tracking_events: [],
    },
  })
  console.log(`   ✓ 订单8: RETURNED状态 (已归还)`)

  // ===== 9. COMPLETED状态 - 已完成（有逾期）=====
  const order9 = await payload.create({
    collection: 'orders',
    data: {
      order_no: 'ORD202408100009',
      user: users.alice.id,
      merchant: merchants.merchantA.id,
      merchant_sku: skus.djiMini3.id,
      device: devices.djiMini3_003.id,
      status: 'COMPLETED',
      rent_start_date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      rent_end_date: new Date(Date.now() - 53 * 24 * 60 * 60 * 1000).toISOString(),
      actual_start_date: new Date(Date.now() - 59 * 24 * 60 * 60 * 1000).toISOString(),
      daily_fee_snapshot: 50,
      shipping_fee: 5,
      credit_hold_amount: 0, // 已释放
      total_amount: 455, // 50*7 + 5 + 100(逾期)
      shipping_address: {
        province: '广东省',
        city: '深圳市',
        district: '南山区',
        address: '科技园南区',
        region_code: '440305',
        contact_name: 'Alice',
        contact_phone: '13800138001',
      },
    },
  })

  await payload.create({
    collection: 'payments',
    data: {
      order: order9.id,
      transaction_no: 'PAY202408100009',
      amount_rent: 350,
      amount_shipping: 5,
      amount_total: 455,
      status: 'paid',
      channel: 'wechat',
      paid_at: new Date(Date.now() - 65 * 24 * 60 * 60 * 1000).toISOString(),
    },
  })

  // 逾期费
  await payload.create({
    collection: 'surcharges',
    data: {
      order: order9.id,
      type: 'overdue',
      amount: 100, // 逾期2天
      status: 'paid',
      description: '逾期2天: 50元/天 × 2天',
    },
  })

  await payload.create({
    collection: 'logistics',
    data: {
      order: order9.id,
      ship_no: 'SF9999999999',
      carrier: '顺丰速运',
      ship_at: new Date(Date.now() - 63 * 24 * 60 * 60 * 1000).toISOString(),
      sign_at: new Date(Date.now() - 59 * 24 * 60 * 60 * 1000).toISOString(),
      return_ship_no: 'SF8888888888',
      return_sign_at: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString(),
      tracking_events: [],
    },
  })

  // 对账单
  await payload.create({
    collection: 'statements',
    data: {
      statement_no: 'STMT202408100009',
      order: order9.id,
      issued_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
      amount_rent: 350,
      amount_shipping: 5,
      amount_overdue: 100,
      amount_surcharge: 0,
      amount_total: 455,
      status: 'confirmed',
      details_json: {
        device_sn: 'DJI-MINI3-003',
        ship_at: new Date(Date.now() - 63 * 24 * 60 * 60 * 1000).toISOString(),
        sign_at: new Date(Date.now() - 59 * 24 * 60 * 60 * 1000).toISOString(),
        return_sign_at: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString(),
      },
    },
  })
  console.log(`   ✓ 订单9: COMPLETED状态 (已完成,有逾期)`)

  // ===== 10. CANCELED状态 - 已取消 =====
  const order10 = await payload.create({
    collection: 'orders',
    data: {
      order_no: 'ORD202410050010',
      user: users.bob.id,
      merchant: merchants.merchantB.id,
      merchant_sku: skus.tent2Person.id,
      status: 'CANCELED',
      rent_start_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      rent_end_date: new Date(Date.now() + 22 * 24 * 60 * 60 * 1000).toISOString(),
      daily_fee_snapshot: 25,
      shipping_fee: 20,
      credit_hold_amount: 0, // 已释放
      total_amount: 0, // 已退款
      shipping_address: {
        province: '上海市',
        city: '上海市',
        district: '浦东新区',
        address: '陆家嘴金融中心',
        region_code: '310115',
        contact_name: 'Bob',
        contact_phone: '13800138002',
      },
    },
  })

  await payload.create({
    collection: 'payments',
    data: {
      order: order10.id,
      transaction_no: 'PAY202410050010',
      amount_rent: 175,
      amount_shipping: 20,
      amount_total: 0, // 已退款
      status: 'refunded',
      channel: 'alipay',
      paid_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      refund_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
  })
  console.log(`   ✓ 订单10: CANCELED状态 (已取消)`)

  console.log(`\n   创建了 10 个订单，覆盖所有状态`)

  return {
    order1,
    order2,
    order3,
    order4,
    order5,
    order6,
    order7,
    order8,
    order9,
    order10,
  }
}
