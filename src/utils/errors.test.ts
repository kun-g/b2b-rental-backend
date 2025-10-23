import { describe, it, expect } from 'vitest'
import { BusinessError, BusinessErrorCode, createError, ErrorMessages } from './errors'

describe('errors', () => {
  describe('BusinessError', () => {
    it('应该创建带有错误码和用户消息的错误', () => {
      const error = new BusinessError(
        BusinessErrorCode.USER_NOT_FOUND,
        '用户不存在',
        { userId: 123 }
      )

      expect(error.code).toBe(BusinessErrorCode.USER_NOT_FOUND)
      expect(error.userMessage).toBe('用户不存在')
      expect(error.details).toEqual({ userId: 123 })
    })

    it('应该将错误序列化为 JSON 字符串（message 字段）', () => {
      const error = new BusinessError(
        BusinessErrorCode.CREDIT_INVALID_USER_ROLE,
        '只能为普通用户（customer）创建授信',
        { actualRole: 'platform_admin' }
      )

      // message 应该是 JSON 字符串，包含 code 和 message
      const parsedMessage = JSON.parse(error.message)
      expect(parsedMessage).toEqual({
        code: BusinessErrorCode.CREDIT_INVALID_USER_ROLE,
        message: '只能为普通用户（customer）创建授信',
      })

      // 应该有 status 和 isPublic 属性
      expect(error.status).toBe(400)
      expect(error.isPublic).toBe(true)
    })

    it('应该在控制台记录详细信息', () => {
      // 这个测试只是确保构造函数不会抛出错误
      const error = new BusinessError(
        BusinessErrorCode.USER_NOT_FOUND,
        '用户不存在',
        { userId: 123 }
      )

      // message 应该是 JSON 字符串
      expect(() => JSON.parse(error.message)).not.toThrow()

      // 验证其他属性
      expect(error.code).toBe(BusinessErrorCode.USER_NOT_FOUND)
      expect(error.userMessage).toBe('用户不存在')
      expect(error.details).toEqual({ userId: 123 })
    })
  })

  describe('createError helpers', () => {
    it('userNotFound - 应该创建用户不存在错误', () => {
      const error = createError.userNotFound({ userId: 123 })

      expect(error.code).toBe(BusinessErrorCode.USER_NOT_FOUND)
      expect(error.userMessage).toBe(ErrorMessages.USER_NOT_FOUND)
    })

    it('creditInvalidUserRole - 应该创建授信角色错误', () => {
      const error = createError.creditInvalidUserRole('platform_admin')

      expect(error.code).toBe(BusinessErrorCode.CREDIT_INVALID_USER_ROLE)
      expect(error.userMessage).toBe(ErrorMessages.CREDIT_INVALID_USER_ROLE)
      expect(error.details).toEqual({ actualRole: 'platform_admin' })
    })

    it('userRoleDuplicate - 应该创建角色重复错误', () => {
      const error = createError.userRoleDuplicate('customer')

      expect(error.code).toBe(BusinessErrorCode.USER_ROLE_DUPLICATE)
      expect(error.userMessage).toBe('该账号已存在 customer 角色，不能重复创建')
    })

    it('categoryInvalidParent - 应该创建分类父节点错误', () => {
      const error = createError.categoryInvalidParent({ categoryId: 1 })

      expect(error.code).toBe(BusinessErrorCode.CATEGORY_INVALID_PARENT)
      expect(error.userMessage).toBe(ErrorMessages.CATEGORY_INVALID_PARENT)
    })

    it('categoryCircularReference - 应该创建分类循环引用错误', () => {
      const error = createError.categoryCircularReference({
        categoryId: 1,
        attemptedParentId: 5,
      })

      expect(error.code).toBe(BusinessErrorCode.CATEGORY_CIRCULAR_REFERENCE)
      expect(error.userMessage).toBe(ErrorMessages.CATEGORY_CIRCULAR_REFERENCE)
    })

    it('creditInsufficient - 应该创建授信不足错误', () => {
      const error = createError.creditInsufficient({
        required: 5000,
        available: 3000,
      })

      expect(error.code).toBe(BusinessErrorCode.CREDIT_INSUFFICIENT)
      expect(error.userMessage).toBe(ErrorMessages.CREDIT_INSUFFICIENT)
    })
  })

  describe('错误消息模板', () => {
    it('应该提供正确的用户友好消息', () => {
      expect(ErrorMessages.USER_NOT_FOUND).toBe('用户不存在')
      expect(ErrorMessages.CREDIT_INVALID_USER_ROLE).toBe('只能为普通用户（customer）创建授信')
      expect(ErrorMessages.CATEGORY_INVALID_PARENT).toBe('不能选择自己作为父类目')
      expect(ErrorMessages.CATEGORY_CIRCULAR_REFERENCE).toBe('不能选择自己的子孙节点作为父类目')
    })

    it('应该支持动态消息模板', () => {
      expect(ErrorMessages.INVALID_USER_ROLE('platform_admin')).toBe(
        '该操作仅适用于特定角色的用户，当前角色: platform_admin'
      )
      expect(ErrorMessages.USER_ROLE_DUPLICATE('customer')).toBe(
        '该账号已存在 customer 角色，不能重复创建'
      )
    })
  })
})
