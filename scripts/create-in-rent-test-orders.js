/**
 * 创建租赁中状态的测试订单
 * 包括：逾期订单、修改地址补运费订单
 * 用户：alice/123
 */

import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api';

// 登录获取token
async function login(username, password) {
  try {
    const response = await axios.post(`${API_BASE_URL}/accounts/login`, {
      username,
      password,
    });
    return response.data.token;
  } catch (error) {
    console.error('登录失败:', error.response?.data || error.message);
    throw error;
  }
}

// 获取用户信息
async function getUserInfo(token) {
  try {
    const response = await axios.get(`${API_BASE_URL}/accounts/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data.user;
  } catch (error) {
    console.error('获取用户信息失败:', error.response?.data || error.message);
    throw error;
  }
}

// 获取可用的SKU
async function getAvailableSKU(token) {
  try {
    const response = await axios.get(`${API_BASE_URL}/merchant-skus?limit=1`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.data.docs.length === 0) {
      throw new Error('没有可用的SKU');
    }
    return response.data.docs[0];
  } catch (error) {
    console.error('获取SKU失败:', error.response?.data || error.message);
    throw error;
  }
}

// 创建订单
async function createOrder(token, userId, skuId, rentStartDate, rentEndDate) {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/orders`,
      {
        customer: userId,
        merchant_sku: skuId,
        rent_start_date: rentStartDate,
        rent_end_date: rentEndDate,
        shipping_address: {
          contact_name: '测试用户',
          contact_phone: '13800138000',
          province: '广东省',
          city: '深圳市',
          district: '南山区',
          address: '科技园南路15号',
          region_code: '440305',
        },
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data.doc;
  } catch (error) {
    console.error('创建订单失败:', error.response?.data || error.message);
    throw error;
  }
}

// 更新订单状态
async function updateOrderStatus(token, orderId, status, additionalData = {}) {
  try {
    const response = await axios.patch(
      `${API_BASE_URL}/orders/${orderId}`,
      {
        status,
        ...additionalData,
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  } catch (error) {
    console.error(`更新订单状态到 ${status} 失败:`, error.response?.data || error.message);
    throw error;
  }
}

// 创建物流记录
async function createLogistics(token, orderNo, orderId, logisticsType, trackingNumber) {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/logistics`,
      {
        order_no: orderNo,
        order: orderId,
        carrier: '顺丰速运',
        logistics_no: trackingNumber,
        ship_at: new Date().toISOString(),
        logistics_type: logisticsType,
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data.doc;
  } catch (error) {
    console.error('创建物流记录失败:', error.response?.data || error.message);
    throw error;
  }
}

// 主函数
async function main() {
  console.log('🚀 开始创建租赁中状态的测试订单...\n');

  try {
    // 1. 登录
    console.log('1️⃣ 登录用户 alice...');
    const token = await login('alice', '123');
    console.log('✅ 登录成功\n');

    // 2. 获取用户信息
    console.log('2️⃣ 获取用户信息...');
    const userInfo = await getUserInfo(token);
    const userId = userInfo.id;
    console.log(`✅ 用户ID: ${userId}\n`);

    // 3. 获取可用SKU
    console.log('3️⃣ 获取可用SKU...');
    const sku = await getAvailableSKU(token);
    console.log(`✅ SKU: ${sku.name} (ID: ${sku.id})\n`);

    // ========================================
    // 订单1：逾期的租赁中订单
    // ========================================
    console.log('📦 创建订单1：逾期的租赁中订单');
    console.log('─'.repeat(50));

    // 租期：2025-11-01 至 2025-11-04（已经逾期15天）
    const rentStart1 = '2025-11-01';
    const rentEnd1 = '2025-11-04';

    console.log(`租期: ${rentStart1} 至 ${rentEnd1} (已逾期15天)`);

    const order1 = await createOrder(token, userId, sku.id, rentStart1, rentEnd1);
    console.log(`✅ 订单创建成功: ${order1.order_no}`);

    // 更新到 PAID
    await updateOrderStatus(token, order1.id, 'PAID');
    console.log('✅ 状态更新: NEW → PAID');

    // 更新到 TO_SHIP
    await updateOrderStatus(token, order1.id, 'TO_SHIP');
    console.log('✅ 状态更新: PAID → TO_SHIP');

    // 创建发货物流
    const logistics1 = await createLogistics(token, order1.order_no, order1.id, 'shipping', 'SF' + Date.now());
    console.log(`✅ 发货物流创建: ${logistics1.logistics_no}`);

    // 更新到 SHIPPED（手动设置 actual_start_date 为 2025-11-02）
    await updateOrderStatus(token, order1.id, 'SHIPPED', {
      shipping_date: '2025-11-01T10:00:00.000Z',
      actual_start_date: '2025-11-02T00:00:00.000Z', // 发货次日开始计费
      device_sn: 'TEST-SN-' + Date.now(),
      shipping_logistics: logistics1.id,
    });
    console.log('✅ 状态更新: TO_SHIP → SHIPPED (计费起点: 2025-11-02)');

    // 更新到 IN_RENT
    await updateOrderStatus(token, order1.id, 'IN_RENT');
    console.log('✅ 状态更新: SHIPPED → IN_RENT');
    console.log(`🎉 订单1创建完成: ${order1.order_no} (逾期订单)\n`);

    // ========================================
    // 订单2：修改地址有运费补差的租赁中订单
    // ========================================
    console.log('📦 创建订单2：修改地址有运费补差的租赁中订单');
    console.log('─'.repeat(50));

    // 租期：今天开始，30天后结束
    const now = new Date();
    const rentStart2 = now.toISOString().split('T')[0];
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const rentEnd2 = thirtyDaysLater.toISOString().split('T')[0];

    console.log(`租期: ${rentStart2} 至 ${rentEnd2}`);

    const order2 = await createOrder(token, userId, sku.id, rentStart2, rentEnd2);
    console.log(`✅ 订单创建成功: ${order2.order_no}`);

    // 更新到 PAID
    await updateOrderStatus(token, order2.id, 'PAID');
    console.log('✅ 状态更新: NEW → PAID');

    // 修改地址（第1次）- 广东省 → 江苏省
    console.log('📍 修改地址（第1次）：广东省 → 江苏省...');
    await updateOrderStatus(token, order2.id, 'PAID', {
      shipping_address: {
        contact_name: '测试用户2',
        contact_phone: '13900139000',
        province: '江苏省',
        city: '南京市',
        district: '玄武区',
        address: '中山路100号',
        region_code: '320102',
      },
    });
    console.log('✅ 地址修改成功（广东→江苏，产生运费补差）');

    // 修改地址（第2次）- 江苏省 → 浙江省
    console.log('📍 修改地址（第2次）：江苏省 → 浙江省...');
    await updateOrderStatus(token, order2.id, 'PAID', {
      shipping_address: {
        contact_name: '测试用户3',
        contact_phone: '13800138888',
        province: '浙江省',
        city: '杭州市',
        district: '西湖区',
        address: '文三路200号',
        region_code: '330106',
      },
    });
    console.log('✅ 地址修改成功（江苏→浙江，再次产生运费补差）');

    // 更新到 TO_SHIP
    await updateOrderStatus(token, order2.id, 'TO_SHIP');
    console.log('✅ 状态更新: PAID → TO_SHIP');

    // 创建发货物流
    const logistics2 = await createLogistics(token, order2.order_no, order2.id, 'shipping', 'SF' + (Date.now() + 1));
    console.log(`✅ 发货物流创建: ${logistics2.logistics_no}`);

    // 更新到 SHIPPED
    await updateOrderStatus(token, order2.id, 'SHIPPED', {
      shipping_date: new Date().toISOString(),
      device_sn: 'TEST-SN-' + (Date.now() + 1),
      shipping_logistics: logistics2.id,
    });
    console.log('✅ 状态更新: TO_SHIP → SHIPPED');

    // 更新到 IN_RENT
    await updateOrderStatus(token, order2.id, 'IN_RENT');
    console.log('✅ 状态更新: SHIPPED → IN_RENT');
    console.log(`🎉 订单2创建完成: ${order2.order_no} (修改地址补运费订单)\n`);

    // ========================================
    // 总结
    // ========================================
    console.log('✨ 测试订单创建完成！');
    console.log('═'.repeat(50));
    console.log('订单1（逾期）:', order1.order_no);
    console.log('  - 状态: IN_RENT');
    console.log('  - 租期:', rentStart1, '至', rentEnd1);
    console.log('  - 特点: 已逾期');
    console.log('');
    console.log('订单2（运费补差）:', order2.order_no);
    console.log('  - 状态: IN_RENT');
    console.log('  - 租期:', rentStart2, '至', rentEnd2);
    console.log('  - 特点: 修改过2次地址，有运费补差');
    console.log('  - 改址次数: 2/2（已达上限）');
    console.log('  - 地址变更: 广东省 → 江苏省 → 浙江省');
    console.log('═'.repeat(50));
  } catch (error) {
    console.error('\n❌ 创建测试订单失败:', error.message);
    process.exit(1);
  }
}

// 运行
main();
