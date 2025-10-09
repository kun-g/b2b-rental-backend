import type { CollectionConfig } from 'payload'

/**
 * CreditInvitations Collection - 授信邀请码
 * 商户创建邀请码，用户使用邀请码申请授信
 * 业务流程：
 * 1. 商户创建邀请码（设置额度、有效期、使用次数）
 * 2. 商户分享邀请码给目标用户（线下/线上）
 * 3. 用户在前端输入邀请码申请授信
 * 4. 商户审批申请
 * 5. 系统创建授信记录
 */
export const CreditInvitations: CollectionConfig = {
  slug: 'credit-invitations',
  admin: {
    useAsTitle: 'invitation_code',
    defaultColumns: ['invitation_code', 'merchant', 'credit_limit', 'used_count', 'max_uses', 'status', 'expires_at'],
    group: '授信管理',
  },
  access: {
    // 商户可见自己的，平台可见所有
    read: ({ req: { user } }) => {
      if (user?.role === 'platform_admin' || user?.role === 'platform_operator') {
        return true
      }
      if (user?.role === 'merchant_admin' || user?.role === 'merchant_member') {
        const merchantId = typeof user.merchant === 'object' ? user.merchant?.id : user.merchant
        return {
          merchant: {
            equals: merchantId,
          },
        }
      }
      return false
    },
    // 只有商户管理员可以创建
    create: ({ req: { user } }) => {
      return user?.role === 'merchant_admin'
    },
    // 商户可修改自己的，平台可修改所有
    update: ({ req: { user } }) => {
      if (user?.role === 'platform_admin' || user?.role === 'platform_operator') {
        return true
      }
      if (user?.role === 'merchant_admin') {
        const merchantId = typeof user.merchant === 'object' ? user.merchant?.id : user.merchant
        return {
          merchant: {
            equals: merchantId,
          },
        }
      }
      return false
    },
    // 只有商户管理员和平台管理员可以删除
    delete: ({ req: { user } }) => {
      if (user?.role === 'platform_admin') {
        return true
      }
      if (user?.role === 'merchant_admin') {
        const merchantId = typeof user.merchant === 'object' ? user.merchant?.id : user.merchant
        return {
          merchant: {
            equals: merchantId,
          },
        }
      }
      return false
    },
  },
  fields: [
    {
      name: 'merchant',
      type: 'relationship',
      relationTo: 'merchants',
      required: true,
      label: '所属商户',
      admin: {
        description: '该邀请码所属的商户',
      },
    },
    {
      name: 'invitation_code',
      type: 'text',
      required: true,
      unique: true,
      label: '邀请码',
      admin: {
        description: '唯一邀请码，自动生成（8-12位字母数字组合）',
        readOnly: true,
      },
    },
    {
      name: 'credit_limit',
      type: 'number',
      required: true,
      label: '预设授信额度',
      admin: {
        description: '使用此邀请码申请的授信额度（单位：元）',
      },
    },
    {
      name: 'validity_days',
      type: 'number',
      required: true,
      defaultValue: 30,
      label: '有效天数',
      admin: {
        description: '邀请码从创建起的有效天数',
      },
    },
    {
      name: 'max_uses',
      type: 'number',
      label: '最大使用次数',
      admin: {
        description: '留空表示无限次使用',
      },
    },
    {
      name: 'used_count',
      type: 'number',
      defaultValue: 0,
      label: '已使用次数',
      admin: {
        readOnly: true,
        description: '已成功使用该邀请码的次数',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      label: '状态',
      options: [
        { label: '激活', value: 'active' },
        { label: '暂停', value: 'paused' },
        { label: '已过期', value: 'expired' },
      ],
      admin: {
        description: '激活=可使用，暂停=临时停用，过期=自动失效',
      },
    },
    {
      name: 'expires_at',
      type: 'date',
      label: '过期时间',
      admin: {
        description: '自动根据有效天数计算',
        readOnly: true,
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'notes',
      type: 'textarea',
      label: '备注',
      admin: {
        description: '内部备注，如"VIP客户专用"、"展会活动"',
      },
    },
  ],
  hooks: {
    beforeChange: [
      // 生成邀请码和过期时间
      async ({ data, operation }) => {
        if (operation === 'create') {
          // 生成唯一邀请码（格式：CREDIT-随机8位）
          if (!data.invitation_code) {
            const randomStr = Math.random().toString(36).substring(2, 10).toUpperCase()
            data.invitation_code = `CREDIT-${randomStr}`
          }

          // 计算过期时间
          if (data.validity_days) {
            const expiresAt = new Date()
            expiresAt.setDate(expiresAt.getDate() + data.validity_days)
            data.expires_at = expiresAt.toISOString()
          }
        }

        return data
      },
      // 检查是否过期
      async ({ data, operation, originalDoc }) => {
        if (operation === 'update' && originalDoc.expires_at) {
          const now = new Date()
          const expiresAt = new Date(originalDoc.expires_at)
          if (now > expiresAt && data.status !== 'expired') {
            data.status = 'expired'
          }
        }
        return data
      },
    ],
  },
}
