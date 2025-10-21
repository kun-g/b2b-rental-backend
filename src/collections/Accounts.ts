import type { AccessArgs, CollectionConfig } from 'payload'
import { accountHasRole } from '../utils/accountUtils'

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
    defaultColumns: ['username', 'phone', 'email', 'status', 'updatedAt'],
    group: '账号管理',
  },
  access: {
    // 账号管理权限 - platform_admin 可以管理所有账号，其他人只能管理自己的账号
    create: (async ({ req: { user, payload } }: AccessArgs<any>) => {
      // 允许注册（无需登录）
      if (!user) return true

      // platform_admin 可以创建账号
      return await accountHasRole(payload, user.id, ['platform_admin'])
    }) as any,
    read: (async ({ req: { user, payload } }: AccessArgs<any>) => {
      if (!user) return false

      // 检查是否是 platform_admin
      if (await accountHasRole(payload, user.id, ['platform_admin'])) {
        return true // 可以查看所有账号
      }

      // 其他人只能读取自己的账号
      return {
        id: {
          equals: user.id,
        },
      }
    }) as any,
    update: (async ({ req: { user, payload } }: AccessArgs<any>) => {
      if (!user) return false

      // 检查是否是 platform_admin
      if (await accountHasRole(payload, user.id, ['platform_admin'])) {
        return true // 可以更新所有账号
      }

      // 其他人只能更新自己的账号
      return {
        id: {
          equals: user.id,
        },
      }
    }) as any,
    delete: (async ({ req: { user, payload } }: AccessArgs<any>) => {
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
      name: 'phone',
      type: 'text',
      unique: true,
      label: '手机号',
      admin: {
        description: '用于登录和接收验证码（与邮箱二选一）',
      },
      validate: (value: string | null | undefined, { data }: any) => {
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
      validate: (value: string | null | undefined, { data }: any) => {
        // phone 和 email 至少填一个
        if (!value && !data.phone) {
          return '手机号和邮箱至少填写一个'
        }
        return true
      },
    },
    {
      name: 'users',
      type: 'join',
      collection: 'users',
      on: 'account',
      label: '关联的业务身份',
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
      async ({ data, operation, req }) => {
        // 记录登录时间
        if (operation === 'update' && data._verified) {
          data.last_login_at = new Date().toISOString()
        }

        return data
      },
    ],
    afterLogin: [
      async ({ req, user }) => {
        // 清理过期的和多余的 sessions
        const { payload } = req

        try {
          // 1. 获取当前用户的所有 sessions（从数据库）
          const accountWithSessions = await payload.findByID({
            collection: 'accounts',
            id: user.id,
            depth: 0, // 不需要关联数据
          })

          const sessions = accountWithSessions.sessions || []
          const now = new Date()

          // 2. 过滤出未过期的 sessions
          const activeSessions = sessions.filter((session: any) => {
            const expiresAt = new Date(session.expiresAt)
            return expiresAt > now
          })

          // 3. 如果活跃 sessions 超过 10 个，保留最新的 10 个
          const MAX_ACTIVE_SESSIONS = 10
          if (activeSessions.length > MAX_ACTIVE_SESSIONS) {
            // 按创建时间降序排序
            activeSessions.sort((a: any, b: any) => {
              return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            })

            // 保留最新的 10 个
            const sessionsToKeep = activeSessions.slice(0, MAX_ACTIVE_SESSIONS)
            const sessionIdsToKeep = new Set(sessionsToKeep.map((s: any) => s.id))

            // 删除多余的 sessions（从数据库）
            const sessionsToDelete = sessions.filter((s: any) => !sessionIdsToKeep.has(s.id))

            if (sessionsToDelete.length > 0) {
              // 更新用户，只保留需要的 sessions
              await payload.update({
                collection: 'accounts',
                id: user.id,
                data: {
                  sessions: sessionsToKeep,
                },
              })

              req.payload.logger.info(
                `Cleaned up ${sessionsToDelete.length} sessions for account ${user.id}`,
              )
            }
          } else if (activeSessions.length < sessions.length) {
            // 只有过期的 sessions，没有超过限制
            await payload.update({
              collection: 'accounts',
              id: user.id,
              data: {
                sessions: activeSessions,
              },
            })

            req.payload.logger.info(
              `Cleaned up ${sessions.length - activeSessions.length} expired sessions for account ${user.id}`,
            )
          }
        } catch (error) {
          // 记录错误但不影响登录流程
          req.payload.logger.error(`Error cleaning up sessions for account ${user.id}:`, error)
        }

        return user
      },
    ],
  },
}
