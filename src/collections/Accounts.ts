import type { CollectionConfig } from 'payload'
import { getPrimaryUserFromAccount, accountHasRole } from '../utils/getUserFromAccount'

/**
 * Accounts Collection - 用户账号（登录凭证）
 * 对应 docs/B2B_Collections_WithDesc.md 的 Accounts 设计
 *
 * 设计说明：
 * - Accounts 负责认证（登录）
 * - Users 负责业务身份和权限
 * - 一个 Account 可以有多个 User（不同业务身份）
 *
 * 登录方式：
 * - 手机号 + 密码
 * - 用户名 + 密码
 * - 邮箱 + 密码
 */
export const Accounts: CollectionConfig = {
  slug: 'accounts',
  admin: {
    useAsTitle: 'username',
    defaultColumns: ['username', 'phone', 'email', 'usersDisplay', 'status', 'updatedAt'],
    group: '账号管理',
  },
  access: {
    // 账号管理权限 - platform_admin 可以管理所有账号，其他人只能管理自己的账号
    create: (async ({ req: { user, payload } }) => {
      // 允许注册（无需登录）
      if (!user) return true

      // platform_admin 可以创建账号
      return await accountHasRole(payload, user.id, ['platform_admin'])
    }) as any,
    read: (async ({ req: { user, payload } }) => {
      if (!user) return false

      // 检查是否是 platform_admin
      const primaryUser = await getPrimaryUserFromAccount(payload, user.id)
      if (primaryUser?.role === 'platform_admin') {
        return true // 可以查看所有账号
      }

      // 其他人只能读取自己的账号
      return {
        id: {
          equals: user.id,
        },
      }
    }) as any,
    update: (async ({ req: { user, payload } }) => {
      if (!user) return false

      // 检查是否是 platform_admin
      const primaryUser = await getPrimaryUserFromAccount(payload, user.id)
      if (primaryUser?.role === 'platform_admin') {
        return true // 可以更新所有账号
      }

      // 其他人只能更新自己的账号
      return {
        id: {
          equals: user.id,
        },
      }
    }) as any,
    delete: (async ({ req: { user, payload } }) => {
      if (!user) return false

      // 只有 platform_admin 可以删除账号（实际上应该用软删除）
      return await accountHasRole(payload, user.id, ['platform_admin'])
    }) as any,
  },
  auth: {
    tokenExpiration: 7 * 24 * 60 * 60, // 7天
    verify: false, // MVP阶段可选
    maxLoginAttempts: 5,
    lockTime: 2 * 60 * 60 * 1000, // 2小时锁定
    useAPIKey: false,
    loginWithUsername: {
      allowEmailLogin: true, // 允许邮箱登录
      requireEmail: false, // 邮箱不是必填（可以用手机号）
    },
  },
  fields: [
    // username 字段由 loginWithUsername 自动创建，不需要手动定义
    {
      name: 'usersDisplay',
      type: 'text',
      label: '关联身份',
      virtual: true,
      admin: {
        description: '显示该账号关联的所有业务身份',
        position: 'sidebar',
        readOnly: true,
      },
      hooks: {
        afterRead: [
          async ({ siblingData, req: { payload } }) => {
            // 如果没有关联的 users，返回空
            if (!siblingData.users || !Array.isArray(siblingData.users) || siblingData.users.length === 0) {
              return '无关联身份'
            }

            try {
              // 获取所有关联的 User 详细信息
              const userPromises = siblingData.users.map(async (user: any) => {
                const userId = typeof user === 'object' ? user.id : user
                try {
                  const userDoc = await payload.findByID({
                    collection: 'users',
                    id: userId,
                    depth: 0,
                  })

                  // 角色映射
                  const roleMap: Record<string, string> = {
                    customer: '租方用户',
                    merchant_member: '商户成员',
                    merchant_admin: '商户管理员',
                    platform_operator: '平台运营',
                    platform_admin: '平台管理员',
                    platform_support: '平台客服',
                  }

                  const roleLabel = roleMap[userDoc.role] || userDoc.role
                  return `${roleLabel} - ID: ${userId}`
                } catch (error) {
                  return `未知身份 - ID: ${userId}`
                }
              })

              const userLabels = await Promise.all(userPromises)
              return userLabels.join(', ')
            } catch (error) {
              console.error('获取用户身份失败:', error)
              return '获取失败'
            }
          },
        ],
      },
    },
    {
      name: 'phone',
      type: 'text',
      unique: true,
      label: '手机号',
      admin: {
        description: '用于登录和接收验证码（与邮箱二选一）',
      },
      validate: (value: string, { data }: any) => {
        // phone 和 email 至少填一个
        if (!value && !data.email) {
          return '手机号和邮箱至少填写一个'
        }
        // 手机号格式验证
        if (value && !/^1[3-9]\d{9}$/.test(value)) {
          return '请输入有效的手机号'
        }
        return true
      },
    },
    {
      name: 'email',
      type: 'email',
      unique: true,
      label: '邮箱',
      admin: {
        description: '用于登录和接收通知（与手机号二选一）',
      },
      validate: (value: string, { data }: any) => {
        // phone 和 email 至少填一个
        if (!value && !data.phone) {
          return '手机号和邮箱至少填写一个'
        }
        return true
      },
    },
    {
      name: 'users',
      type: 'relationship',
      relationTo: 'users',
      hasMany: true,
      label: '关联的业务身份',
      admin: {
        description: '该账号关联的所有业务身份（一个账号可以有多个身份）',
        readOnly: true, // 只读，通过 User 创建时自动关联
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      label: '账号状态',
      options: [
        { label: '正常', value: 'active' },
        { label: '已禁用', value: 'disabled' },
      ],
      admin: {
        description: '禁用后无法登录',
      },
    },
    {
      name: 'last_login_at',
      type: 'date',
      label: '最后登录时间',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
        readOnly: true,
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
      async ({ data, operation }) => {
        // 记录登录时间
        if (operation === 'update' && data._verified) {
          data.last_login_at = new Date().toISOString()
        }
        return data
      },
    ],
  },
}
