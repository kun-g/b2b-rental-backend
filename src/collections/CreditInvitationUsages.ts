import type { CollectionConfig } from 'payload'

/**
 * CreditInvitationUsages Collection - 邀请码使用记录
 * 记录每次邀请码的使用情况，用于追踪和审计
 * 业务流程：
 * 1. 用户在前端输入邀请码
 * 2. 系统验证邀请码有效性（存在、未过期、未达使用上限、状态为激活）
 * 3. 验证通过后直接创建 UserMerchantCredit 记录
 * 4. 创建使用记录，邀请码 used_count +1
 */
export const CreditInvitationUsages: CollectionConfig = {
  slug: 'credit-invitation-usages',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['user', 'merchant', 'invitation_code', 'credit_amount', 'used_at'],
    group: '授信管理',
    description: '邀请码使用记录，用于追踪和审计',
  },
  access: {
    // 用户可见自己的，商户可见自己商户的，平台可见所有
    read: ({ req: { user } }): any => {
      if (user?.role === 'platform_admin' || user?.role === 'platform_operator') {
        return true
      }
      if (user?.role === 'merchant_admin' || user?.role === 'merchant_member') {
        const merchantId = typeof user.merchant === 'object' ? user.merchant?.id : user.merchant
        if (!merchantId) return false
        return {
          merchant: {
            equals: merchantId,
          },
        }
      }
      if (user?.role === 'customer') {
        return {
          user: {
            equals: user.id,
          },
        }
      }
      return false
    },
    // 只允许系统自动创建（通过 API hooks），不允许手动创建
    create: () => false,
    // 不允许修改和删除，保持审计完整性
    update: () => false,
    delete: ({ req: { user } }) => {
      // 只有平台管理员可以删除（用于清理错误记录）
      return user?.role === 'platform_admin'
    },
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      label: '使用用户',
      admin: {
        description: '使用邀请码的用户',
        readOnly: true,
      },
    },
    {
      name: 'merchant',
      type: 'relationship',
      relationTo: 'merchants',
      required: true,
      label: '商户',
      admin: {
        description: '邀请码所属商户',
        readOnly: true,
      },
    },
    {
      name: 'invitation',
      type: 'relationship',
      relationTo: 'credit-invitations',
      required: true,
      label: '邀请码',
      admin: {
        description: '使用的邀请码记录',
        readOnly: true,
      },
    },
    {
      name: 'invitation_code',
      type: 'text',
      required: true,
      label: '邀请码字符串',
      admin: {
        description: '冗余存储，方便查看',
        readOnly: true,
      },
    },
    {
      name: 'credit_amount',
      type: 'number',
      required: true,
      label: '授信额度',
      admin: {
        description: '本次授信的额度（元）',
        readOnly: true,
      },
    },
    {
      name: 'credit_record',
      type: 'relationship',
      relationTo: 'user-merchant-credit',
      label: '授信记录',
      admin: {
        description: '创建的授信记录',
        readOnly: true,
      },
    },
    {
      name: 'used_at',
      type: 'date',
      required: true,
      label: '使用时间',
      admin: {
        readOnly: true,
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'ip_address',
      type: 'text',
      label: 'IP地址',
      admin: {
        description: '用户使用邀请码时的IP地址，用于风控',
        readOnly: true,
      },
    },
    {
      name: 'user_agent',
      type: 'text',
      label: 'User Agent',
      admin: {
        description: '用户使用邀请码时的浏览器信息',
        readOnly: true,
      },
    },
  ],
}
