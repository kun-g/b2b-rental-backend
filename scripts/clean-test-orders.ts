/**
 * 清理测试订单数据
 * 删除所有订单号包含 "TEST-" 的订单
 * 
 * 使用方法：
 * node --no-deprecation scripts/clean-test-orders.js
 */

import { getPayload } from 'payload';
import config from '../src/payload.config.js';
import dotenv from 'dotenv';

dotenv.config();

let payload: any;

async function main() {
  console.log('🧹 开始清理测试订单数据...\n');
  
  try {
    // 初始化 Payload
    payload = await getPayload({ config });
    
    console.log('✅ Payload 初始化成功\n');
    
    // 查询所有测试订单
    const testOrders = await payload.find({
      collection: 'orders',
      where: {
        order_no: {
          contains: 'TEST-',
        },
      },
      limit: 1000,
    });
    
    console.log(`📦 找到 ${testOrders.docs.length} 个测试订单\n`);
    
    if (testOrders.docs.length === 0) {
      console.log('✅ 没有需要清理的测试订单');
      process.exit(0);
    }
    
    // 删除每个订单
    let deletedCount = 0;
    let failedCount = 0;
    
    for (const order of testOrders.docs) {
      try {
        await payload.delete({
          collection: 'orders',
          id: order.id,
        });
        
        console.log(`✅ 已删除订单: ${order.order_no} (ID: ${order.id})`);
        deletedCount++;
      } catch (error) {
        console.error(`❌ 删除订单失败: ${order.order_no}`, error.message);
        failedCount++;
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log(`\n🎉 清理完成！`);
    console.log(`   - 成功删除: ${deletedCount} 个订单`);
    if (failedCount > 0) {
      console.log(`   - 删除失败: ${failedCount} 个订单`);
    }
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
