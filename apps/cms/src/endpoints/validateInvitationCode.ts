import type { Endpoint } from 'payload'

/**
 * 验证邀请码有效性
 * POST /api/credit-invitations/validate
 */
export const validateInvitationCode: Endpoint = {
  path: '/credit-invitations/validate',
  method: 'post',
  handler: async (req) => {
    const { invitation_code } = await req.json()

    if (!invitation_code) {
      return Response.json(
        {
          valid: false,
          message: '请输入邀请码',
        },
        { status: 400 },
      )
    }

    try {
      // 查询邀请码
      const invitations = await req.payload.find({
        collection: 'credit-invitations',
        where: {
          invitation_code: {
            equals: invitation_code,
          },
        },
        limit: 1,
      })

      if (invitations.docs.length === 0) {
        return Response.json({
          valid: false,
          message: '邀请码不存在',
        })
      }

      const invitation = invitations.docs[0]

      // 检查状态
      if (invitation.status !== 'active') {
        return Response.json({
          valid: false,
          message: invitation.status === 'paused' ? '邀请码已暂停' : '邀请码已过期',
        })
      }

      // 检查过期时间
      const now = new Date()
      const expiresAt = new Date(invitation.expires_at)
      if (now > expiresAt) {
        // 自动标记为过期
        await req.payload.update({
          collection: 'credit-invitations',
          id: invitation.id,
          data: {
            status: 'expired',
          },
        })
        return Response.json({
          valid: false,
          message: '邀请码已过期',
        })
      }

      // 检查使用次数
      if (invitation.max_uses && invitation.used_count >= invitation.max_uses) {
        return Response.json({
          valid: false,
          message: '邀请码已达使用上限',
        })
      }

      // 检查用户是否已登录
      if (!req.user) {
        return Response.json({
          valid: false,
          message: '请先登录',
        })
      }

      // 检查用户是否已有该商户的授信
      const existingCredit = await req.payload.find({
        collection: 'user-merchant-credit',
        where: {
          and: [
            {
              user: {
                equals: req.user.id,
              },
            },
            {
              merchant: {
                equals: invitation.merchant,
              },
            },
          ],
        },
        limit: 1,
      })

      if (existingCredit.docs.length > 0) {
        return Response.json({
          valid: false,
          message: '您已有该商户的授信，无法重复使用邀请码',
        })
      }

      // 获取商户信息
      const merchant = await req.payload.findByID({
        collection: 'merchants',
        id: invitation.merchant as string,
      })

      return Response.json({
        valid: true,
        message: '邀请码有效',
        invitation: {
          credit_limit: invitation.credit_limit,
          merchant: {
            id: merchant.id,
            name: merchant.name,
          },
        },
      })
    } catch (error) {
      console.error('验证邀请码失败:', error)
      return Response.json(
        {
          valid: false,
          message: '验证失败，请稍后重试',
        },
        { status: 500 },
      )
    }
  },
}
