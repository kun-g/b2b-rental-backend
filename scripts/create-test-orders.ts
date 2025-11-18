/**
 * 创建测试订单数据
 * 覆盖逾期和运费补退场景
 * 
 * 使用方法：
 * node --no-deprecation scripts/create-test-orders.js
 */

import { getPayload } from 'payload';
import config from '../src/payload.config.js';
import dotenv from 'dotenv';

dotenv.config();

let payload: any;

// 测试场景配置
const TEST_SCENARIOS = [
  {
    name: '场景1：正常订单（无逾期，无运费差价）',
    customer_id: 7, // alice
    merchant_id: 1,
    sku_id: 1,
    status: 'RETURNED',
    rent_days: 14,
    actual_days: 14, // 准时归还
    shipping_fee_adjustment: 0, // 无运费差价
    description: '客户准时归还，运费无变化，可以直接完成订单',
  },
  {
    name: '场景2：逾期订单（有逾期费，无运费差价）',
    customer_id: 7,
    merchant_id: 1,
    sku_id: 1,
    status: 'RETURNED',
    rent_days: 14,
    actual_days: 20, // 逾期6天
    shipping_fee_adjustment: 0,
    description: '客户逾期6天，需支付逾期费用 6天 × ¥50 = ¥300',
  },
  {
    name: '场景3：正常订单 + 需补运费',
    customer_id: 7,
    merchant_id: 1,
    sku_id: 1,
    status: 'RETURNED',
    rent_days: 14,
    actual_days: 14,
    shipping_fee_adjustment: 5, // 需补运费 ¥5
    description: '准时归还，但修改地址导致运费增加 ¥5，客户需补差价',
  },
  {
    name: '场景4：正常订单 + 需退运费',
    customer_id: 7,
    merchant_id: 1,
    sku_id: 1,
    status: 'RETURNED',
    rent_days: 14,
    actual_days: 14,
    shipping_fee_adjustment: -3, // 需退运费 ¥3
    description: '准时归还，修改地址导致运费减少 ¥3，商户需退款',
  },
  {
    name: '场景5：逾期 + 需补运费',
    customer_id: 7,
    merchant_id: 1,
    sku_id: 1,
    status: 'RETURNED',
    rent_days: 14,
    actual_days: 18, // 逾期4天
    shipping_fee_adjustment: 8, // 需补运费 ¥8
    description: '逾期4天(¥200) + 补运费(¥8) = 总补差价 ¥208',
  },
  {
    name: '场景6：逾期 + 需退运费（逾期费 > 退运费）',
    customer_id: 7,
    merchant_id: 1,
    sku_id: 1,
    status: 'RETURNED',
    rent_days: 14,
    actual_days: 20, // 逾期6天
    shipping_fee_adjustment: -3, // 需退运费 ¥3
    description: '逾期6天(¥300) - 退运费(¥3) = 总补差价 ¥297（客户仍需支付）',
  },
  {
    name: '场景7：逾期 + 需退运费（退运费 > 逾期费）',
    customer_id: 7,
    merchant_id: 1,
    sku_id: 1,
    status: 'RETURNED',
    rent_days: 14,
    actual_days: 15, // 逾期1天
    shipping_fee_adjustment: -10, // 需退运费 ¥10
    description: '逾期1天(¥50) - 退运费(¥10) = 总补差价 ¥40（客户仍需支付）',
  },
  {
    name: '场景8：轻微逾期 + 大额退运费（需退款）',
    customer_id: 7,
    merchant_id: 1,
    sku_id: 1,
    status: 'RETURNED',
    rent_days: 14,
    actual_days: 15, // 逾期1天
    shipping_fee_adjustment: -100, // 需退运费 ¥100（特殊情况）
    description: '逾期1天(¥50) - 退运费(¥100) = 总补差价 -¥50（商户需退款）',
  },
];

