import type { Endpoint } from 'payload'

export const useInvitationCode: Endpoint = {
  path: '/credit-invitations/use',
  method: 'post',
  handler: async (req) => {
    const { invitation_code } = await req.json?.()

    if (!invitation_code) {
      return Response.json({ success: false, message: '请输入邀请码' }, { status: 400 })
    }

    if (!req.user) {
      return Response.json({ success: false, message: '请先登录' }, { status: 401 })
    }

    try {
      const invitations = await req.payload.find({
        collection: 'credit-invitations',
        where: { invitation_code: { equals: invitation_code } },
        limit: 1,
      })

      if (invitations.docs.length === 0) {
        return Response.json({ success: false, message: '邀请码不存在' })
      }

      const invitation = invitations.docs[0]

      if (invitation.status !== 'active') {
        return Response.json({
          success: false,
          message: invitation.status === 'paused' ? '邀请码已暂停' : '邀请码已过期',
        })
      }

      const now = new Date()
      const expiresAt = new Date(invitation.expires_at!)
      if (now > expiresAt) {
        await req.payload.update({
          collection: 'credit-invitations',
          id: invitation.id,
          data: { status: 'expired' },
        })
        return Response.json({ success: false, message: '邀请码已过期' })
      }

      if (invitation.max_uses && (invitation.used_count ?? 0) >= invitation.max_uses) {
        return Response.json({ success: false, message: '邀请码已达使用上限' })
      }

      const existingCredit = await req.payload.find({
        collection: 'user-merchant-credit',
        where: {
          and: [
            { user: { equals: req.user.id } },
            { merchant: { equals: invitation.merchant } },
          ],
        },
        limit: 1,
      })

      if (existingCredit.docs.length > 0) {
        return Response.json({ success: false, message: '您已有该商户的授信，无法重复使用邀请码' })
      }

      const creditRecord = await req.payload.create({
        collection: 'user-merchant-credit',
        data: {
          user: req.user.id,
          merchant: invitation.merchant,
          credit_limit: invitation.credit_limit,
          used_credit: 0,
          available_credit: invitation.credit_limit,
          status: 'active',
          source: 'invitation',
          granted_at: new Date().toISOString(),
        },
      })

      const usageRecord = await req.payload.create({
        collection: 'credit-invitation-usages',
        data: {
          user: req.user.id,
          merchant: invitation.merchant,
          invitation: invitation.id,
          invitation_code: invitation.invitation_code,
          credit_amount: invitation.credit_limit,
          credit_record: creditRecord.id,
          used_at: new Date().toISOString(),
          ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
          user_agent: req.headers.get('user-agent') || 'unknown',
        },
      })

      await req.payload.update({
        collection: 'credit-invitations',
        id: invitation.id,
        data: { used_count: (invitation.used_count || 0) + 1 },
      })

      if (invitation.max_uses && (invitation.used_count ?? 0) + 1 >= invitation.max_uses) {
        await req.payload.update({
          collection: 'credit-invitations',
          id: invitation.id,
          data: { status: 'expired' },
        })
      }

      await req.payload.update({
        collection: 'user-merchant-credit',
        id: creditRecord.id,
        data: { invitation_usage: usageRecord.id },
      })

      const merchantId = typeof invitation.merchant === 'object'
        ? invitation.merchant.id
        : invitation.merchant

      const merchant = await req.payload.findByID({
        collection: 'merchants',
        id: String(merchantId),
      })

      return Response.json({
        success: true,
        message: '授信成功',
        credit: {
          id: creditRecord.id,
          credit_limit: creditRecord.credit_limit,
          merchant: { id: merchant.id, name: merchant.name },
        },
        usage: { id: usageRecord.id, used_at: usageRecord.used_at },
      })
    } catch (error) {
      console.error('使用邀请码失败:', error)
      return Response.json(
        { success: false, message: '使用失败，请稍后重试' },
        { status: 500 },
      )
    }
  },
}
