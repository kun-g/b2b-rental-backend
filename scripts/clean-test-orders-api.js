/**
 * 清理测试订单
 */

const API_BASE = 'http://localhost:3000/api';

async function login() {
  console.log('🔐 正在登录...');
  
  const response = await fetch(`${API_BASE}/accounts/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username: 'kun',
      password: '123',
    }),
  });

  if (!response.ok) {
    throw new Error(`登录失败: ${response.status}`);
  }

  const cookies = response.headers.get('set-cookie');
  const tokenMatch = cookies?.match(/payload-token=([^;]+)/);
  const token = tokenMatch ? tokenMatch[1] : null;
  
  if (!token) {
    throw new Error('无法获取认证 token');
  }
  
  console.log('✅ 登录成功\n');
  return token;
}

async function main() {
  console.log('🧹 开始清理测试订单...\n');
  
  try {
    const token = await login();
    
    // 查询所有测试订单
    const response = await fetch(`${API_BASE}/orders?where[order_no][contains]=TEST-&limit=100`, {
      headers: {
        'Cookie': `payload-token=${token}`,
      },
    });
    
    const data = await response.json();
    const orders = data.docs || [];
    
    console.log(`📦 找到 ${orders.length} 个测试订单\n`);
    
    if (orders.length === 0) {
      console.log('✅ 没有需要清理的测试订单');
      return;
    }
    
    // 删除每个订单
    for (const order of orders) {
      const deleteResponse = await fetch(`${API_BASE}/orders/${order.id}`, {
        method: 'DELETE',
        headers: {
          'Cookie': `payload-token=${token}`,
        },
      });
      
      if (deleteResponse.ok) {
        console.log(`✅ 已删除: ${order.order_no} (ID: ${order.id})`);
      } else {
        console.error(`❌ 删除失败: ${order.order_no}`);
      }
    }
    
    console.log(`\n🎉 清理完成！删除了 ${orders.length} 个订单`);
    
  } catch (error) {
    console.error('\n❌ 错误:', error.message);
    process.exit(1);
  }
}

main();
