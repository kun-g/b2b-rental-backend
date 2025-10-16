import type { Payload } from 'payload'
import type { User } from '../payload-types'

/**
 * 获取 Account 的主要 User（业务身份）
 * - 按创建时间排序，返回最早创建的 User
 * - 如果没有关联的 User，返回 null
 * - 如果查询失败，异常会传播到调用方
 */
export async function getPrimaryUserFromAccount(
  payload: Payload,
  accountId: string | number,
): Promise<User | null> {
  // 查询与该 Account 关联的第一个 User（按创建时间排序）
  const result = await payload.find({
    collection: 'users',
    where: {
      account: {
        equals: accountId,
      },
    },
    sort: 'createdAt', // 明确排序规则：返回最早创建的 User
    limit: 1,
    depth: 0,
  })

  return (result.docs[0] as User) || null
}

/**
 * 检查 Account 是否拥有指定角色
 * - 检查该 Account 关联的所有 Users 是否有任一角色匹配
 * - 如果 roles 为空数组，返回 false
 * - 如果查询失败，异常会传播到调用方
 */
export async function accountHasRole(
  payload: Payload,
  accountId: string | number,
  roles: string[],
): Promise<boolean> {
  // 边界检查：空数组直接返回 false
  if (roles.length === 0) {
    console.warn('[accountHasRole] Empty roles array provided, returning false')
    return false
  }

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
}
