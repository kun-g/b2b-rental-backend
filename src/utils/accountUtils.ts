import type { Payload } from 'payload'
import type { User } from '../payload-types'

/**
 * 从 Account 获取关联的 User（业务身份）
 * - 支持可选的角色过滤
 * - 按创建时间排序，返回最早创建的 User
 * - 如果没有关联的 User，返回 null
 * - 如果查询失败，异常会传播到调用方
 *
 * @param payload - Payload 实例
 * @param accountId - Account ID
 * @param roles - 可选的角色过滤数组，为空或未提供时返回最早创建的 User
 * @returns User 对象或 null
 *
 * @example
 * // 获取任意角色的 User（最早创建的）
 * const user = await getUserFromAccount(payload, accountId)
 *
 * @example
 * // 获取 customer 角色的 User
 * const customerUser = await getUserFromAccount(payload, accountId, ['customer'])
 *
 * @example
 * // 获取商户角色的 User
 * const merchantUser = await getUserFromAccount(payload, accountId, ['merchant_admin', 'merchant_member'])
 */
export async function getUserFromAccount(
  payload: Payload,
  accountId: string | number,
  roles?: string[],
): Promise<User | null> {
  // 构建查询条件
  const where: any = {
    account: {
      equals: accountId,
    },
  }

  // 如果提供了角色过滤，添加到查询条件
  if (roles && roles.length > 0) {
    where.role = {
      in: roles,
    }
  }

  // 查询与该 Account 关联的 User（按创建时间排序）
  const result = await payload.find({
    collection: 'users',
    where,
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

/**
 * 获取 Account 的 Merchant ID
 * - 检查 Account 是否拥有指定的商户角色
 * - 返回关联的 Merchant ID
 * - 如果 roles 为空数组，自动使用所有商户角色 ['merchant_admin', 'merchant_member']
 * - 如果没有匹配的角色或没有关联商户，返回 null
 *
 * @param payload - Payload 实例
 * @param accountId - Account ID
 * @param roles - 角色数组，为空时自动使用商户角色
 * @returns Merchant ID 或 null
 *
 * @example
 * // 检查特定角色
 * const merchantId = await getAccountMerchantId(payload, accountId, ['merchant_admin'])
 *
 * @example
 * // 检查所有商户角色
 * const merchantId = await getAccountMerchantId(payload, accountId, [])
 */
export async function getAccountMerchantId(
  payload: Payload,
  accountId: string | number,
  roles: string[] = [],
): Promise<number | string | null> {
  // 空数组自动补全为所有商户角色
  const merchantRoles = ['merchant_admin', 'merchant_member']
  const rolesToCheck = roles.length === 0 ? merchantRoles : roles

  const result = await payload.find({
    collection: 'users',
    where: {
      account: {
        equals: accountId,
      },
      role: {
        in: rolesToCheck,
      },
    },
    limit: 1,
    depth: 0,
  })

  if (result.totalDocs === 0) {
    return null
  }

  const user = result.docs[0] as User

  // 提取 merchant ID（处理 relationship 字段）
  const merchantId =
    typeof user.merchant === 'object' ? user.merchant?.id : user.merchant

  return merchantId || null
}

/**
 * 字段级访问控制：平台角色和商户自己可以查看
 * 用于敏感商户信息（联系方式、结算账户等）
 */
export async function canViewMerchantSensitiveField({ req: { user, payload } }: any): Promise<boolean> {
  if (!user) return false
  // 平台角色可以查看
  if (await accountHasRole(payload, user.id, ['platform_admin', 'platform_operator'])) {
    return true
  }
  // 商户角色可以查看自己的信息
  const merchantId = await getAccountMerchantId(payload, user.id, [])
  return !!merchantId
}

/**
 * 字段级访问控制：只有平台角色可以查看
 * 用于平台内部信息（邀请码、审核记录、内部备注等）
 */
export async function canViewPlatformOnlyField({ req: { user, payload } }: any): Promise<boolean> {
  if (!user) return false
  return await accountHasRole(payload, user.id, ['platform_admin', 'platform_operator'])
}
