import type { Payload } from 'payload'
import { APIError } from 'payload'

/**
 * 冻结授信额度
 * @param payload Payload实例
 * @param userId 用户ID
 * @param merchantId 商户ID
 * @param amount 冻结金额
 * @throws 如果授信不存在、不可用或额度不足
 */
export async function freezeCredit(
  payload: Payload,
  userId: string | number,
  merchantId: string | number,
  amount: number,
): Promise<void> {
  // 查询授信记录
  const creditRecords = await payload.find({
    collection: 'user-merchant-credit',
    where: {
      and: [
        {
          user: {
            equals: userId,
          },
        },
        {
          merchant: {
            equals: merchantId,
          },
        },
      ],
    },
    limit: 1,
  })

  if (creditRecords.docs.length === 0) {
    throw new APIError('未找到授信记录，无法下单', 400)
  }

  const credit = creditRecords.docs[0]

  // 检查授信状态
  if (credit.status !== 'active') {
    throw new APIError(`授信状态不可用: ${credit.status}`, 400)
  }

  // 检查可用额度
  const availableCredit = (credit.credit_limit || 0) - (credit.used_credit || 0)
  if (availableCredit < amount) {
    throw new APIError(
      `授信额度不足。可用: ${availableCredit}元，需要: ${amount}元`,
      400,
    )
  }

  // 更新已用额度
  await payload.update({
    collection: 'user-merchant-credit',
    id: credit.id,
    data: {
      used_credit: (credit.used_credit || 0) + amount,
    },
  })
}

/**
 * 释放授信额度
 * @param payload Payload实例
 * @param userId 用户ID
 * @param merchantId 商户ID
 * @param amount 释放金额
 */
export async function releaseCredit(
  payload: Payload,
  userId: string | number,
  merchantId: string | number,
  amount: number,
): Promise<void> {
  // 查询授信记录
  const creditRecords = await payload.find({
    collection: 'user-merchant-credit',
    where: {
      and: [
        {
          user: {
            equals: userId,
          },
        },
        {
          merchant: {
            equals: merchantId,
          },
        },
      ],
    },
    limit: 1,
  })

  if (creditRecords.docs.length === 0) {
    // 授信记录不存在，可能已被删除，记录警告但不抛出错误
    console.warn(`授信记录不存在，无法释放额度: userId=${userId}, merchantId=${merchantId}`)
    return
  }

  const credit = creditRecords.docs[0]

  // 更新已用额度（确保不会为负数）
  const newUsedCredit = Math.max(0, (credit.used_credit || 0) - amount)

  await payload.update({
    collection: 'user-merchant-credit',
    id: credit.id,
    data: {
      used_credit: newUsedCredit,
    },
  })
}
