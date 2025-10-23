import type { CollectionConfig } from 'payload'

/**
 * 创建或累加授信额度
 * POST /api/user-merchant-credit/create-or-increment
 *
 * 请求体:
 * {
 *   user: number,        // 用户 ID
 *   merchant: number,    // 商户 ID
 *   credit_limit: number, // 授信额度（如果已存在，会累加到原有额度）
 *   notes?: string       // 备注
 * }
 *
 * 响应:
 * {
 *   success: true,
 *   action: 'created' | 'incremented',
 *   data: UserMerchantCredit,
 *   message?: string  // 仅在 incremented 时返回
 * }
 */
export const createOrIncrementCreditHandler: CollectionConfig['endpoints'][0]['handler'] = async (req) => {
  try {
    const { user: userId, merchant: merchantId, credit_limit, notes } = req.body

    // 验证必填字段
    if (!userId || !merchantId || !credit_limit) {
      return Response.json(
        {
          success: false,
          error: '缺少必填字段: user, merchant, credit_limit',
        },
        { status: 400 }
      )
    }

    // 验证 credit_limit 是正数
    if (credit_limit <= 0) {
      return Response.json(
        {
          success: false,
          error: '授信额度必须大于 0',
        },
        { status: 400 }
      )
    }

    // 验证用户角色必须是 customer
    const targetUser = await req.payload.findByID({
      collection: 'users',
      id: userId,
    })

    if (!targetUser) {
      return Response.json(
        {
          success: false,
          error: '用户不存在',
        },
        { status: 404 }
      )
    }

    if (targetUser.role !== 'customer') {
      return Response.json(
        {
          success: false,
          error: `只能为普通用户（customer）创建授信，当前角色: ${targetUser.role}`,
        },
        { status: 400 }
      )
    }

    // 查询是否已存在授信记录
    const existingCredits = await req.payload.find({
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

    // 如果已存在授信，累加额度
    if (existingCredits.docs.length > 0) {
      const existingCredit = existingCredits.docs[0]
      const oldLimit = existingCredit.credit_limit || 0
      const newLimit = oldLimit + credit_limit

      // 更新已有授信记录
      const updatedCredit = await req.payload.update({
        collection: 'user-merchant-credit',
        id: existingCredit.id,
        data: {
          credit_limit: newLimit,
          notes: notes || `新增授信额度 ${credit_limit}元`,
        },
      })

      return Response.json({
        success: true,
        action: 'incremented',
        data: updatedCredit,
        message: `授信额度已累加：从 ${oldLimit}元 增加到 ${newLimit}元（新增 ${credit_limit}元）`,
      })
    }

    // 不存在授信，创建新记录
    const newCredit = await req.payload.create({
      collection: 'user-merchant-credit',
      data: {
        user: userId,
        merchant: merchantId,
        credit_limit: credit_limit,
        status: 'active',
        notes: notes,
      },
    })

    return Response.json({
      success: true,
      action: 'created',
      data: newCredit,
    })
  } catch (error: any) {
    console.error('创建或累加授信失败:', error)
    console.error('错误详情:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    })
    return Response.json(
      {
        success: false,
        error: error.message || '服务器内部错误',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}
