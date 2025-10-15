import type { Payload } from 'payload'

/**
 * 同步 Account 和 User 的双向关联
 * 将每个 Account 关联的所有 Users 添加到 Account.users 字段
 *
 * 使用场景：
 * - 初次部署后同步历史数据
 * - 数据不一致时修复
 * - 定期维护任务
 */
export async function syncAccountUsers(payload: Payload): Promise<void> {
  console.log('🔄 开始同步 Account ↔ User 双向关联...')

  try {
    // 1. 获取所有 Accounts
    const accounts = await payload.find({
      collection: 'accounts',
      limit: 10000,
      depth: 0,
    })

    console.log(`   找到 ${accounts.docs.length} 个 Accounts`)

    // 2. 为每个 Account 查询关联的 Users
    let syncedCount = 0
    for (const account of accounts.docs) {
      // 查询关联到该 Account 的所有 Users
      const users = await payload.find({
        collection: 'users',
        where: {
          account: {
            equals: account.id,
          },
        },
        limit: 1000,
        depth: 0,
      })

      const userIds = users.docs.map((user) => user.id)

      // 更新 Account 的 users 字段
      if (userIds.length > 0) {
        await payload.update({
          collection: 'accounts',
          id: account.id,
          data: {
            users: userIds,
          },
        })

        console.log(`   ✓ Account ${account.id} (${account.username}): ${userIds.length} 个 Users`)
        syncedCount++
      }
    }

    console.log(`✅ 同步完成！更新了 ${syncedCount} 个 Accounts`)
  } catch (error) {
    console.error('❌ 同步失败:', error)
    throw error
  }
}

/**
 * 验证 Account ↔ User 双向关联的一致性
 *
 * 检查：
 * 1. 每个 User.account 指向的 Account 是否存在
 * 2. 每个 Account.users 中的 User 是否存在
 * 3. User.account 和 Account.users 是否相互匹配
 */
export async function verifyAccountUserSync(payload: Payload): Promise<{
  valid: boolean
  errors: string[]
}> {
  console.log('🔍 验证 Account ↔ User 双向关联一致性...')

  const errors: string[] = []

  try {
    // 1. 检查所有 Users 的 account 关联
    const users = await payload.find({
      collection: 'users',
      limit: 10000,
      depth: 0,
    })

    for (const user of users.docs) {
      if (!user.account) {
        errors.push(`User ${user.id} 没有关联 Account`)
        continue
      }

      const accountId = typeof user.account === 'object' ? user.account.id : user.account

      // 检查 Account 是否存在
      try {
        const account = await payload.findByID({
          collection: 'accounts',
          id: accountId,
          depth: 0,
        })

        // 检查 Account.users 是否包含此 User
        const accountUsers = account.users || []
        const accountUserIds = Array.isArray(accountUsers)
          ? accountUsers.map((u: any) => (typeof u === 'object' ? u.id : u))
          : []

        if (!accountUserIds.includes(user.id)) {
          errors.push(`Account ${accountId} 的 users 字段不包含 User ${user.id}`)
        }
      } catch (error) {
        errors.push(`User ${user.id} 关联的 Account ${accountId} 不存在`)
      }
    }

    // 2. 检查所有 Accounts 的 users 关联
    const accounts = await payload.find({
      collection: 'accounts',
      limit: 10000,
      depth: 0,
    })

    for (const account of accounts.docs) {
      const accountUsers = account.users || []
      if (!Array.isArray(accountUsers)) continue

      for (const userId of accountUsers) {
        const id = typeof userId === 'object' ? userId.id : userId

        try {
          const user = await payload.findByID({
            collection: 'users',
            id,
            depth: 0,
          })

          // 检查 User.account 是否指向此 Account
          const userAccountId = typeof user.account === 'object' ? user.account.id : user.account
          if (userAccountId !== account.id) {
            errors.push(
              `Account ${account.id} 的 users 包含 User ${id}，但该 User 的 account 指向 ${userAccountId}`,
            )
          }
        } catch (error) {
          errors.push(`Account ${account.id} 的 users 包含不存在的 User ${id}`)
        }
      }
    }

    if (errors.length === 0) {
      console.log('✅ 验证通过！Account ↔ User 双向关联一致')
      return { valid: true, errors: [] }
    } else {
      console.log(`❌ 发现 ${errors.length} 个问题：`)
      errors.forEach((error) => console.log(`   - ${error}`))
      return { valid: false, errors }
    }
  } catch (error) {
    console.error('❌ 验证失败:', error)
    throw error
  }
}
