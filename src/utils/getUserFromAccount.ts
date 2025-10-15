/**
 * 从 Account 获取关联的 User（业务身份）
 * 用于访问控制逻辑
 */

import type { Payload } from 'payload'
import type { User } from '@/payload-types'

/**
 * 通过 Account 查找关联的 Users
 * @param payload Payload instance
 * @param accountId Account ID
 * @returns 关联的 Users 数组
 */
export async function getUsersFromAccount(
  payload: Payload,
  accountId: string | number,
): Promise<User[]> {
  const result = await payload.find({
    collection: 'users',
    where: {
      account: {
        equals: accountId,
      },
    },
    limit: 100, // 一个账号可能有多个业务身份
  })

  return result.docs
}

/**
 * 检查 Account 是否有指定角色
 * @param payload Payload instance
 * @param accountId Account ID
 * @param roles 要检查的角色数组
 * @returns 是否有任一指定角色
 */
export async function accountHasRole(
  payload: Payload,
  accountId: string | number,
  roles: string[],
): Promise<boolean> {
  const users = await getUsersFromAccount(payload, accountId)
  return users.some((user) => roles.includes(user.role))
}

/**
 * 获取 Account 的第一个 User（用于简单场景）
 * 如果有多个 User，返回权限最高的那个
 * @param payload Payload instance
 * @param accountId Account ID
 * @returns 第一个 User 或 null
 */
export async function getPrimaryUserFromAccount(
  payload: Payload,
  accountId: string | number,
): Promise<User | null> {
  const users = await getUsersFromAccount(payload, accountId)

  if (users.length === 0) return null

  // 按角色优先级排序：platform > merchant > customer
  const rolePriority: Record<string, number> = {
    platform_admin: 1,
    platform_operator: 2,
    platform_support: 3,
    merchant_admin: 4,
    merchant_member: 5,
    customer: 6,
  }

  users.sort((a, b) => {
    const aPriority = rolePriority[a.role] || 999
    const bPriority = rolePriority[b.role] || 999
    return aPriority - bPriority
  })

  return users[0]
}
