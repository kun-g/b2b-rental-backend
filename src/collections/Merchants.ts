import type { AccessArgs, CollectionConfig } from 'payload'
import { accountHasRole, getAccountMerchantId } from '../utils/getUserFromAccount'

/**
 * Merchants Collection - 商户管理
 * 对应 PRD 7 数据模型 merchant
 */
export const Merchants: CollectionConfig = {
  slug: 'merchants',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'contact', 'status', 'updatedAt'],
    group: '商户管理',
  },
  access: {
    read: (async ({ req: { user, payload } }: AccessArgs<any>) => {
      if (!user) return false

      // 平台角色可以查看所有商户
      if (await accountHasRole(payload, user.id, ['platform_admin', 'platform_operator'])) {
        return true
      }

      // 商户角色只能查看自己的商户信息
      const merchantId = await getAccountMerchantId(payload, user.id, [])
      if (merchantId) {
        return {
          id: {
            equals: merchantId,
          },
        }
      }

      return false
    }) as any,
    create: (async ({ req: { user, payload } }) => {
      if (!user) return false

      // 只有平台管理员和运营可以创建商户
      return await accountHasRole(payload, user.id, ['platform_admin', 'platform_operator'])
    }) as any,
    update: (async ({ req: { user, payload } }) => {
      if (!user) return false

      // 只有平台管理员和运营可以更新商户
      return await accountHasRole(payload, user.id, ['platform_admin', 'platform_operator'])
    }) as any,
    delete: (async ({ req: { user, payload } }) => {
      if (!user) return false

      // 只有平台管理员可以删除商户
      return await accountHasRole(payload, user.id, ['platform_admin'])
    }) as any,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: '商户名称',
    },
    {
      name: 'contact',
      type: 'group',
      label: '联系信息',
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
          label: '联系人姓名',
        },
        {
          name: 'phone',
          type: 'text',
          required: true,
          label: '联系电话',
        },
        {
          name: 'email',
          type: 'email',
          label: '联系邮箱',
        },
      ],
    },
    {
      name: 'settlement_account',
      type: 'group',
      label: '结算账户',
      admin: {
        description: '用于对账和打款',
      },
      fields: [
        {
          name: 'account_name',
          type: 'text',
          label: '账户名称',
        },
        {
          name: 'account_number',
          type: 'text',
          label: '账号',
        },
        {
          name: 'bank_name',
          type: 'text',
          label: '开户行',
        },
      ],
    },
    {
      name: 'business_license',
      type: 'upload',
      relationTo: 'media',
      label: '营业执照',
      admin: {
        description: '上传营业执照扫描件',
      },
    },
    {
      name: 'address',
      type: 'textarea',
      label: '商户办公地址',
      admin: {
        description: '商户的办公地址',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      label: '状态',
      options: [
        { label: '待审核', value: 'pending' },
        { label: '已通过', value: 'approved' },
        { label: '已拒绝', value: 'rejected' },
        { label: '已禁用', value: 'disabled' },
      ],
    },
    {
      name: 'invitation_code',
      type: 'text',
      label: '邀请码',
      admin: {
        description: '平台生成的唯一邀请码',
        readOnly: true,
      },
    },
    {
      name: 'invited_by',
      type: 'relationship',
      relationTo: 'users',
      label: '邀请人',
      admin: {
        description: '平台运营人员',
      },
    },
    {
      name: 'invited_at',
      type: 'date',
      label: '邀请时间',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'approved_at',
      type: 'date',
      label: '审核通过时间',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'approved_by',
      type: 'relationship',
      relationTo: 'users',
      label: '审核人',
    },
    {
      name: 'rejection_reason',
      type: 'textarea',
      label: '拒绝原因',
      admin: {
        condition: (data) => data.status === 'rejected',
      },
    },
    {
      name: 'notes',
      type: 'textarea',
      label: '备注',
      admin: {
        description: '内部备注，商户不可见',
      },
    },
  ],
  hooks: {
    beforeChange: [
      // 生成邀请码
      async ({ data, operation }) => {
        if (operation === 'create' && !data.invitation_code) {
          data.invitation_code = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        }
        return data
      },
    ],
  },
}
