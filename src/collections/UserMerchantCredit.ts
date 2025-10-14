import type { AccessArgs, CollectionConfig } from 'payload'

/**
 * UserMerchantCredit Collection - 授信管理
 * 对应 PRD 4. 授信与可见性 和 7 数据模型 user_merchant_credit
 * 维度：user × merchant
 */
export const UserMerchantCredit: CollectionConfig = {
  slug: 'user-merchant-credit',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['user', 'merchant', 'credit_limit', 'used_credit', 'status', 'updatedAt'],
    group: '授信管理',
  },
  access: {
    read: (({ req: { user } }: AccessArgs<any>) => {
      if (user?.role === 'platform_admin' || user?.role === 'platform_operator') {
        return true
      }
      if (user?.role === 'merchant_admin' || user?.role === 'merchant_member') {
        // 商户只能看到自己发出的授信
        const merchantId = typeof user.merchant === 'object' ? user.merchant?.id : user.merchant
        if (!merchantId) return false
        return {
          merchant: {
            equals: merchantId,
          },
        }
      }
      if (user?.role === 'customer') {
        // 用户只能看到自己的授信
        return {
          user: {
            equals: user.id,
          },
        }
      }
      return false
    }) as any,
    create: ({ req: { user } }) => {
      return user?.role === 'merchant_admin'
    },
    update: (({ req: { user } }: AccessArgs<any>) => {
      if (user?.role === 'platform_admin') {
        return true
      }
      if (user?.role === 'merchant_admin') {
        const merchantId = typeof user.merchant === 'object' ? user.merchant?.id : user.merchant
        if (!merchantId) return false
        return {
          merchant: {
            equals: merchantId,
          },
        }
      }
      return false
    }) as any,
    delete: (({ req: { user } }: AccessArgs<any>) => {
      if (user?.role === 'platform_admin') {
        return true
      }
      if (user?.role === 'merchant_admin') {
        const merchantId = typeof user.merchant === 'object' ? user.merchant?.id : user.merchant
        if (!merchantId) return false
        return {
          merchant: {
            equals: merchantId,
          },
        }
      }
      return false
    }) as any,
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      label: '用户',
      admin: {
        description: '被授信的用户',
      },
    },
    {
      name: 'merchant',
      type: 'relationship',
      relationTo: 'merchants',
      required: true,
      label: '商户',
      admin: {
        description: '授信的商户',
      },
    },
    {
      name: 'credit_limit',
      type: 'number',
      required: true,
      defaultValue: 0,
      min: 0,
      label: '授信额度（元）',
      admin: {
        description: '用户可以冻结的最大金额（按设备价值计算）',
      },
    },
    {
      name: 'used_credit',
      type: 'number',
      defaultValue: 0,
      min: 0,
      label: '已用额度（元）',
      admin: {
        description: '当前已冻结的金额，订单完成后释放',
        readOnly: true,
      },
    },
    {
      name: 'available_credit',
      type: 'number',
      label: '可用额度（元）',
      admin: {
        description: '计算字段：credit_limit - used_credit',
        readOnly: true,
      },
      hooks: {
        beforeChange: [
          async ({ siblingData }) => {
            return (siblingData.credit_limit || 0) - (siblingData.used_credit || 0)
          },
        ],
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      label: '状态',
      options: [
        { label: '启用', value: 'active' },
        { label: '禁用', value: 'disabled' },
        { label: '冻结', value: 'frozen' },
      ],
      admin: {
        description: '禁用后用户无法查看商户SKU和下单',
      },
    },
    {
      name: 'source',
      type: 'select',
      required: true,
      defaultValue: 'manual',
      label: '来源',
      options: [
        { label: '手动创建', value: 'manual' },
        { label: '邀请码', value: 'invitation' },
      ],
      admin: {
        description: '授信记录的创建来源',
        readOnly: true,
      },
    },
    {
      name: 'invitation_usage',
      type: 'relationship',
      relationTo: 'credit-invitation-usages',
      label: '邀请码使用记录',
      admin: {
        description: '通过邀请码创建的授信记录关联的使用记录',
        condition: (data) => data.source === 'invitation',
        readOnly: true,
      },
    },
    {
      name: 'granted_at',
      type: 'date',
      label: '授信时间',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'granted_by',
      type: 'relationship',
      relationTo: 'users',
      label: '授信人',
      admin: {
        description: '商户管理员',
      },
    },
    {
      name: 'revoked_at',
      type: 'date',
      label: '撤销时间',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
        condition: (data) => data.status === 'disabled',
      },
    },
    {
      name: 'revoked_by',
      type: 'relationship',
      relationTo: 'users',
      label: '撤销人',
      admin: {
        condition: (data) => data.status === 'disabled',
      },
    },
    {
      name: 'notes',
      type: 'textarea',
      label: '备注',
      admin: {
        description: '授信原因、调整记录等',
      },
    },
    {
      name: 'credit_history',
      type: 'array',
      label: '额度调整历史',
      admin: {
        readOnly: true,
      },
      fields: [
        {
          name: 'date',
          type: 'date',
          required: true,
          label: '调整时间',
        },
        {
          name: 'old_limit',
          type: 'number',
          required: true,
          label: '原额度',
        },
        {
          name: 'new_limit',
          type: 'number',
          required: true,
          label: '新额度',
        },
        {
          name: 'reason',
          type: 'text',
          label: '调整原因',
        },
        {
          name: 'operator',
          type: 'relationship',
          relationTo: 'users',
          label: '操作人',
        },
      ],
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, req, operation, originalDoc }) => {
        // 记录授信时间和授信人
        if (operation === 'create') {
          data.granted_at = new Date().toISOString()
          data.granted_by = req.user?.id
        }

        // 记录撤销时间和撤销人
        if (operation === 'update' && originalDoc.status !== 'disabled' && data.status === 'disabled') {
          data.revoked_at = new Date().toISOString()
          data.revoked_by = req.user?.id
        }

        // 记录额度调整历史
        if (operation === 'update' && originalDoc.credit_limit !== data.credit_limit) {
          if (!data.credit_history) {
            data.credit_history = []
          }
          data.credit_history.push({
            date: new Date().toISOString(),
            old_limit: originalDoc.credit_limit,
            new_limit: data.credit_limit,
            reason: data.notes || '额度调整',
            operator: req.user?.id,
          })
        }

        return data
      },
    ],
  },
}
