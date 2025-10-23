# 错误处理指南

本文档说明如何在 B2B 租赁平台后端使用统一的错误处理机制。

## 概述

系统提供了统一的业务错误类 `BusinessError`，用于：
- **前端**: 返回结构化的错误码和用户友好的错误提示
- **后端**: 记录详细的错误日志（包括上下文信息）

## 核心概念

### 错误结构

**前端收到的响应**：
```json
{
  "errors": [
    {
      "message": "{\"code\":\"CREDIT_INVALID_USER_ROLE\",\"message\":\"只能为普通用户（customer）创建授信\"}"
    }
  ]
}
```

前端需要解析 `message` 字段：
```typescript
const error = response.data.errors[0]
const parsed = JSON.parse(error.message)
// parsed = { code: "CREDIT_INVALID_USER_ROLE", message: "只能为普通用户（customer）创建授信" }
```

**后端日志**（包含详细调试信息）：
```
[CREDIT_INVALID_USER_ROLE] 只能为普通用户（customer）创建授信 | 详情: {"actualRole":"platform_admin"}
```

### 设计原则

1. **前端看到的是简洁明确的错误**
   - 错误码: `CREDIT_INVALID_USER_ROLE`
   - 用户提示: `只能为普通用户（customer）创建授信`

2. **后端日志包含完整的调试信息**
   - 包含错误码、用户提示、详细上下文
   - 便于排查问题和审计

3. **安全性**
   - 敏感信息（如用户ID、内部状态）只出现在后端日志
   - 前端不会收到敏感的调试信息

## 使用方法

### 1. 抛出业务错误

在 Payload Collection 的 hooks 中使用 `createError` 快捷函数：

```typescript
import { createError } from '../utils/errors'

// 示例 1: 用户不存在
const targetUser = await req.payload.findByID({
  collection: 'users',
  id: data.user,
})

if (!targetUser) {
  throw createError.userNotFound({ userId: data.user })
}

// 示例 2: 授信角色错误
if (targetUser.role !== 'customer') {
  throw createError.creditInvalidUserRole(targetUser.role)
}

// 示例 3: 角色重复
const existing = await req.payload.find({ ... })
if (existing.totalDocs > 0) {
  throw createError.userRoleDuplicate(data.role, {
    accountId: data.account,
    role: data.role,
  })
}

// 示例 4: 分类循环引用
if (hasCircular) {
  throw createError.categoryCircularReference({
    categoryId: currentId,
    attemptedParentId: parentId,
  })
}
```

### 2. 前端处理错误

前端会收到这样的响应：

```json
{
  "errors": [
    {
      "code": "CREDIT_INVALID_USER_ROLE",
      "message": "只能为普通用户（customer）创建授信"
    }
  ]
}
```

前端可以根据 `code` 判断错误类型，显示 `message` 给用户：

```typescript
try {
  await createCredit(data)
} catch (error) {
  if (error.code === 'CREDIT_INVALID_USER_ROLE') {
    toast.error(error.message)  // 只能为普通用户（customer）创建授信
  }
}
```

## 错误码分类

错误码按业务模块分段：

- **1000-1999**: 通用错误
  - `UNKNOWN_ERROR`: 未知错误
  - `VALIDATION_ERROR`: 验证错误
  - `NOT_FOUND`: 资源不存在
  - `UNAUTHORIZED`: 未授权
  - `FORBIDDEN`: 无权限

- **2000-2999**: 用户相关
  - `USER_NOT_FOUND`: 用户不存在
  - `INVALID_USER_ROLE`: 用户角色不符
  - `USER_ROLE_DUPLICATE`: 角色重复

- **3000-3999**: 授信相关
  - `CREDIT_NOT_FOUND`: 授信记录不存在
  - `CREDIT_INSUFFICIENT`: 授信额度不足
  - `CREDIT_INVALID_USER_ROLE`: 只能为 customer 创建授信
  - `CREDIT_ALREADY_EXISTS`: 授信已存在

- **4000-4999**: 订单相关
  - `ORDER_NOT_FOUND`: 订单不存在
  - `ORDER_INVALID_STATUS`: 订单状态不允许操作
  - `ORDER_CANNOT_CANCEL`: 订单无法取消

- **5000-5999**: 商户相关
  - `MERCHANT_NOT_FOUND`: 商户不存在
  - `MERCHANT_DISABLED`: 商户已禁用

- **6000-6999**: SKU/设备相关
  - `SKU_NOT_FOUND`: SKU不存在
  - `SKU_UNAVAILABLE`: SKU暂时无法租赁
  - `DEVICE_NOT_FOUND`: 设备不存在
  - `DEVICE_UNAVAILABLE`: 设备暂时不可用

- **7000-7999**: 地址相关
  - `ADDRESS_PARSE_FAILED`: 地址解析失败
  - `ADDRESS_INVALID`: 地址信息不完整

- **8000-8999**: 分类相关
  - `CATEGORY_CIRCULAR_REFERENCE`: 分类循环引用
  - `CATEGORY_INVALID_PARENT`: 不能选择自己作为父类目

## 添加新的错误类型

### 步骤 1: 添加错误码

编辑 `src/utils/errors.ts`，在 `BusinessErrorCode` 枚举中添加：

```typescript
export enum BusinessErrorCode {
  // ... 其他错误码

  // 新业务模块 (9000-9999)
  MY_NEW_ERROR = 'MY_NEW_ERROR',
}
```

### 步骤 2: 添加错误消息

在 `ErrorMessages` 对象中添加对应的用户友好提示：

```typescript
export const ErrorMessages = {
  // ... 其他消息

  MY_NEW_ERROR: '这是用户看到的友好提示',

  // 动态消息（带参数）
  MY_DYNAMIC_ERROR: (param: string) => `参数 ${param} 无效`,
}
```

