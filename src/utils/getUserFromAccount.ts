import type { Payload } from 'payload'

/**
 * 获取 Account 的主要 User（业务身份）
 * - 优先返回第一个 User
 * - 如果没有关联的 User，返回 null
 */
export async function getPrimaryUserFromAccount(
  payload: Payload,
  accountId: string | number,
): Promise<any | null> {
  try {
    // 查询与该 Account 关联的第一个 User
    const result = await payload.find({
      collection: 'users',
      where: {
        account: {
          equals: accountId,
        },
      },
      limit: 1,
      depth: 0,
    })

    return result.docs[0] || null
  } catch (error) {
    console.error('Error in getPrimaryUserFromAccount:', error)
    return null
  }
}

/**
 * 检查 Account 是否拥有指定角色
 * - 检查该 Account 关联的所有 Users 是否有任一角色匹配
 */
export async function accountHasRole(
  payload: Payload,
  accountId: string | number,
  roles: string[],
): Promise<boolean> {
  try {
    // 查询该 Account 关联的所有 Users
    const result = await payload.find({
      collection: 'users',
      where: {
        account: {
          equals: accountId,
        },
        role: {
          in: roles,
        },
      },
      limit: 1,
      depth: 0,
    })

    return result.totalDocs > 0
  } catch (error) {
    console.error('Error in accountHasRole:', error)
    return false
  }
}
