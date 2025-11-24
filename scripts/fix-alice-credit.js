/**
 * 修复 alice 的授信记录
 */

import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../dist/src/payload.config.js'

async function fixAliceCredit() {
  console.log('🔧 修复 alice 的授信记录...')
  
  const payload = await getPayload({ config })
  
  try {
    // 1. 查找 alice 账号
    const aliceAccount = await payload.find({
      collection: 'accounts',
      where: {
        username: {
          equals: 'alice'
        }
      }
    })
    
    if (aliceAccount.docs.length === 0) {
      console.error('❌ 未找到 alice 账号')
      process.exit(1)
    }
    
    const accountId = aliceAccount.docs[0].id
    console.log('✓ alice account id:', accountId)
    
    // 2. 查找 alice 的 customer user
    const aliceUser = await payload.find({
      collection: 'users',
      where: {
        account: {
          equals: accountId
        },
        role: {
          equals: 'customer'
        }
      }
    })
    
    if (aliceUser.docs.length === 0) {
      console.error('❌ 未找到 alice 的 customer user')
      process.exit(1)
    }
    
    const userId = aliceUser.docs[0].id
    console.log('✓ alice user id:', userId)
    
    // 3. 检查是否已有授信
    const existingCredit = await payload.find({
      collection: 'user-merchant-credit',
      where: {
        user: {
          equals: userId
        },
        merchant: {
          equals: 1 // 极客科技租赁
        }
      }
    })
    
    if (existingCredit.docs.length > 0) {
      console.log('✓ alice 已有授信记录')
      console.log('  授信额度:', existingCredit.docs[0].credit_limit)
      console.log('  状态:', existingCredit.docs[0].status)
    } else {
      // 4. 创建授信
      await payload.create({
        collection: 'user-merchant-credit',
        data: {
          user: userId,
          merchant: 1, // 极客科技租赁
          credit_limit: 20000,
          used_credit: 0,
          status: 'active',
          source: 'manual'
        }
      })
      console.log('✅ 已为 alice 创建授信记录')
    }
    
    console.log('\n✅ 修复完成！')
    process.exit(0)
  } catch (error) {
    console.error('❌ 修复失败:', error)
    process.exit(1)
  }
}

fixAliceCredit()
