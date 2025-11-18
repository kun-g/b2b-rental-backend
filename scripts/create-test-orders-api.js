/**
 * 通过 Payload API 创建测试订单
 * 使用 HTTP 请求直接调用 API
 * 
 * 使用方法：
 * 1. 确保后端服务运行在 http://localhost:3000
 * 2. node scripts/create-test-orders-api.js
 */

const API_BASE = 'http://localhost:3000/api';

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

// 登录获取 token
async function login() {
  console.log('🔐 正在登录...');
  
  const response = await fetch(`${API_BASE}/accounts/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username: 'alice',
      password: '123',
    }),
  });

  if (!response.ok) {
    throw new Error(`登录失败: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  
  // 从 Set-Cookie 头获取 token
  const cookies = response.headers.get('set-cookie');
  const tokenMatch = cookies?.match(/payload-token=([^;]+)/);
  const token = tokenMatch ? tokenMatch[1] : null;
  
  if (!token) {
    throw new Error('无法获取认证 token');
  }
  
  console.log('✅ 登录成功\n');
  return token;
}

// 创建订单
async function createOrder(scenario, token, index) {
  console.log(`📦 创建订单 ${index + 1}/${TEST_SCENARIOS.length}: ${scenario.name}`);
  
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
    
    // 订单数据（不指定 customer，让后端自动填充为当前登录用户）
    const orderData = {
      order_no: scenario.order_no,
      // customer 字段不指定，后端会自动填充为当前登录用户的 customer 身份
      merchant: 1, // 极客科技租赁
      merchant_sku: 1, // 大疆 Mini 3 Pro
      status: 'NEW', // 先创建为 NEW 状态
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
      is_overdue: isOverdue,
      overdue_days: overdueDays,
      overdue_amount: overdueAmount,
      order_total_amount: scenario.rent_days * dailyFee + 5,
      notes: `测试订单 - ${scenario.description}`,
    };
    
    // 发送请求
    const response = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `payload-token=${token}`,
      },
      body: JSON.stringify(orderData),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    const result = await response.json();
    const orderId = result.doc.id;
    
    // 更新订单状态为 PAID（跳过支付流程）
    await fetch(`${API_BASE}/orders/${orderId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `payload-token=${token}`,
      },
      body: JSON.stringify({
        status: 'PAID',
      }),
    });
    
    // 更新为 TO_SHIP
    await fetch(`${API_BASE}/orders/${orderId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `payload-token=${token}`,
      },
      body: JSON.stringify({
        status: 'TO_SHIP',
      }),
    });
    
    // 更新为 SHIPPED
    await fetch(`${API_BASE}/orders/${orderId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `payload-token=${token}`,
      },
      body: JSON.stringify({
        status: 'SHIPPED',
        shipping_date: rentStartDate.toISOString(),
      }),
    });
    
    // 更新为 IN_RENT
    await fetch(`${API_BASE}/orders/${orderId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `payload-token=${token}`,
      },
      body: JSON.stringify({
        status: 'IN_RENT',
      }),
    });
    
    // 更新为 RETURNING
    await fetch(`${API_BASE}/orders/${orderId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `payload-token=${token}`,
      },
      body: JSON.stringify({
        status: 'RETURNING',
      }),
    });
    
    // 最后更新为 RETURNED，并设置所有必要的字段
    const updateResponse = await fetch(`${API_BASE}/orders/${orderId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `payload-token=${token}`,
      },
      body: JSON.stringify({
        status: 'RETURNED',
        return_confirm_time: actualReturnDate.toISOString(),
        is_overdue: isOverdue,
        overdue_days: overdueDays,
        overdue_amount: overdueAmount,
        shipping_fee_adjustment: scenario.shipping_fee_adjustment,
      }),
    });
    
    if (!updateResponse.ok) {
      const error = await updateResponse.text();
      console.warn(`⚠️  更新订单状态失败: ${error}`);
    }
    
    console.log(`✅ 订单创建成功: ${scenario.order_no} (ID: ${orderId})`);
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
    
    return result.doc;
  } catch (error) {
    console.error(`❌ 创建订单失败:`, error.message);
    console.log('');
    throw error;
  }
}

// 主函数
async function main() {
  console.log('🚀 开始创建测试订单数据...\n');
  console.log('='.repeat(80));
  console.log('');
  
  try {
    // 登录
    const token = await login();
    
    // 创建所有测试订单
    const orders = [];
    for (let i = 0; i < TEST_SCENARIOS.length; i++) {
      const order = await createOrder(TEST_SCENARIOS[i], token, i);
      orders.push(order);
      
      // 添加延迟，避免请求过快
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log('='.repeat(80));
    console.log(`\n🎉 成功创建 ${orders.length} 个测试订单！\n`);
    
    // 输出测试指南
    console.log('📋 测试指南：');
    console.log('');
    console.log('1. 登录客户账号 (alice / password123)');
    console.log('2. 进入"我的订单"页面');
    console.log('3. 切换到"已归还"标签');
    console.log('4. 测试各种补差价场景');
    console.log('');
    console.log('详细测试步骤请参考：快速测试指南.md');
    console.log('');
    
  } catch (error) {
    console.error('\n❌ 错误:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// 运行
main();
