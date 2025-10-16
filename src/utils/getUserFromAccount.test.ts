import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Payload } from 'payload'
import {
  getUserFromAccount,
  accountHasRole,
  getAccountMerchantId,
} from './getUserFromAccount'
import type { User } from '../payload-types'

describe('getUserFromAccount', () => {
  describe('getUserFromAccount', () => {
    let mockPayload: Payload

    beforeEach(() => {
      mockPayload = {
        find: vi.fn(),
      } as unknown as Payload
    })

    describe('正常路径', () => {
      it('应该返回找到的 User 对象', async () => {
        const mockUser: User = {
          id: 1,
          account: 100,
          user_type: 'platform',
          role: 'platform_admin',
          status: 'active',
          updatedAt: '2024-01-01T00:00:00Z',
          createdAt: '2024-01-01T00:00:00Z',
        }

        vi.mocked(mockPayload.find).mockResolvedValue({
          docs: [mockUser],
          totalDocs: 1,
          limit: 1,
          totalPages: 1,
          page: 1,
          pagingCounter: 1,
          hasPrevPage: false,
          hasNextPage: false,
          prevPage: null,
          nextPage: null,
        })

        const result = await getUserFromAccount(mockPayload, 100)

        expect(result).toEqual(mockUser)
        expect(mockPayload.find).toHaveBeenCalledWith({
          collection: 'users',
          where: {
            account: {
              equals: 100,
            },
          },
          sort: 'createdAt',
          limit: 1,
          depth: 0,
        })
      })

      it('应该支持 string 类型的 accountId', async () => {
        const mockUser: User = {
          id: 1,
          account: '100',
          user_type: 'customer',
          role: 'customer',
          status: 'active',
          updatedAt: '2024-01-01T00:00:00Z',
          createdAt: '2024-01-01T00:00:00Z',
        }

        vi.mocked(mockPayload.find).mockResolvedValue({
          docs: [mockUser],
          totalDocs: 1,
          limit: 1,
          totalPages: 1,
          page: 1,
          pagingCounter: 1,
          hasPrevPage: false,
          hasNextPage: false,
          prevPage: null,
          nextPage: null,
        })

        const result = await getUserFromAccount(mockPayload, '100')

        expect(result).toEqual(mockUser)
        expect(mockPayload.find).toHaveBeenCalledWith({
          collection: 'users',
          where: {
            account: {
              equals: '100',
            },
          },
          sort: 'createdAt',
          limit: 1,
          depth: 0,
        })
      })

      it('应该支持 number 类型的 accountId', async () => {
        const mockUser: User = {
          id: 1,
          account: 100,
          user_type: 'merchant',
          role: 'merchant_admin',
          merchant: 50,
          status: 'active',
          updatedAt: '2024-01-01T00:00:00Z',
          createdAt: '2024-01-01T00:00:00Z',
        }

        vi.mocked(mockPayload.find).mockResolvedValue({
          docs: [mockUser],
          totalDocs: 1,
          limit: 1,
          totalPages: 1,
          page: 1,
          pagingCounter: 1,
          hasPrevPage: false,
          hasNextPage: false,
          prevPage: null,
          nextPage: null,
        })

        const result = await getUserFromAccount(mockPayload, 100)

        expect(result).toEqual(mockUser)
      })
    })

    describe('边界情况', () => {
      it('应该在未找到 User 时返回 null', async () => {
        vi.mocked(mockPayload.find).mockResolvedValue({
          docs: [],
          totalDocs: 0,
          limit: 1,
          totalPages: 0,
          page: 1,
          pagingCounter: 1,
          hasPrevPage: false,
          hasNextPage: false,
          prevPage: null,
          nextPage: null,
        })

        const result = await getUserFromAccount(mockPayload, 999)

        expect(result).toBeNull()
      })

      it('应该在 Account 有多个 Users 时返回最早创建的（验证排序参数）', async () => {
        // 这个测试验证查询参数是否正确，而不是模拟多个结果
        // 因为查询使用了 limit: 1，数据库只会返回一个结果
        const oldestUser: User = {
          id: 1,
          account: 100,
          user_type: 'customer',
          role: 'customer',
          status: 'active',
          updatedAt: '2024-01-01T00:00:00Z',
          createdAt: '2024-01-01T00:00:00Z', // 最早
        }

        vi.mocked(mockPayload.find).mockResolvedValue({
          docs: [oldestUser],
          totalDocs: 1,
          limit: 1,
          totalPages: 1,
          page: 1,
          pagingCounter: 1,
          hasPrevPage: false,
          hasNextPage: false,
          prevPage: null,
          nextPage: null,
        })

        const result = await getUserFromAccount(mockPayload, 100)

        expect(result).toEqual(oldestUser)
        // 验证使用了正确的排序参数
        expect(mockPayload.find).toHaveBeenCalledWith(
          expect.objectContaining({
            sort: 'createdAt',
          }),
        )
      })
    })

    describe('错误处理', () => {
      it('应该让数据库异常传播到调用方', async () => {
        const dbError = new Error('Database connection failed')
        vi.mocked(mockPayload.find).mockRejectedValue(dbError)

        await expect(getUserFromAccount(mockPayload, 100)).rejects.toThrow(
          'Database connection failed',
        )
      })
    })

    describe('查询参数验证', () => {
      it('应该使用正确的查询参数', async () => {
        vi.mocked(mockPayload.find).mockResolvedValue({
          docs: [],
          totalDocs: 0,
          limit: 1,
          totalPages: 0,
          page: 1,
          pagingCounter: 1,
          hasPrevPage: false,
          hasNextPage: false,
          prevPage: null,
          nextPage: null,
        })

        await getUserFromAccount(mockPayload, 123)

        expect(mockPayload.find).toHaveBeenCalledWith({
          collection: 'users',
          where: {
            account: {
              equals: 123,
            },
          },
          sort: 'createdAt', // 确保按创建时间排序
          limit: 1, // 只查询一个
          depth: 0, // 不关联查询
        })
      })
    })

    describe('角色过滤', () => {
      it('应该在不提供 roles 时返回最早创建的 User', async () => {
        const user: User = {
          id: 1,
          account: 100,
          user_type: 'customer',
          role: 'customer',
          status: 'active',
          updatedAt: '2024-01-01T00:00:00Z',
          createdAt: '2024-01-01T00:00:00Z',
        }

        vi.mocked(mockPayload.find).mockResolvedValue({
          docs: [user],
          totalDocs: 1,
          limit: 1,
          totalPages: 1,
          page: 1,
          pagingCounter: 1,
          hasPrevPage: false,
          hasNextPage: false,
          prevPage: null,
          nextPage: null,
        })

        const result = await getUserFromAccount(mockPayload, 100)

        expect(result).toEqual(user)
        expect(mockPayload.find).toHaveBeenCalledWith({
          collection: 'users',
          where: {
            account: {
              equals: 100,
            },
          },
          sort: 'createdAt',
          limit: 1,
          depth: 0,
        })
      })

      it('应该支持单个角色过滤', async () => {
        const customerUser: User = {
          id: 1,
          account: 100,
          user_type: 'customer',
          role: 'customer',
          status: 'active',
          updatedAt: '2024-01-01T00:00:00Z',
          createdAt: '2024-01-01T00:00:00Z',
        }

        vi.mocked(mockPayload.find).mockResolvedValue({
          docs: [customerUser],
          totalDocs: 1,
          limit: 1,
          totalPages: 1,
          page: 1,
          pagingCounter: 1,
          hasPrevPage: false,
          hasNextPage: false,
          prevPage: null,
          nextPage: null,
        })

        const result = await getUserFromAccount(mockPayload, 100, ['customer'])

        expect(result).toEqual(customerUser)
        expect(mockPayload.find).toHaveBeenCalledWith({
          collection: 'users',
          where: {
            account: {
              equals: 100,
            },
            role: {
              in: ['customer'],
            },
          },
          sort: 'createdAt',
          limit: 1,
          depth: 0,
        })
      })

      it('应该支持多个角色过滤', async () => {
        const merchantUser: User = {
          id: 1,
          account: 100,
          user_type: 'merchant',
          role: 'merchant_admin',
          merchant: 50,
          status: 'active',
          updatedAt: '2024-01-01T00:00:00Z',
          createdAt: '2024-01-01T00:00:00Z',
        }

        vi.mocked(mockPayload.find).mockResolvedValue({
          docs: [merchantUser],
          totalDocs: 1,
          limit: 1,
          totalPages: 1,
          page: 1,
          pagingCounter: 1,
          hasPrevPage: false,
          hasNextPage: false,
          prevPage: null,
          nextPage: null,
        })

        const result = await getUserFromAccount(mockPayload, 100, ['merchant_admin', 'merchant_member'])

        expect(result).toEqual(merchantUser)
        expect(mockPayload.find).toHaveBeenCalledWith({
          collection: 'users',
          where: {
            account: {
              equals: 100,
            },
            role: {
              in: ['merchant_admin', 'merchant_member'],
            },
          },
          sort: 'createdAt',
          limit: 1,
          depth: 0,
        })
      })

      it('应该在提供空数组时忽略角色过滤', async () => {
        const user: User = {
          id: 1,
          account: 100,
          user_type: 'platform',
          role: 'platform_admin',
          status: 'active',
          updatedAt: '2024-01-01T00:00:00Z',
          createdAt: '2024-01-01T00:00:00Z',
        }

        vi.mocked(mockPayload.find).mockResolvedValue({
          docs: [user],
          totalDocs: 1,
          limit: 1,
          totalPages: 1,
          page: 1,
          pagingCounter: 1,
          hasPrevPage: false,
          hasNextPage: false,
          prevPage: null,
          nextPage: null,
        })

        const result = await getUserFromAccount(mockPayload, 100, [])

        expect(result).toEqual(user)
        // 空数组不应该添加 role 条件
        expect(mockPayload.find).toHaveBeenCalledWith({
          collection: 'users',
          where: {
            account: {
              equals: 100,
            },
          },
          sort: 'createdAt',
          limit: 1,
          depth: 0,
        })
      })

      it('应该在角色不匹配时返回 null', async () => {
        vi.mocked(mockPayload.find).mockResolvedValue({
          docs: [],
          totalDocs: 0,
          limit: 1,
          totalPages: 0,
          page: 1,
          pagingCounter: 1,
          hasPrevPage: false,
          hasNextPage: false,
          prevPage: null,
          nextPage: null,
        })

        const result = await getUserFromAccount(mockPayload, 100, ['platform_admin'])

        expect(result).toBeNull()
      })
    })
  })

  describe('accountHasRole', () => {
    let mockPayload: Payload

    beforeEach(() => {
      mockPayload = {
        find: vi.fn(),
      } as unknown as Payload
    })

    describe('正常路径', () => {
      it('应该在找到匹配角色时返回 true', async () => {
        vi.mocked(mockPayload.find).mockResolvedValue({
          docs: [
            {
              id: 1,
              account: 100,
              role: 'platform_admin',
            },
          ],
          totalDocs: 1,
          limit: 1,
          totalPages: 1,
          page: 1,
          pagingCounter: 1,
          hasPrevPage: false,
          hasNextPage: false,
          prevPage: null,
          nextPage: null,
        })

        const result = await accountHasRole(mockPayload, 100, ['platform_admin'])

        expect(result).toBe(true)
        expect(mockPayload.find).toHaveBeenCalledWith({
          collection: 'users',
          where: {
            account: {
              equals: 100,
            },
            role: {
              in: ['platform_admin'],
            },
          },
          limit: 1,
          depth: 0,
        })
      })

      it('应该在未找到匹配角色时返回 false', async () => {
        vi.mocked(mockPayload.find).mockResolvedValue({
          docs: [],
          totalDocs: 0,
          limit: 1,
          totalPages: 0,
          page: 1,
          pagingCounter: 1,
          hasPrevPage: false,
          hasNextPage: false,
          prevPage: null,
          nextPage: null,
        })

        const result = await accountHasRole(mockPayload, 100, ['platform_admin'])

        expect(result).toBe(false)
      })

      it('应该支持多角色匹配（任一匹配即返回 true）', async () => {
        vi.mocked(mockPayload.find).mockResolvedValue({
          docs: [
            {
              id: 1,
              account: 100,
              role: 'platform_operator',
            },
          ],
          totalDocs: 1,
          limit: 1,
          totalPages: 1,
          page: 1,
          pagingCounter: 1,
          hasPrevPage: false,
          hasNextPage: false,
          prevPage: null,
          nextPage: null,
        })

        const result = await accountHasRole(mockPayload, 100, [
          'platform_admin',
          'platform_operator',
        ])

        expect(result).toBe(true)
        expect(mockPayload.find).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              role: {
                in: ['platform_admin', 'platform_operator'],
              },
            }),
          }),
        )
      })
    })

    describe('边界情况', () => {
      it('应该在传入空角色数组时返回 false（并打印警告）', async () => {
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

        const result = await accountHasRole(mockPayload, 100, [])

        expect(result).toBe(false)
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          '[accountHasRole] Empty roles array provided, returning false',
        )
        expect(mockPayload.find).not.toHaveBeenCalled() // 不应该查询数据库

        consoleWarnSpy.mockRestore()
      })

      it('应该在 Account 无关联用户时返回 false', async () => {
        vi.mocked(mockPayload.find).mockResolvedValue({
          docs: [],
          totalDocs: 0,
          limit: 1,
          totalPages: 0,
          page: 1,
          pagingCounter: 1,
          hasPrevPage: false,
          hasNextPage: false,
          prevPage: null,
          nextPage: null,
        })

        const result = await accountHasRole(mockPayload, 999, ['customer'])

        expect(result).toBe(false)
      })
    })

    describe('错误处理', () => {
      it('应该让数据库异常传播到调用方', async () => {
        const dbError = new Error('Query timeout')
        vi.mocked(mockPayload.find).mockRejectedValue(dbError)

        await expect(accountHasRole(mockPayload, 100, ['platform_admin'])).rejects.toThrow(
          'Query timeout',
        )
      })
    })

    describe('查询参数验证', () => {
      it('应该使用正确的查询参数', async () => {
        vi.mocked(mockPayload.find).mockResolvedValue({
          docs: [],
          totalDocs: 0,
          limit: 1,
          totalPages: 0,
          page: 1,
          pagingCounter: 1,
          hasPrevPage: false,
          hasNextPage: false,
          prevPage: null,
          nextPage: null,
        })

        await accountHasRole(mockPayload, 123, ['merchant_admin', 'merchant_member'])

        expect(mockPayload.find).toHaveBeenCalledWith({
          collection: 'users',
          where: {
            account: {
              equals: 123,
            },
            role: {
              in: ['merchant_admin', 'merchant_member'],
            },
          },
          limit: 1, // 只需要知道是否存在
          depth: 0, // 不关联查询
        })
      })
    })
  })

  describe('真实场景测试', () => {
    let mockPayload: Payload

    beforeEach(() => {
      mockPayload = {
        find: vi.fn(),
      } as unknown as Payload
    })

    it('场景1: 平台管理员登录后检查权限', async () => {
      const adminUser: User = {
        id: 1,
        account: 100,
        user_type: 'platform',
        role: 'platform_admin',
        status: 'active',
        updatedAt: '2024-01-01T00:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
      }

      // 第一次调用：getUserFromAccount
      vi.mocked(mockPayload.find).mockResolvedValueOnce({
        docs: [adminUser],
        totalDocs: 1,
        limit: 1,
        totalPages: 1,
        page: 1,
        pagingCounter: 1,
        hasPrevPage: false,
        hasNextPage: false,
        prevPage: null,
        nextPage: null,
      })

      // 第二次调用：accountHasRole
      vi.mocked(mockPayload.find).mockResolvedValueOnce({
        docs: [adminUser],
        totalDocs: 1,
        limit: 1,
        totalPages: 1,
        page: 1,
        pagingCounter: 1,
        hasPrevPage: false,
        hasNextPage: false,
        prevPage: null,
        nextPage: null,
      })

      const user = await getUserFromAccount(mockPayload, 100)
      expect(user?.role).toBe('platform_admin')

      const hasAdminRole = await accountHasRole(mockPayload, 100, ['platform_admin'])
      expect(hasAdminRole).toBe(true)
    })

    it('场景2: 普通用户尝试访问管理员功能被拒绝', async () => {
      vi.mocked(mockPayload.find).mockResolvedValue({
        docs: [],
        totalDocs: 0,
        limit: 1,
        totalPages: 0,
        page: 1,
        pagingCounter: 1,
        hasPrevPage: false,
        hasNextPage: false,
        prevPage: null,
        nextPage: null,
      })

      const hasAdminRole = await accountHasRole(mockPayload, 100, ['platform_admin'])
      expect(hasAdminRole).toBe(false)
    })

    it('场景3: 商户管理员检查权限（多角色匹配）', async () => {
      const merchantAdmin: User = {
        id: 1,
        account: 100,
        user_type: 'merchant',
        role: 'merchant_admin',
        merchant: 50,
        status: 'active',
        updatedAt: '2024-01-01T00:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
      }

      vi.mocked(mockPayload.find).mockResolvedValue({
        docs: [merchantAdmin],
        totalDocs: 1,
        limit: 1,
        totalPages: 1,
        page: 1,
        pagingCounter: 1,
        hasPrevPage: false,
        hasNextPage: false,
        prevPage: null,
        nextPage: null,
      })

      const hasMerchantRole = await accountHasRole(mockPayload, 100, [
        'merchant_admin',
        'merchant_member',
      ])
      expect(hasMerchantRole).toBe(true)
    })

    it('场景4: 新注册用户还没有创建 User', async () => {
      vi.mocked(mockPayload.find).mockResolvedValue({
        docs: [],
        totalDocs: 0,
        limit: 1,
        totalPages: 0,
        page: 1,
        pagingCounter: 1,
        hasPrevPage: false,
        hasNextPage: false,
        prevPage: null,
        nextPage: null,
      })

      const user = await getUserFromAccount(mockPayload, 100)
      expect(user).toBeNull()
    })
  })

  describe('getAccountMerchantId', () => {
    let mockPayload: Payload

    beforeEach(() => {
      mockPayload = {
        find: vi.fn(),
      } as unknown as Payload
    })

    describe('正常路径', () => {
      it('应该返回 merchant ID（number 类型）', async () => {
        const merchantUser: User = {
          id: 1,
          account: 100,
          user_type: 'merchant',
          role: 'merchant_admin',
          merchant: 50, // merchant ID 是 number
          status: 'active',
          updatedAt: '2024-01-01T00:00:00Z',
          createdAt: '2024-01-01T00:00:00Z',
        }

        vi.mocked(mockPayload.find).mockResolvedValue({
          docs: [merchantUser],
          totalDocs: 1,
          limit: 1,
          totalPages: 1,
          page: 1,
          pagingCounter: 1,
          hasPrevPage: false,
          hasNextPage: false,
          prevPage: null,
          nextPage: null,
        })

        const result = await getAccountMerchantId(mockPayload, 100, ['merchant_admin'])

        expect(result).toBe(50)
      })

      it('应该返回 merchant ID（从 object 中提取）', async () => {
        const merchantUser: User = {
          id: 1,
          account: 100,
          user_type: 'merchant',
          role: 'merchant_admin',
          merchant: { id: 50 } as any, // merchant 是 object
          status: 'active',
          updatedAt: '2024-01-01T00:00:00Z',
          createdAt: '2024-01-01T00:00:00Z',
        }

        vi.mocked(mockPayload.find).mockResolvedValue({
          docs: [merchantUser],
          totalDocs: 1,
          limit: 1,
          totalPages: 1,
          page: 1,
          pagingCounter: 1,
          hasPrevPage: false,
          hasNextPage: false,
          prevPage: null,
          nextPage: null,
        })

        const result = await getAccountMerchantId(mockPayload, 100, ['merchant_admin'])

        expect(result).toBe(50)
      })

      it('应该支持多个商户角色', async () => {
        const merchantMember: User = {
          id: 1,
          account: 100,
          user_type: 'merchant',
          role: 'merchant_member',
          merchant: 50,
          status: 'active',
          updatedAt: '2024-01-01T00:00:00Z',
          createdAt: '2024-01-01T00:00:00Z',
        }

        vi.mocked(mockPayload.find).mockResolvedValue({
          docs: [merchantMember],
          totalDocs: 1,
          limit: 1,
          totalPages: 1,
          page: 1,
          pagingCounter: 1,
          hasPrevPage: false,
          hasNextPage: false,
          prevPage: null,
          nextPage: null,
        })

        const result = await getAccountMerchantId(mockPayload, 100, [
          'merchant_admin',
          'merchant_member',
        ])

        expect(result).toBe(50)
        expect(mockPayload.find).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              role: {
                in: ['merchant_admin', 'merchant_member'],
              },
            }),
          }),
        )
      })
    })

    describe('空数组自动补全', () => {
      it('应该在传入空数组时自动使用所有商户角色', async () => {
        const merchantUser: User = {
          id: 1,
          account: 100,
          user_type: 'merchant',
          role: 'merchant_admin',
          merchant: 50,
          status: 'active',
          updatedAt: '2024-01-01T00:00:00Z',
          createdAt: '2024-01-01T00:00:00Z',
        }

        vi.mocked(mockPayload.find).mockResolvedValue({
          docs: [merchantUser],
          totalDocs: 1,
          limit: 1,
          totalPages: 1,
          page: 1,
          pagingCounter: 1,
          hasPrevPage: false,
          hasNextPage: false,
          prevPage: null,
          nextPage: null,
        })

        const result = await getAccountMerchantId(mockPayload, 100, [])

        expect(result).toBe(50)
        expect(mockPayload.find).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              role: {
                in: ['merchant_admin', 'merchant_member'],
              },
            }),
          }),
        )
      })

      it('应该在省略 roles 参数时自动使用所有商户角色', async () => {
        const merchantUser: User = {
          id: 1,
          account: 100,
          user_type: 'merchant',
          role: 'merchant_member',
          merchant: 50,
          status: 'active',
          updatedAt: '2024-01-01T00:00:00Z',
          createdAt: '2024-01-01T00:00:00Z',
        }

        vi.mocked(mockPayload.find).mockResolvedValue({
          docs: [merchantUser],
          totalDocs: 1,
          limit: 1,
          totalPages: 1,
          page: 1,
          pagingCounter: 1,
          hasPrevPage: false,
          hasNextPage: false,
          prevPage: null,
          nextPage: null,
        })

        // 不传 roles 参数
        const result = await getAccountMerchantId(mockPayload, 100)

        expect(result).toBe(50)
        expect(mockPayload.find).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              role: {
                in: ['merchant_admin', 'merchant_member'],
              },
            }),
          }),
        )
      })
    })

    describe('边界情况', () => {
      it('应该在未找到匹配角色时返回 null', async () => {
        vi.mocked(mockPayload.find).mockResolvedValue({
          docs: [],
          totalDocs: 0,
          limit: 1,
          totalPages: 0,
          page: 1,
          pagingCounter: 1,
          hasPrevPage: false,
          hasNextPage: false,
          prevPage: null,
          nextPage: null,
        })

        const result = await getAccountMerchantId(mockPayload, 100, ['merchant_admin'])

        expect(result).toBeNull()
      })

      it('应该在 User 没有 merchant 字段时返回 null', async () => {
        const userWithoutMerchant: User = {
          id: 1,
          account: 100,
          user_type: 'merchant',
          role: 'merchant_admin',
          merchant: null, // 没有 merchant
          status: 'active',
          updatedAt: '2024-01-01T00:00:00Z',
          createdAt: '2024-01-01T00:00:00Z',
        }

        vi.mocked(mockPayload.find).mockResolvedValue({
          docs: [userWithoutMerchant],
          totalDocs: 1,
          limit: 1,
          totalPages: 1,
          page: 1,
          pagingCounter: 1,
          hasPrevPage: false,
          hasNextPage: false,
          prevPage: null,
          nextPage: null,
        })

        const result = await getAccountMerchantId(mockPayload, 100, ['merchant_admin'])

        expect(result).toBeNull()
      })

      it('应该在 Account 是非商户角色时返回 null', async () => {
        vi.mocked(mockPayload.find).mockResolvedValue({
          docs: [],
          totalDocs: 0,
          limit: 1,
          totalPages: 0,
          page: 1,
          pagingCounter: 1,
          hasPrevPage: false,
          hasNextPage: false,
          prevPage: null,
          nextPage: null,
        })

        const result = await getAccountMerchantId(mockPayload, 100, ['customer'])

        expect(result).toBeNull()
      })
    })

    describe('错误处理', () => {
      it('应该让数据库异常传播到调用方', async () => {
        const dbError = new Error('Database connection failed')
        vi.mocked(mockPayload.find).mockRejectedValue(dbError)

        await expect(getAccountMerchantId(mockPayload, 100, ['merchant_admin'])).rejects.toThrow(
          'Database connection failed',
        )
      })
    })

    describe('查询参数验证', () => {
      it('应该使用正确的查询参数', async () => {
        vi.mocked(mockPayload.find).mockResolvedValue({
          docs: [],
          totalDocs: 0,
          limit: 1,
          totalPages: 0,
          page: 1,
          pagingCounter: 1,
          hasPrevPage: false,
          hasNextPage: false,
          prevPage: null,
          nextPage: null,
        })

        await getAccountMerchantId(mockPayload, 123, ['merchant_admin'])

        expect(mockPayload.find).toHaveBeenCalledWith({
          collection: 'users',
          where: {
            account: {
              equals: 123,
            },
            role: {
              in: ['merchant_admin'],
            },
          },
          limit: 1,
          depth: 0,
        })
      })
    })

    describe('真实场景', () => {
      it('场景1: 商户管理员查询权限时获取 merchantId', async () => {
        const merchantAdmin: User = {
          id: 10,
          account: 100,
          user_type: 'merchant',
          role: 'merchant_admin',
          merchant: 50,
          status: 'active',
          updatedAt: '2024-01-01T00:00:00Z',
          createdAt: '2024-01-01T00:00:00Z',
        }

        vi.mocked(mockPayload.find).mockResolvedValue({
          docs: [merchantAdmin],
          totalDocs: 1,
          limit: 1,
          totalPages: 1,
          page: 1,
          pagingCounter: 1,
          hasPrevPage: false,
          hasNextPage: false,
          prevPage: null,
          nextPage: null,
        })

        // 简化的调用（空数组）
        const merchantId = await getAccountMerchantId(mockPayload, 100)

        expect(merchantId).toBe(50)
      })

      it('场景2: 平台管理员没有 merchant，返回 null', async () => {
        vi.mocked(mockPayload.find).mockResolvedValue({
          docs: [],
          totalDocs: 0,
          limit: 1,
          totalPages: 0,
          page: 1,
          pagingCounter: 1,
          hasPrevPage: false,
          hasNextPage: false,
          prevPage: null,
          nextPage: null,
        })

        const merchantId = await getAccountMerchantId(mockPayload, 100, ['merchant_admin'])

        expect(merchantId).toBeNull()
      })
    })
  })
})