async function createTestOrder(scenario, index) {
  console.log(`\n📦 创建订单 ${index + 1}/${TEST_SCENARIOS.length}: ${scenario.name}`);
  
  try {
    // 1. 生成订单号
    const orderNo = `TEST-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    
    // 2. 获取 SKU 信息
    const sku = await payload.findByID({
      collection: 'merchant-skus',
      id: scenario.sku_id,
      depth: 1,
    });
    
    if (!sku) {
      throw new Error(`SKU ${scenario.sku_id} 不存在`);
    }
    
    // 3. 计算时间
    const now = new Date();
    const orderCreateAt = new Date(now.getTime() - (scenario.actual_days + 5) * 24 * 60 * 60 * 1000); // 订单创建时间
    const rentStartDate = new Date(orderCreateAt.getTime() + 2 * 24 * 60 * 60 * 1000); // 租赁开始（发货后2天）
    const rentEndDate = new Date(rentStartDate.getTime() + scenario.rent_days * 24 * 60 * 60 * 1000); // 约定归还时间
    const actualReturnDate = new Date(rentStartDate.getTime() + scenario.actual_days * 24 * 60 * 60 * 1000); // 实际归还时间
    
    // 4. 计算逾期
    const isOverdue = scenario.actual_days > scenario.rent_days;
    const overdueDays = isOverdue ? scenario.actual_days - scenario.rent_days : 0;
    const overdueAmount = overdueDays * sku.daily_fee;
    
    // 5. 创建订单
    const order = await payload.create({
      collection: 'orders',
      data: {
        order_no: orderNo,
        customer: scenario.customer_id,
        merchant: scenario.merchant_id,
        merchant_sku: scenario.sku_id,
        status: scenario.status,
        
        // 时间信息
        order_creat_at: orderCreateAt.toISOString(),
        rent_start_date: rentStartDate.toISOString(),
        rent_end_date: rentEndDate.toISOString(),
        actual_start_date: rentStartDate.toISOString(),
        return_confirm_time: actualReturnDate.toISOString(),
        
        // 租期信息
        rent_days: scenario.rent_days,
        timezone: 'Asia/Shanghai',
        
        // 价格快照
        daily_fee_snapshot: sku.daily_fee,
        device_value_snapshot: sku.device_value,
        shipping_fee_snapshot: 5, // 假设原运费 ¥5
        
        // 运费补差价
        shipping_fee_adjustment: scenario.shipping_fee_adjustment,
        
        // 授信
        credit_hold_amount: sku.device_value,
        
        // 地址信息
        shipping_address: {
          contact_name: 'Alice',
          contact_phone: '13800138001',
          province: '广东省',
          city: '深圳市',
          district: '南山区',
          address: '科技园南区',
          region_code: '440305',
        },
        
        return_address: {
          contact_name: '极客科技',
          contact_phone: '0755-12345678',
          province: '广东省',
          city: '深圳市',
          district: '福田区',
          address: '华强北电子市场',
          postal_code: '518000',
        },
        
        // 逾期信息
        is_overdue: isOverdue,
        overdue_days: overdueDays,
        overdue_amount: overdueAmount,
        
        // 订单总额
        order_total_amount: scenario.rent_days * sku.daily_fee + 5, // 租金 + 原运费
        
        // 备注
        notes: `测试订单 - ${scenario.description}`,
      },
    });
    
    console.log(`✅ 订单创建成功: ${orderNo}`);
    console.log(`   - 订单ID: ${order.id}`);
    console.log(`   - 状态: ${order.status}`);
    console.log(`   - 租期: ${scenario.rent_days}天 (实际: ${scenario.actual_days}天)`);
    console.log(`   - 逾期: ${isOverdue ? `是 (${overdueDays}天, ¥${overdueAmount})` : '否'}`);
    console.log(`   - 运费差价: ${scenario.shipping_fee_adjustment > 0 ? '+' : ''}¥${scenario.shipping_fee_adjustment}`);
    
    const totalSurcharge = overdueAmount + scenario.shipping_fee_adjustment;
    console.log(`   - 总补差价: ${totalSurcharge > 0 ? '+' : ''}¥${totalSurcharge}`);
    
    if (totalSurcharge > 0) {
      console.log(`   ⚠️  客户需支付补差价: ¥${totalSurcharge}`);
    } else if (totalSurcharge < 0) {
      console.log(`   💰 商户需退款: ¥${Math.abs(totalSurcharge)}`);
    } else {
      console.log(`   ✓  无需补差价，可直接完成`);
    }
    
    return order;
  } catch (error) {
    console.error(`❌ 创建订单失败:`, error.message);
    throw error;
  }
}

async function main() {
  console.log('🚀 开始创建测试订单数据...\n');
  console.log('=' .repeat(80));
  
  try {
    // 初始化 Payload
    payload = await getPayload({ config });
    
    console.log('✅ Payload 初始化成功\n');
    
    // 验证客户和商户存在
    const customer = await payload.findByID({
      collection: 'users',
      id: 7,
    });
    
    if (!customer) {
      throw new Error('客户 alice (ID: 7) 不存在，请先运行种子数据脚本');
    }
    
    console.log(`✅ 找到测试客户: ${customer.username} (ID: ${customer.id})\n`);
    
    // 创建所有测试订单
    const orders = [];
    for (let i = 0; i < TEST_SCENARIOS.length; i++) {
      const order = await createTestOrder(TEST_SCENARIOS[i], i);
      orders.push(order);
      
      // 添加延迟，避免订单号重复
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('\n' + '='.repeat(80));
    console.log(`\n🎉 成功创建 ${orders.length} 个测试订单！\n`);
    
    // 输出测试指南
    console.log('📋 测试指南：');
    console.log('');
    console.log('1. 登录客户账号 (alice / password123)');
    console.log('2. 进入"我的订单"页面');
    console.log('3. 查看 RETURNED 状态的订单');
    console.log('4. 测试以下场景：');
    console.log('');
    
    TEST_SCENARIOS.forEach((scenario, index) => {
      const totalSurcharge = (scenario.actual_days > scenario.rent_days 
        ? (scenario.actual_days - scenario.rent_days) * 50 
        : 0) + scenario.shipping_fee_adjustment;
      
      console.log(`   场景${index + 1}: ${scenario.name}`);
      if (totalSurcharge > 0) {
        console.log(`   → 点击"支付补差价 ¥${totalSurcharge}"按钮`);
      } else if (totalSurcharge < 0) {
        console.log(`   → 查看"待商户退运费 ¥${Math.abs(totalSurcharge)}"状态`);
      } else {
        console.log(`   → 查看"等待商户确认"状态`);
      }
      console.log('');
    });
    
    console.log('5. 切换到商户账号测试商户端功能');
    console.log('');
    
  } catch (error) {
    console.error('\n❌ 错误:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// 运行脚本
main();
