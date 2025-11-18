/**
 * 直接插入测试订单数据到 SQLite 数据库
 * 使用 better-sqlite3 直接操作数据库
 * 
 * 使用方法：
 * node scripts/insert-test-orders.js
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 数据库路径
const dbPath = path.join(__dirname, '..', 'dev.db');

console.log('🚀 开始插入测试订单数据...\n');
console.log('数据库路径:', dbPath);
console.log('='.repeat(80));

// 测试场景配置
const TEST_SCENARIOS = [
  {
    name: '场景1：正常订单（无逾期，无运费差价）',
    order_no: 'TEST-NORMAL-001',
    rent_days: 14,
    actual_days: 14,
    shipping_fee_adjustment: 0,
    description: '客户准时归还，运费无变化，可以直接完成订单',
  },
  {
    name: '场景2：逾期订单（有逾期费，无运费差价）',
    order_no: 'TEST-OVERDUE-002',
    rent_days: 14,
    actual_days: 20,
    shipping_fee_adjustment: 0,
    description: '客户逾期6天，需支付逾期费用 6天 × ¥50 = ¥300',
  },
  {
    name: '场景3：正常订单 + 需补运费',
    order_no: 'TEST-SHIPPING-UP-003',
    rent_days: 14,
    actual_days: 14,
    shipping_fee_adjustment: 5,
    description: '准时归还，但修改地址导致运费增加 ¥5，客户需补差价',
  },
  {
    name: '场景4：正常订单 + 需退运费',
    order_no: 'TEST-SHIPPING-DOWN-004',
    rent_days: 14,
    actual_days: 14,
    shipping_fee_adjustment: -3,
    description: '准时归还，修改地址导致运费减少 ¥3，商户需退款',
  },
  {
    name: '场景5：逾期 + 需补运费',
    order_no: 'TEST-BOTH-UP-005',
    rent_days: 14,
    actual_days: 18,
    shipping_fee_adjustment: 8,
    description: '逾期4天(¥200) + 补运费(¥8) = 总补差价 ¥208',
  },
  {
    name: '场景6：逾期 + 需退运费（逾期费 > 退运费）',
    order_no: 'TEST-BOTH-DOWN-006',
    rent_days: 14,
    actual_days: 20,
    shipping_fee_adjustment: -3,
    description: '逾期6天(¥300) - 退运费(¥3) = 总补差价 ¥297',
  },
  {
    name: '场景7：逾期 + 需退运费（退运费 > 逾期费）',
    order_no: 'TEST-BOTH-DOWN-007',
    rent_days: 14,
    actual_days: 15,
    shipping_fee_adjustment: -10,
    description: '逾期1天(¥50) - 退运费(¥10) = 总补差价 ¥40',
  },
  {
    name: '场景8：轻微逾期 + 大额退运费（需退款）',
    order_no: 'TEST-REFUND-008',
    rent_days: 14,
    actual_days: 15,
    shipping_fee_adjustment: -100,
    description: '逾期1天(¥50) - 退运费(¥100) = 总补差价 -¥50（商户需退款）',
  },
];

try {
  // 打开数据库
  const db = new Database(dbPath);
  console.log('\n✅ 数据库连接成功\n');

  // 检查是否已存在测试订单
  const existingOrders = db.prepare(`
    SELECT COUNT(*) as count FROM orders WHERE order_no LIKE 'TEST-%'
  `).get();

  if (existingOrders.count > 0) {
    console.log(`⚠️  发现 ${existingOrders.count} 个已存在的测试订单`);
    console.log('正在删除旧的测试订单...\n');
    
    const deleteResult = db.prepare(`
      DELETE FROM orders WHERE order_no LIKE 'TEST-%'
    `).run();
    
    console.log(`✅ 已删除 ${deleteResult.changes} 个旧订单\n`);
  }

  // 准备插入语句
  const insertStmt = db.prepare(`
    INSERT INTO orders (
      order_no,
      customer,
      merchant,
      merchant_sku,
      status,
      order_creat_at,
      rent_start_date,
      rent_end_date,
      actual_start_date,
      return_confirm_time,
      rent_days,
      timezone,
      daily_fee_snapshot,
      device_value_snapshot,
      shipping_fee_snapshot,
      shipping_fee_adjustment,
      credit_hold_amount,
      shipping_address,
      return_address,
      is_overdue,
      overdue_days,
      overdue_amount,
      order_total_amount,
      notes,
      createdAt,
      updatedAt
    ) VALUES (
      @order_no,
      @customer,
      @merchant,
      @merchant_sku,
      @status,
      @order_creat_at,
      @rent_start_date,
      @rent_end_date,
      @actual_start_date,
      @return_confirm_time,
      @rent_days,
      @timezone,
      @daily_fee_snapshot,
      @device_value_snapshot,
      @shipping_fee_snapshot,
      @shipping_fee_adjustment,
      @credit_hold_amount,
      @shipping_address,
      @return_address,
      @is_overdue,
      @overdue_days,
      @overdue_amount,
      @order_total_amount,
      @notes,
      @createdAt,
      @updatedAt
    )
  `);

  // 插入每个测试场景
  let successCount = 0;
  
  for (let i = 0; i < TEST_SCENARIOS.length; i++) {
    const scenario = TEST_SCENARIOS[i];
    
    console.log(`📦 创建订单 ${i + 1}/${TEST_SCENARIOS.length}: ${scenario.name}`);
    
    try {
      // 计算时间
      const now = new Date();
      const orderCreateAt = new Date(now.getTime() - (scenario.actual_days + 5) * 24 * 60 * 60 * 1000);
      const rentStartDate = new Date(orderCreateAt.getTime() + 2 * 24 * 60 * 60 * 1000);
      const rentEndDate = new Date(rentStartDate.getTime() + scenario.rent_days * 24 * 60 * 60 * 1000);
      const actualReturnDate = new Date(rentStartDate.getTime() + scenario.actual_days * 24 * 60 * 60 * 1000);
      
      // 计算逾期
      const isOverdue = scenario.actual_days > scenario.rent_days;
      const overdueDays = isOverdue ? scenario.actual_days - scenario.rent_days : 0;
      const dailyFee = 50;
      const overdueAmount = overdueDays * dailyFee;
      
      // 地址 JSON
      const shippingAddress = JSON.stringify({
        contact_name: 'Alice',
        contact_phone: '13800138001',
        province: '广东省',
        city: '深圳市',
        district: '南山区',
        address: '科技园南区',
        region_code: '440305',
      });
      
      const returnAddress = JSON.stringify({
        contact_name: '极客科技',
        contact_phone: '0755-12345678',
        province: '广东省',
        city: '深圳市',
        district: '福田区',
        address: '华强北电子市场',
        postal_code: '518000',
      });
      
      // 插入数据
      const result = insertStmt.run({
        order_no: scenario.order_no,
        customer: 7, // alice
        merchant: 1, // 极客科技租赁
        merchant_sku: 1, // 大疆 Mini 3 Pro
        status: 'RETURNED',
        order_creat_at: orderCreateAt.toISOString(),
        rent_start_date: rentStartDate.toISOString(),
        rent_end_date: rentEndDate.toISOString(),
        actual_start_date: rentStartDate.toISOString(),
        return_confirm_time: actualReturnDate.toISOString(),
        rent_days: scenario.rent_days,
        timezone: 'Asia/Shanghai',
        daily_fee_snapshot: dailyFee,
        device_value_snapshot: 5000,
        shipping_fee_snapshot: 5,
        shipping_fee_adjustment: scenario.shipping_fee_adjustment,
        credit_hold_amount: 5000,
        shipping_address: shippingAddress,
        return_address: returnAddress,
        is_overdue: isOverdue ? 1 : 0,
        overdue_days: overdueDays,
        overdue_amount: overdueAmount,
        order_total_amount: scenario.rent_days * dailyFee + 5,
        notes: `测试订单 - ${scenario.description}`,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });
      
      console.log(`✅ 订单创建成功: ${scenario.order_no} (ID: ${result.lastInsertRowid})`);
      console.log(`   - 状态: RETURNED`);
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
      console.log('');
      
      successCount++;
    } catch (error) {
      console.error(`❌ 创建订单失败:`, error.message);
      console.log('');
    }
  }
  
  // 关闭数据库
  db.close();
  
  console.log('='.repeat(80));
  console.log(`\n🎉 成功创建 ${successCount}/${TEST_SCENARIOS.length} 个测试订单！\n`);
  
  // 输出测试指南
  console.log('📋 测试指南：');
  console.log('');
  console.log('1. 登录客户账号 (alice / password123)');
  console.log('2. 进入"我的订单"页面');
  console.log('3. 查看 RETURNED 状态的订单');
  console.log('4. 测试各种补差价场景');
  console.log('');
  console.log('详细测试步骤请参考：快速测试指南.md');
  console.log('');
  
} catch (error) {
  console.error('\n❌ 错误:', error.message);
  console.error(error.stack);
  process.exit(1);
}
