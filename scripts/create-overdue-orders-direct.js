/**
 * 直接在数据库中创建逾期和运费补差的测试订单
 * 绕过授信额度限制
 */

import payload from 'payload';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  console.log('🚀 开始创建测试订单...\n');

  // 动态导入配置
  const configPromise = import('../src/payload.config.ts');
  const config = (await configPromise).default;

  // 初始化 Payload
  await payload.init({
    config,
    secret: process.env.PAYLOAD_SECRET || 'your-secret-key',
    local: true,
  });

  try {
    // 获取 alice 用户
    const users = await payload.find({
      collection: 'users',
      where: {
        user_type: { equals: 'customer' },
      },
      limit: 1,
    });

    if (users.docs.length === 0) {
      throw new Error('找不到客户用户');
    }

    const customer = users.docs[0];
    console.log(`✅ 找到用户: ${customer.id}`);

    // 获取第一个SKU
    const skus = await payload.find({
      collection: 'merchant-skus',
      limit: 1,
    });

    if (skus.docs.length === 0) {
      throw new Error('找不到SKU');
    }

    const sku = skus.docs[0];
    const merchant = typeof sku.merchant === 'object' ? sku.merchant.id : sku.merchant;
    console.log(`✅ 找到SKU: ${sku.name} (商户: ${merchant})\n`);

    // ========================================
    // 订单1：逾期订单
    // ========================================
    console.log('📦 创建订单1：逾期订单');
    console.log('─'.repeat(50));

    const now = new Date();
    const order1Data = {
      order_no: `ORD-OVERDUE-${Date.now()}`,
      customer: customer.id,
      merchant: merchant,
      merchant_sku: sku.id,
      status: 'IN_RENT',
      rent_start_date: '2025-11-01',
      rent_end_date: '2025-11-04',
      rent_days: 3,
      daily_fee_snapshot: sku.daily_fee || 100,
      device_value_snapshot: sku.device_value || 5000,
      shipping_fee_snapshot: 10,
      credit_hold_amount: 0, // 不冻结授信
      shipping_address: {
        contact_name: '测试用户',
        contact_phone: '13800138000',
        province: '广东省',
        city: '深圳市',
        district: '南山区',
        address: '科技园南路15号',
        region_code: '440305',
      },
      return_address: {
        contact_name: '商户',
        contact_phone: '13900139000',
        province: '广东省',
        city: '深圳市',
        district: '福田区',
        address: '华强北路100号',
      },
      device_sn: 'TEST-OVERDUE-' + Date.now(),
      shipping_date: '2025-11-01T00:00:00.000Z',
      actual_start_date: '2025-11-02T00:00:00.000Z', // 发货次日开始计费
      order_total_amount: (sku.daily_fee || 100) * 3 + 10,
      is_overdue: false, // 先设为false，后面会自动计算
      overdue_days: 0,
      overdue_amount: 0,
      status_history: [
        {
          status: 'NEW',
          changed_at: '2025-11-01T00:00:00.000Z',
        },
        {
          status: 'PAID',
          changed_at: '2025-11-01T01:00:00.000Z',
        },
        {
          status: 'TO_SHIP',
          changed_at: '2025-11-01T02:00:00.000Z',
        },
        {
          status: 'SHIPPED',
          changed_at: '2025-11-01T10:00:00.000Z',
        },
        {
          status: 'IN_RENT',
          changed_at: '2025-11-01T12:00:00.000Z',
        },
      ],
    };

    const order1 = await payload.create({
      collection: 'orders',
      data: order1Data,
    });

    console.log(`✅ 订单创建成功: ${order1.order_no}`);
    console.log(`   租期: 2025-11-01 至 2025-11-04 (已逾期15天)`);
    console.log(`   状态: IN_RENT\n`);

    // ========================================
    // 订单2：运费补差订单（修改2次地址）
    // ========================================
    console.log('📦 创建订单2：运费补差订单');
    console.log('─'.repeat(50));

    const order2Data = {
      order_no: `ORD-SHIPPING-${Date.now()}`,
      customer: customer.id,
      merchant: merchant,
      merchant_sku: sku.id,
      status: 'IN_RENT',
      rent_start_date: now.toISOString().split('T')[0],
      rent_end_date: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      rent_days: 30,
      daily_fee_snapshot: sku.daily_fee || 100,
      device_value_snapshot: sku.device_value || 5000,
      shipping_fee_snapshot: 10,
      shipping_fee_adjustment: 15, // 运费补差：+15元
      credit_hold_amount: 0,
      shipping_address: {
        contact_name: '测试用户3',
        contact_phone: '13800138888',
        province: '浙江省',
        city: '杭州市',
        district: '西湖区',
        address: '文三路200号',
        region_code: '330106',
      },
      return_address: {
        contact_name: '商户',
        contact_phone: '13900139000',
        province: '广东省',
        city: '深圳市',
        district: '福田区',
        address: '华强北路100号',
      },
      device_sn: 'TEST-SHIPPING-' + Date.now(),
      shipping_date: now.toISOString(),
      actual_start_date: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      order_total_amount: (sku.daily_fee || 100) * 30 + 10 + 15,
      address_change_count: 2,
      address_change_history: [
        {
          changed_at: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
          operator: customer.id,
          old_address: {
            contact_name: '测试用户',
            contact_phone: '13800138000',
            province: '广东省',
            city: '深圳市',
            district: '南山区',
            address: '科技园南路15号',
            region_code: '440305',
          },
          new_address: {
            contact_name: '测试用户2',
            contact_phone: '13900139000',
            province: '江苏省',
            city: '南京市',
            district: '玄武区',
            address: '中山路100号',
            region_code: '320102',
          },
          shipping_fee_change: {
            old_fee: 10,
            new_fee: 20,
            adjustment: 10,
          },
        },
        {
          changed_at: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(),
          operator: customer.id,
          old_address: {
            contact_name: '测试用户2',
            contact_phone: '13900139000',
            province: '江苏省',
            city: '南京市',
            district: '玄武区',
            address: '中山路100号',
            region_code: '320102',
          },
          new_address: {
            contact_name: '测试用户3',
            contact_phone: '13800138888',
            province: '浙江省',
            city: '杭州市',
            district: '西湖区',
            address: '文三路200号',
            region_code: '330106',
          },
          shipping_fee_change: {
            old_fee: 20,
            new_fee: 25,
            adjustment: 5,
          },
        },
      ],
      status_history: [
        {
          status: 'NEW',
          changed_at: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
        },
        {
          status: 'PAID',
          changed_at: new Date(now.getTime() - 2.5 * 60 * 60 * 1000).toISOString(),
        },
        {
          status: 'TO_SHIP',
          changed_at: new Date(now.getTime() - 1.5 * 60 * 60 * 1000).toISOString(),
        },
        {
          status: 'SHIPPED',
          changed_at: new Date(now.getTime() - 0.5 * 60 * 60 * 1000).toISOString(),
        },
        {
          status: 'IN_RENT',
          changed_at: now.toISOString(),
        },
      ],
    };

    const order2 = await payload.create({
      collection: 'orders',
      data: order2Data,
    });

    console.log(`✅ 订单创建成功: ${order2.order_no}`);
    console.log(`   租期: ${order2Data.rent_start_date} 至 ${order2Data.rent_end_date}`);
    console.log(`   状态: IN_RENT`);
    console.log(`   改址次数: 2/2 (已达上限)`);
    console.log(`   运费补差: +15元`);
    console.log(`   地址变更: 广东省 → 江苏省 → 浙江省\n`);

    // ========================================
    // 总结
    // ========================================
    console.log('✨ 测试订单创建完成！');
    console.log('═'.repeat(50));
    console.log('订单1（逾期）:', order1.order_no);
    console.log('  - 状态: IN_RENT');
    console.log('  - 租期: 2025-11-01 至 2025-11-04');
    console.log('  - 特点: 已逾期15天');
    console.log('');
    console.log('订单2（运费补差）:', order2.order_no);
    console.log('  - 状态: IN_RENT');
    console.log('  - 租期:', order2Data.rent_start_date, '至', order2Data.rent_end_date);
    console.log('  - 特点: 修改过2次地址，有运费补差');
    console.log('  - 改址次数: 2/2（已达上限）');
    console.log('  - 运费补差: +15元');
    console.log('  - 地址变更: 广东省 → 江苏省 → 浙江省');
    console.log('═'.repeat(50));

    process.exit(0);
  } catch (error) {
    console.error('\n❌ 创建失败:', error);
    process.exit(1);
  }
}

run();