### 步骤 3: 添加快捷函数

在 `createError` 对象中添加快捷创建函数：

```typescript
export const createError = {
  // ... 其他函数

  myNewError: (details?: unknown) =>
    new BusinessError(
      BusinessErrorCode.MY_NEW_ERROR,
      ErrorMessages.MY_NEW_ERROR,
      details
    ),

  myDynamicError: (param: string, details?: unknown) =>
    new BusinessError(
      BusinessErrorCode.MY_DYNAMIC_ERROR,
      ErrorMessages.MY_DYNAMIC_ERROR(param),
      details
    ),
}
```

### 步骤 4: 使用新错误

在 Collection hooks 中使用：

```typescript
import { createError } from '../utils/errors'

if (someCondition) {
  throw createError.myNewError({ contextInfo: 'some value' })
}

if (anotherCondition) {
  throw createError.myDynamicError('invalidParam', { moreContext: 123 })
}
```

## 最佳实践

### 1. 用户友好的错误提示

❌ **不好的消息** (技术术语，用户看不懂):
```typescript
'FK constraint violation on table user_merchant_credit'
'Validation failed: role must be one of [customer, merchant_admin]'
```

✅ **好的消息** (简洁明确):
```typescript
'只能为普通用户（customer）创建授信'
'该账号已存在商户管理员角色，不能重复创建'
'授信额度不足'
```

### 2. 详细的后端日志

❌ **不好的做法** (丢失上下文):
```typescript
throw createError.userNotFound()
```

✅ **好的做法** (包含调试信息):
```typescript
throw createError.userNotFound({
  userId: data.user,
  operation: 'createCredit',
  accountId: req.user?.id,
})
```

### 3. 错误码命名

- 使用 `UPPER_SNAKE_CASE`
- 简洁明确，描述错误类型
- 按业务模块分组

❌ 不好的命名:
```typescript
USER_ERROR_1
CANNOT_DO_THIS_THING
FAIL
```

✅ 好的命名:
```typescript
USER_NOT_FOUND
CREDIT_INSUFFICIENT
ORDER_INVALID_STATUS
```

## 迁移现有代码

### 旧写法

```typescript
if (!targetUser) {
  throw new Error('用户不存在')
}

if (targetUser.role !== 'customer') {
  throw new Error(`只能为 customer 角色的用户创建授信，当前用户角色为: ${targetUser.role}`)
}
```

### 新写法

```typescript
import { createError } from '../utils/errors'

if (!targetUser) {
  throw createError.userNotFound({ userId: data.user })
}

if (targetUser.role !== 'customer') {
  throw createError.creditInvalidUserRole(targetUser.role)
}
```

## 已迁移的模块

- ✅ `UserMerchantCredit` - 授信管理
- ✅ `users` - 用户管理
- ✅ `Categories` - 分类管理

## 待迁移的模块

如需要，可以继续迁移其他模块：
- `Orders` - 订单管理
- `MerchantSKUs` - 商户SKU
- `Devices` - 设备管理
- 自定义 endpoints

## 前端对接示例

### TypeScript 类型定义（建议前端添加）

```typescript
// types/errors.ts
export enum BusinessErrorCode {
  CREDIT_INVALID_USER_ROLE = 'CREDIT_INVALID_USER_ROLE',
  USER_ROLE_DUPLICATE = 'USER_ROLE_DUPLICATE',
  CATEGORY_CIRCULAR_REFERENCE = 'CATEGORY_CIRCULAR_REFERENCE',
  // ... 其他错误码
}

export interface BusinessError {
  code: BusinessErrorCode
  message: string
}

export interface ApiErrorResponse {
  errors: BusinessError[]
}
```

### API 调用错误处理

```typescript
import { toast } from '@/components/ui/toast'
import { BusinessErrorCode } from '@/types/errors'

async function createCredit(data: CreditFormData) {
  try {
    const response = await fetch('/api/user-merchant-credit', {
      method: 'POST',
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const errorData = await response.json()
      const errorMessage = errorData.errors[0]?.message

      if (errorMessage) {
        try {
          // 尝试解析 JSON 格式的错误消息
          const parsed = JSON.parse(errorMessage)

          // 根据错误码显示特定提示
          switch (parsed.code) {
            case BusinessErrorCode.CREDIT_INVALID_USER_ROLE:
              toast.error('只能为普通用户创建授信，请检查用户角色')
              break
            case BusinessErrorCode.USER_ROLE_DUPLICATE:
              toast.error('该用户已存在该角色，不能重复创建')
              break
            default:
              // 默认显示后端返回的消息
              toast.error(parsed.message)
          }
        } catch {
          // 如果不是 JSON 格式，直接显示消息
          toast.error(errorMessage)
        }
      } else {
        toast.error('操作失败，请稍后重试')
      }

      return
    }

    const result = await response.json()
    toast.success('授信创建成功')
    return result
  } catch (err) {
    toast.error('网络错误，请稍后重试')
  }
}
```

## 测试

错误处理已包含单元测试：

```bash
pnpm test:int errors.test.ts
```

测试覆盖：
- ✅ 错误创建
- ✅ JSON 序列化
- ✅ 后端日志格式
- ✅ 快捷函数
- ✅ 错误消息模板

## 总结

统一的错误处理机制带来以下好处：

1. **前端体验提升**: 结构化错误、明确的错误码、用户友好的提示
2. **后端调试便利**: 详细的错误日志、完整的上下文信息
3. **代码一致性**: 统一的错误创建方式、统一的错误码管理
4. **安全性**: 敏感信息只出现在后端日志，不会泄露给前端
5. **可维护性**: 集中管理错误码和消息，易于修改和扩展
