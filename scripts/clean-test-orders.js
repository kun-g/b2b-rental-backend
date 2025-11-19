/**
 * 清理测试订单和相关数据
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

// 删除订单
async function deleteOrder(token, orderId) {
  try {
    await axios.delete(`${API_BASE_URL}/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return true;
  } catch (error) {
    console.error(`删除订单 ${orderId} 失败:`, error.response?.data || error.message);
    return false;
  }
}

// 获取所有测试订单
async function getTestOrders(token) {
  try {
    const response = await axios.get(`${API_BASE_URL}/orders?limit=1000`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    // 筛选测试订单（订单号包含 TEST 或 ORD-176）
    return response.data.docs.filter(order => 
      order.order_no.includes('TEST') || 
      order.order_no.includes('ORD-176') ||
      order.device_sn?.includes('TEST')
    );
  } catch (error) {
    console.error('获取订单失败:', error.response?.data || error.message);
    return [];
  }
}

async function main() {
  console.log('🧹 开始清理测试订单...\n');

  try {
    // 使用平台管理员账号登录（需要删除权限）
    console.log('1️⃣ 登录平台管理员账号...');
    const token = await login('admin', 'admin123'); // 请替换为实际的管理员账号
    console.log('✅ 登录成功\n');

    // 获取测试订单
    console.log('2️⃣ 查找测试订单...');
    const testOrders = await getTestOrders(token);
    console.log(`✅ 找到 ${testOrders.length} 个测试订单\n`);

    if (testOrders.length === 0) {
      console.log('✨ 没有需要清理的测试订单');
      return;
    }

    // 删除测试订单
    console.log('3️⃣ 删除测试订单...');
    let successCount = 0;
    for (const order of testOrders) {
      const success = await deleteOrder(token, order.id);
      if (success) {
        console.log(`✅ 已删除: ${order.order_no}`);
        successCount++;
      } else {
        console.log(`❌ 删除失败: ${order.order_no}`);
      }
    }

    console.log(`\n✨ 清理完成！成功删除 ${successCount}/${testOrders.length} 个订单`);
  } catch (error) {
    console.error('\n❌ 清理失败:', error.message);
    process.exit(1);
  }
}

main();
