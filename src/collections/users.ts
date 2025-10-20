import type { CollectionConfig, AccessArgs } from 'payload'
import { accountHasRole, getAccountMerchantId } from '../utils/accountUtils'

/**
 * Users Collection - 业务账号（业务身份）
 * 对应 docs/B2B_Collections_WithDesc.md 的 Users 设计
 *
 * 设计说明：
 * - Users 是业务身份，不负责登录认证
 * - 通过 account 关联到 Accounts（登录凭证）
 * - 一个 Account 可以有多个 User（不同业务身份）
 * - 决定用户在系统中的权限和可见数据
 *
 * 业务类型：
 * - customer: 租方用户
 * - merchant: 商户用户
 * - platform: 平台用户
 *
 * 访问控制原则：
 * - 只有登录的 Account 可以访问关联的 Users
 * - Platform admin 可以访问所有 Users
 * - 商户 admin 可以访问本商户的所有 Users
 */
export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['account', 'user_type', 'role', 'merchant', 'status', 'updatedAt'],
    group: '账号管理',
  },
  access: {
    // 创建业务身份权限
    create: (async ({ req: { user, payload } }: AccessArgs<any>) => {
      if (!user) return false
      // 检查是否有 platform_admin 角色
      return await accountHasRole(payload, user.id, ['platform_admin'])
    }) as any,

    // 读取业务身份权限
    read: (async ({ req: { user, payload } }: AccessArgs<any>) => {
      if (!user) return false

      // Platform admin 可以查看所有 Users
      if (await accountHasRole(payload, user.id, ['platform_admin', 'platform_operator'])) {
        return true
      }

      // 商户 admin 可以查看本商户的所有 Users
      const merchantId = await getAccountMerchantId(payload, user.id, ['merchant_admin'])
      if (merchantId) {
        return {
          merchant: {
            equals: merchantId,
          },
        }
      }

      // 其他人只能查看与自己 Account 关联的 Users
      return {
        account: {
          equals: user.id,
        },
      }
    }) as any,

    // 更新业务身份权限
    update: (async ({ req: { user, payload } }: AccessArgs<any>) => {
      if (!user) return false

      // Platform admin 可以更新所有 Users
      if (await accountHasRole(payload, user.id, ['platform_admin'])) {
        return true
      }

      // 商户 admin 可以更新本商户的所有 Users
      const merchantId = await getAccountMerchantId(payload, user.id, ['merchant_admin'])
      if (merchantId) {
        return {
          merchant: {
            equals: merchantId,
          },
        }
      }

      // 其他人只能更新与自己 Account 关联的 Users
      return {
        account: {
          equals: user.id,
        },
      }
    }) as any,

    // 删除业务身份权限
    delete: (async ({ req: { user, payload } }: AccessArgs<any>) => {
      if (!user) return false
      // 只有 platform_admin 可以删除业务身份
      return await accountHasRole(payload, user.id, ['platform_admin'])
    }) as any,
  },
  fields: [
    {
      name: 'account',
      type: 'relationship',
      relationTo: 'accounts',
      required: true,
      label: '关联账号',
      admin: {
        description: '关联的登录账号（一个账号可以有多个业务身份）',
      },
    },
    {
      name: 'user_type',
      type: 'select',
      required: true,
      label: '业务类型',
      options: [
        { label: '租方', value: 'customer' },
        { label: '商户', value: 'merchant' },
        { label: '平台', value: 'platform' },
      ],
      admin: {
        description: '决定用户的基本业务类型',
      },
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'customer',
      label: '角色',
      options: [
        { label: '用户（租方）', value: 'customer' },
        { label: '商户成员', value: 'merchant_member' },
        { label: '商户管理员', value: 'merchant_admin' },
        { label: '平台运营', value: 'platform_operator' },
        { label: '平台管理员', value: 'platform_admin' },
        { label: '平台客服', value: 'platform_support' },
      ],
      admin: {
        description: '决定用户在系统中的权限，只能由管理员设置',
        // 创建时可编辑，更新时根据权限判断
        readOnly: false,
      },
      access: {
        // 创建时可以设置角色（用于第一个用户）
        create: () => true,
        // 更新时只有平台管理员和平台运营可以修改角色
        update: async ({ req: { user, payload } }) => {
          if (!user) return false
          return await accountHasRole(payload, user.id, ['platform_admin', 'platform_operator'])
        },
        // 读取时所有人可见
        read: () => true,
      },
    },
    {
      name: 'merchant',
      type: 'relationship',
      relationTo: 'merchants',
      label: '所属商户',
      admin: {
        description: '商户类型必填',
        condition: (data) => data.user_type === 'merchant',
      },
      validate: (value: any, { data }: any) => {
        // 商户类型必须填写所属商户
        if (data.user_type === 'merchant' && !value) {
          return '商户类型必须选择所属商户'
        }
        return true
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      label: '状态',
      options: [
        { label: '正常', value: 'active' },
        { label: '已禁用', value: 'disabled' },
      ],
      admin: {
        description: '禁用后该业务身份无法使用',
      },
    },
    {
      name: 'last_login_at',
      type: 'date',
      label: '最近登录时间',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
        readOnly: true,
        description: '该业务身份最后被使用的时间',
      },
    },
    {
      name: 'notes',
      type: 'textarea',
      label: '备注',
      admin: {
        description: '内部备注',
      },
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, operation, req }) => {
        // 创建时验证：同一个 Account 不能有多个同角色的 User
        if (operation === 'create' && data.account && data.role) {
          const accountId = typeof data.account === 'object' ? data.account.id : data.account

          const existing = await req.payload.find({
            collection: 'users',
            where: {
              and: [
                { account: { equals: accountId } },
                { role: { equals: data.role } },
              ],
            },
            limit: 1,
          })

          if (existing.totalDocs > 0) {
            throw new Error(`该账号已经有 ${data.role} 角色的业务身份，不能重复创建`)
          }
        }

        // 自动设置业务类型（根据角色推断）
        if (operation === 'create' && !data.user_type) {
          if (data.role === 'customer') {
            data.user_type = 'customer'
          } else if (data.role === 'merchant_member' || data.role === 'merchant_admin') {
            data.user_type = 'merchant'
          } else {
            data.user_type = 'platform'
          }
        }
        return data
      },
    ],
  },
}
