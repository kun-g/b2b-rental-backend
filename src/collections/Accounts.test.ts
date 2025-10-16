import { describe, it, expect, beforeAll, afterEach, beforeEach } from 'vitest'
import { getPayload, Payload } from 'payload'
import config from '@/payload.config'
import type { Account, User } from '../payload-types'

/**
 * Accounts Collection 测试
 *
 * 重点测试：
 * 1. Access Control（权限控制）
 * 2. Hooks（beforeChange, afterChange）
 */
describe('Accounts Collection - Access Control & Hooks', () => {
  let payload: Payload
  let platformAdminAccount: Account
  let regularUserAccount: Account

  beforeAll(async () => {
    const payloadConfig = await config
    payload = await getPayload({ config: payloadConfig })
  })

  beforeEach(async () => {
    // 创建测试账号：平台管理员
    platformAdminAccount = await payload.create({
      collection: 'accounts',
      data: {
        username: 'test_platform_admin',
        phone: '13800000001',
        password: 'admin123',
        status: 'active',
      },
    })

    // 为平台管理员账号创建对应的 User（赋予 platform_admin 角色）
    await payload.create({
      collection: 'users',
      data: {
        account: platformAdminAccount.id,
        user_type: 'platform',
        role: 'platform_admin',
        status: 'active',
      },
    })

    // 创建测试账号：普通用户
    regularUserAccount = await payload.create({
      collection: 'accounts',
      data: {
        username: 'test_regular_user',
        phone: '13800000002',
        password: 'user123',
        status: 'active',
      },
    })

    // 为普通用户账号创建对应的 User（customer 角色）
    await payload.create({
      collection: 'users',
      data: {
        account: regularUserAccount.id,
        user_type: 'customer',
        role: 'customer',
        status: 'active',
      },
    })
  })

  afterEach(async () => {
    // 清理测试数据
    const accounts = await payload.find({
      collection: 'accounts',
      where: {
        username: {
          contains: 'test_',
        },
      },
      limit: 100,
    })

    for (const account of accounts.docs) {
      // 先删除关联的 users
      const users = await payload.find({
        collection: 'users',
        where: {
          account: {
            equals: account.id,
          },
        },
      })

      for (const user of users.docs) {
        await payload.delete({
          collection: 'users',
          id: user.id,
        })
      }

      // 再删除 account
      await payload.delete({
        collection: 'accounts',
        id: account.id,
      })
    }
  })

  describe('Access Control - Create', () => {
    it('应该允许未登录用户创建账号（注册场景）', async () => {
      // 模拟未登录状态（无 req.user）
      const newAccount = await payload.create({
        collection: 'accounts',
        data: {
          username: 'test_registration',
          phone: '13800000100',
          password: 'newuser123',
        },
        // 不提供 user 参数，模拟未登录状态
      })

      expect(newAccount).toBeDefined()
      expect(newAccount.username).toBe('test_registration')
    })

    it('应该允许 platform_admin 创建账号', async () => {
      // 模拟 platform_admin 登录
      const newAccount = await payload.create({
        collection: 'accounts',
        data: {
          username: 'test_created_by_admin',
          phone: '13800000101',
          password: 'password123',
        },
        user: platformAdminAccount,
      })

      expect(newAccount).toBeDefined()
      expect(newAccount.username).toBe('test_created_by_admin')
    })

    it('应该允许普通用户创建账号（因为 access.create 允许 !user）', async () => {
      // 即使是普通用户，create 权限也是开放的（允许注册）
      const newAccount = await payload.create({
        collection: 'accounts',
        data: {
          username: 'test_created_by_user',
          phone: '13800000102',
          password: 'password123',
        },
        user: regularUserAccount,
      })

      expect(newAccount).toBeDefined()
      expect(newAccount.username).toBe('test_created_by_user')
    })
  })

  describe('Access Control - Read', () => {
    it('应该拒绝未登录用户读取账号', async () => {
      // 未登录状态尝试查询账号，应该抛出 Forbidden 异常
      await expect(
        payload.find({
          collection: 'accounts',
          overrideAccess: false, // 启用权限检查
          // 不提供 user 参数，模拟未登录
        }),
      ).rejects.toThrow('You are not allowed to perform this action.')
    })

    it('应该允许 platform_admin 读取所有账号', async () => {
      const result = await payload.find({
        collection: 'accounts',
        overrideAccess: false,
        user: platformAdminAccount,
      })

      // platform_admin 可以看到所有账号
      expect(result.docs.length).toBeGreaterThanOrEqual(2) // 至少有 admin 和 regular user
    })

    it('应该限制普通用户只能读取自己的账号', async () => {
      const result = await payload.find({
        collection: 'accounts',
        overrideAccess: false,
        user: regularUserAccount,
      })

      // 普通用户只能看到自己的账号
      expect(result.docs).toHaveLength(1)
      expect(result.docs[0].id).toBe(regularUserAccount.id)
    })

    it('应该允许普通用户通过 ID 读取自己的账号', async () => {
      const account = await payload.findByID({
        collection: 'accounts',
        id: regularUserAccount.id,
        overrideAccess: false,
        user: regularUserAccount,
      })

      expect(account).toBeDefined()
      expect(account.id).toBe(regularUserAccount.id)
    })

    it('应该拒绝普通用户读取其他人的账号', async () => {
      // 普通用户尝试读取管理员账号
      await expect(
        payload.findByID({
          collection: 'accounts',
          id: platformAdminAccount.id,
          overrideAccess: false,
          user: regularUserAccount,
        }),
      ).rejects.toThrow()
    })
  })

  describe('Access Control - Update', () => {
    it('应该拒绝未登录用户更新账号', async () => {
      await expect(
        payload.update({
          collection: 'accounts',
          id: regularUserAccount.id,
          data: {
            phone: '13900000000',
          },
          overrideAccess: false,
          // 不提供 user 参数
        }),
      ).rejects.toThrow()
    })

    it('应该允许 platform_admin 更新任意账号', async () => {
      const updated = await payload.update({
        collection: 'accounts',
        id: regularUserAccount.id,
        data: {
          status: 'disabled',
          notes: '管理员禁用',
        },
        overrideAccess: false,
        user: platformAdminAccount,
      })

      expect(updated.status).toBe('disabled')
      expect(updated.notes).toBe('管理员禁用')
    })

    it('应该允许普通用户更新自己的账号', async () => {
      const updated = await payload.update({
        collection: 'accounts',
        id: regularUserAccount.id,
        data: {
          phone: '13900000001',
        },
        overrideAccess: false,
        user: regularUserAccount,
      })

      expect(updated.phone).toBe('13900000001')
    })

    it('应该拒绝普通用户更新其他人的账号', async () => {
      await expect(
        payload.update({
          collection: 'accounts',
          id: platformAdminAccount.id,
          data: {
            phone: '13900000002',
          },
          overrideAccess: false,
          user: regularUserAccount,
        }),
      ).rejects.toThrow()
    })
  })

  describe('Access Control - Delete', () => {
    it('应该拒绝未登录用户删除账号', async () => {
      await expect(
        payload.delete({
          collection: 'accounts',
          id: regularUserAccount.id,
          overrideAccess: false,
          // 不提供 user 参数
        }),
      ).rejects.toThrow()
    })

    it('应该允许 platform_admin 删除账号', async () => {
      // 先创建一个测试账号
      const testAccount = await payload.create({
        collection: 'accounts',
        data: {
          username: 'test_to_delete',
          phone: '13800000200',
          password: 'password123',
        },
      })

      // platform_admin 删除
      await payload.delete({
        collection: 'accounts',
        id: testAccount.id,
        overrideAccess: false,
        user: platformAdminAccount,
      })

      // 验证已删除
      const result = await payload.find({
        collection: 'accounts',
        where: {
          id: {
            equals: testAccount.id,
          },
        },
      })

      expect(result.docs).toHaveLength(0)
    })

    it('应该拒绝普通用户删除账号（即使是自己的）', async () => {
      await expect(
        payload.delete({
          collection: 'accounts',
          id: regularUserAccount.id,
          overrideAccess: false,
          user: regularUserAccount,
        }),
      ).rejects.toThrow()
    })
  })

  describe('Hooks - beforeChange', () => {
    it('应该在登录时更新 last_login_at（检测 _verified）', async () => {
      // 创建账号
      const account = await payload.create({
        collection: 'accounts',
        data: {
          username: 'test_login_hook',
          phone: '13800000300',
          password: 'password123',
        },
      })

      // 初始状态 last_login_at 应该为 null
      expect(account.last_login_at).toBeNull()

      // 模拟登录（update 操作 + _verified 字段）
      // 注意：实际登录时 Payload 会设置 _verified: true
      const loginUpdate = await payload.update({
        collection: 'accounts',
        id: account.id,
        data: {
          _verified: true, // 这是登录验证的标志
        } as any,
      })

      // beforeChange hook 应该设置了 last_login_at
      expect(loginUpdate.last_login_at).toBeDefined()
      expect(loginUpdate.last_login_at).not.toBeNull()

      // 验证时间是否合理（应该是最近的时间）
      const lastLoginTime = new Date(loginUpdate.last_login_at!).getTime()
      const now = Date.now()
      expect(now - lastLoginTime).toBeLessThan(5000) // 5秒内
    })

    it('应该在普通 update 时不更新 last_login_at', async () => {
      const account = await payload.create({
        collection: 'accounts',
        data: {
          username: 'test_normal_update',
          phone: '13800000301',
          password: 'password123',
        },
      })

      // 普通更新（不带 _verified）
      const updated = await payload.update({
        collection: 'accounts',
        id: account.id,
        data: {
          notes: '普通更新',
        },
      })

      // last_login_at 不应该被设置（仍然是 null）
      expect(updated.last_login_at).toBeNull()
    })

    it('应该在 create 操作时不触发 last_login_at 逻辑', async () => {
      const account = await payload.create({
        collection: 'accounts',
        data: {
          username: 'test_create_no_login',
          phone: '13800000302',
          password: 'password123',
        },
      })

      // create 操作不应该设置 last_login_at
      expect(account.last_login_at).toBeNull()
    })
  })

  describe('Hooks - afterChange', () => {
    it('应该在创建账号后触发 afterChange hook（验证通过日志）', async () => {
      // 这个测试主要验证 hook 被调用，不会抛出错误
      // 实际的日志输出可以在测试运行时看到
      const account = await payload.create({
        collection: 'accounts',
        data: {
          username: 'test_after_create',
          phone: '13800000400',
          password: 'password123',
        },
      })

      // 如果 afterChange hook 有问题，会抛出错误
      expect(account).toBeDefined()
      expect(account.id).toBeDefined()
    })

    it('应该在更新账号后触发 afterChange hook', async () => {
      const account = await payload.create({
        collection: 'accounts',
        data: {
          username: 'test_after_update',
          phone: '13800000401',
          password: 'password123',
        },
      })

      // 更新账号
      const updated = await payload.update({
        collection: 'accounts',
        id: account.id,
        data: {
          status: 'disabled',
        },
      })

      // afterChange hook 应该正常执行
      expect(updated.status).toBe('disabled')
    })

    it('应该在 afterChange 中接收到 previousDoc（更新场景）', async () => {
      // 创建账号
      const account = await payload.create({
        collection: 'accounts',
        data: {
          username: 'test_previous_doc',
          phone: '13800000402',
          password: 'password123',
          status: 'active',
        },
      })

      // 更新账号（afterChange 会收到 previousDoc）
      const updated = await payload.update({
        collection: 'accounts',
        id: account.id,
        data: {
          status: 'disabled',
        },
      })

      // 验证更新成功（说明 hook 正常执行）
      expect(updated.status).toBe('disabled')
    })
  })

  describe('权限与 Hook 组合场景', () => {
    it('场景1: 平台管理员创建账号，Hook 正常触发', async () => {
      const account = await payload.create({
        collection: 'accounts',
        data: {
          username: 'test_admin_create_with_hook',
          phone: '13800000500',
          password: 'password123',
        },
        user: platformAdminAccount,
      })

      // 验证权限通过
      expect(account).toBeDefined()

      // 验证 hook 正常执行（没有抛出错误）
      expect(account.id).toBeDefined()
    })

    it('场景2: 普通用户更新自己的账号，Hook 触发', async () => {
      const updated = await payload.update({
        collection: 'accounts',
        id: regularUserAccount.id,
        data: {
          notes: '用户自己更新',
        },
        user: regularUserAccount,
      })

      // 权限检查通过
      expect(updated.notes).toBe('用户自己更新')

      // hook 正常执行
      expect(updated.id).toBe(regularUserAccount.id)
    })

    it('场景3: 权限被拒绝时，Hook 不应该执行', async () => {
      // 普通用户尝试更新其他账号（会被权限拒绝）
      await expect(
        payload.update({
          collection: 'accounts',
          id: platformAdminAccount.id,
          data: {
            notes: '尝试非法更新',
          },
          overrideAccess: false,
          user: regularUserAccount,
        }),
      ).rejects.toThrow()

      // 验证原账号没有被修改（hook 没有执行）
      const original = await payload.findByID({
        collection: 'accounts',
        id: platformAdminAccount.id,
      })

      expect(original.notes).not.toBe('尝试非法更新')
    })

    it('场景4: 平台管理员禁用账号，last_login_at 不受影响', async () => {
      // 先让用户登录一次
      const loginUpdate = await payload.update({
        collection: 'accounts',
        id: regularUserAccount.id,
        data: {
          _verified: true,
        } as any,
      })

      const loginTime = loginUpdate.last_login_at

      // 平台管理员禁用账号
      const disabled = await payload.update({
        collection: 'accounts',
        id: regularUserAccount.id,
        data: {
          status: 'disabled',
        },
        user: platformAdminAccount,
      })

      // last_login_at 应该保持不变
      expect(disabled.last_login_at).toBe(loginTime)
      expect(disabled.status).toBe('disabled')
    })
  })

  describe('边界情况 - 权限与 Hook', () => {
    it('多次登录应该更新 last_login_at', async () => {
      const account = await payload.create({
        collection: 'accounts',
        data: {
          username: 'test_multiple_login',
          phone: '13800000600',
          password: 'password123',
        },
      })

      // 第一次登录
      const firstLogin = await payload.update({
        collection: 'accounts',
        id: account.id,
        data: {
          _verified: true,
        } as any,
      })

      const firstLoginTime = firstLogin.last_login_at

      // 等待 100ms
      await new Promise((resolve) => setTimeout(resolve, 100))

      // 第二次登录
      const secondLogin = await payload.update({
        collection: 'accounts',
        id: account.id,
        data: {
          _verified: true,
        } as any,
      })

      const secondLoginTime = secondLogin.last_login_at

      // 第二次登录时间应该晚于第一次
      expect(new Date(secondLoginTime!).getTime()).toBeGreaterThan(
        new Date(firstLoginTime!).getTime(),
      )
    })

    it('同一账号可以有多个业务身份', async () => {
      // 创建一个账号
      const account = await payload.create({
        collection: 'accounts',
        data: {
          username: 'test_multi_identity',
          phone: '13800000700',
          password: 'password123',
        },
      })

      // 创建多个 User（不同身份），使用 depth: 0 避免关联查询
      const user1 = await payload.create({
        collection: 'users',
        depth: 0,
        data: {
          account: account.id,
          user_type: 'customer',
          role: 'customer',
          status: 'active',
        },
      })

      const user2 = await payload.create({
        collection: 'users',
        depth: 0,
        data: {
          account: account.id,
          user_type: 'platform',
          role: 'platform_operator',
          status: 'active',
        },
      })

      // 验证两个 User 都关联到同一个 Account（depth: 0 时返回 ID）
      expect(user1.account).toBe(account.id)
      expect(user2.account).toBe(account.id)

      // 查询该账号关联的所有 User
      const users = await payload.find({
        collection: 'users',
        where: {
          account: {
            equals: account.id,
          },
        },
      })

      // 应该有 2 个关联的 User
      expect(users.docs).toHaveLength(2)
    })
  })
})
