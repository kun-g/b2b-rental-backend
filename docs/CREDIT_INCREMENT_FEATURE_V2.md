# 授信额度累加功能 V2.0

## 功能说明

当商户为已有授信的用户添加授信时，系统会**自动累加**新的额度到原有授信记录上，而不是报错或创建新记录。

**V2.0 改进**：使用自定义 API endpoint，返回标准的成功响应，不再使用错误码方式。

## API 接口

### 创建或累加授信

```
POST /api/user-merchant-credit/create-or-increment
```

**请求体**：
```json
{
  "user": 7,              // 用户 ID（必填）
  "merchant": 1,          // 商户 ID（必填）
  "credit_limit": 5000,   // 授信额度（必填，必须 > 0）
  "notes": "追加授信"     // 备注（可选）
}
```

**响应格式**：

#### 首次创建（成功）

```json
{
  "success": true,
  "action": "created",
  "data": {
    "id": "123",
    "user": 7,
    "merchant": 1,
    "credit_limit": 10000,
    "used_credit": 0,
    "available_credit": 10000,
    "status": "active",
    "notes": "首次创建",
    "createdAt": "2025-10-23T06:30:00.000Z"
  }
}
```

#### 累加授信（成功）

```json
{
  "success": true,
  "action": "incremented",
  "data": {
    "id": "123",
    "user": 7,
    "merchant": 1,
    "credit_limit": 15000,
    "used_credit": 0,
    "available_credit": 15000,
    "status": "active",
    "notes": "追加授信",
    "updatedAt": "2025-10-23T06:35:00.000Z"
  },
  "message": "授信额度已累加：从 10000元 增加到 15000元（新增 5000元）"
}
```

#### 错误响应

```json
{
  "success": false,
  "error": "缺少必填字段: user, merchant, credit_limit"
}
```

## 使用示例

### 场景1：首次创建授信

```typescript
const response = await fetch('/api/user-merchant-credit/create-or-increment', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    user: 7,
    merchant: 1,
    credit_limit: 10000,
    notes: '首次授信'
  })
})

const result = await response.json()
// {
//   success: true,
//   action: 'created',
//   data: { ... },
// }
```

### 场景2：累加授信

```typescript
const response = await fetch('/api/user-merchant-credit/create-or-increment', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    user: 7,        // 同一个用户
    merchant: 1,    // 同一个商户
    credit_limit: 5000,
    notes: '追加授信'
  })
})

const result = await response.json()
// {
//   success: true,
//   action: 'incremented',  // ← 注意这里是 incremented
//   data: { credit_limit: 15000, ... },
//   message: "授信额度已累加：从 10000元 增加到 15000元（新增 5000元）"
// }
```

## 前端集成指南

### 统一处理逻辑

```typescript
async function createOrIncrementCredit(userId: number, merchantId: number, amount: number, notes?: string) {
  try {
    const response = await fetch('/api/user-merchant-credit/create-or-increment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user: userId,
        merchant: merchantId,
        credit_limit: amount,
        notes
      })
    })

    const result = await response.json()

    if (!result.success) {
      showError(result.error)
      return null
    }

    // 根据 action 显示不同的成功消息
    if (result.action === 'created') {
      showSuccess(`授信创建成功，额度 ${result.data.credit_limit}元`)
    } else if (result.action === 'incremented') {
      showSuccess(result.message)  // "授信额度已累加：从 X元 增加到 Y元"
    }

    // 刷新列表
    refreshCreditList()

    return result.data
  } catch (error) {
    showError('网络错误，请稍后重试')
    return null
  }
}
```

### React Hook 示例

```typescript
function useCreditManagement() {
  const createOrIncrement = async (
    userId: number,
    merchantId: number,
    amount: number,
    notes?: string
  ) => {
    const response = await fetch('/api/user-merchant-credit/create-or-increment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: userId, merchant: merchantId, credit_limit: amount, notes })
    })

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.error)
    }

    return {
      isIncremented: result.action === 'incremented',
      data: result.data,
      message: result.message
    }
  }

  return { createOrIncrement }
}

// 使用
const { createOrIncrement } = useCreditManagement()

try {
  const { isIncremented, data, message } = await createOrIncrement(7, 1, 5000, '追加授信')

  if (isIncremented) {
    toast.success(message)  // "授信额度已累加..."
  } else {
    toast.success(`授信创建成功，额度 ${data.credit_limit}元`)
  }
} catch (error) {
  toast.error(error.message)
}
```

## 业务规则

1. **用户角色验证**：只能为 `customer` 角色的用户创建授信
2. **额度验证**：`credit_limit` 必须大于 0
3. **唯一性**：同一 `user + merchant` 组合只能有一条授信记录
4. **自动累加**：如果记录已存在，新的 `credit_limit` 会累加到原有额度上
5. **历史记录**：每次累加都会自动记录到 `credit_history` 数组
6. **已用额度不变**：累加授信只增加 `credit_limit`，不影响 `used_credit`

## 技术实现

### 实现位置

- **Endpoint**: `src/endpoints/createOrIncrementCredit.ts`
- **注册位置**: `src/collections/UserMerchantCredit.ts` 的 `endpoints` 数组

### 核心逻辑

```typescript
// 1. 验证参数
if (!userId || !merchantId || !credit_limit) {
  return res.status(400).json({ success: false, error: '缺少必填字段' })
}

// 2. 验证用户角色
const targetUser = await req.payload.findByID({ collection: 'users', id: userId })
if (targetUser.role !== 'customer') {
  return res.status(400).json({ success: false, error: '只能为普通用户创建授信' })
}

// 3. 检查是否已存在授信
const existingCredits = await req.payload.find({
  collection: 'user-merchant-credit',
  where: { and: [{ user: { equals: userId } }, { merchant: { equals: merchantId } }] }
})

// 4. 如果已存在，累加额度
if (existingCredits.docs.length > 0) {
  const oldLimit = existingCredits.docs[0].credit_limit
  const newLimit = oldLimit + credit_limit

  const updated = await req.payload.update({
    collection: 'user-merchant-credit',
    id: existingCredits.docs[0].id,
    data: { credit_limit: newLimit, notes }
  })

  return res.status(200).json({
    success: true,
    action: 'incremented',
    data: updated,
    message: `授信额度已累加：从 ${oldLimit}元 增加到 ${newLimit}元（新增 ${credit_limit}元）`
  })
}

// 5. 不存在，创建新记录
const created = await req.payload.create({
  collection: 'user-merchant-credit',
  data: { user: userId, merchant: merchantId, credit_limit, status: 'active', notes }
})

return res.status(200).json({
  success: true,
  action: 'created',
  data: created
})
```

## 测试覆盖

测试文件：`tests/int/CreateOrIncrementCredit.spec.ts`

- ✅ 首次调用应该创建新授信
- ✅ 再次调用应该累加授信额度
- ✅ 第三次调用应该继续累加
- ✅ 应该验证必填字段
- ✅ 应该验证授信额度必须大于0

## 与 V1.0 的区别

| 特性 | V1.0（错误码方案） | V2.0（自定义 endpoint） |
|------|-------------------|------------------------|
| 响应格式 | 错误响应（400）+ 错误码 | 成功响应（200）+ action 字段 |
| 前端处理 | 需要检查错误码 `[CREDIT_INCREMENTED]` | 直接检查 `action === 'incremented'` |
| 代码复杂度 | 较复杂（hook + 错误码） | 简单（纯 endpoint） |
| 语义清晰度 | 混淆（成功用错误表示） | 清晰（成功就是成功） |
| 推荐使用 | ❌ 不推荐 | ✅ **推荐** |

**迁移建议**：
- 前端应该迁移到使用新的 `/create-or-increment` endpoint
- 旧的 POST `/api/user-merchant-credit` 仍然可用（不会自动累加，会报错）
- 新 endpoint 更符合 RESTful 设计原则

## 常见问题

### Q: 为什么不在原有的 POST /api/user-merchant-credit 接口上实现？

A: Payload CMS 的 Collection hooks 中，要阻止创建操作并返回自定义数据，只能抛出错误。使用自定义 endpoint 可以完全控制响应格式，更符合 REST API 设计规范。

### Q: 前端如何知道是创建还是累加？

A: 检查响应中的 `action` 字段：
- `action === 'created'`：首次创建
- `action === 'incremented'`：累加授信

### Q: 旧的 POST /api/user-merchant-credit 还能用吗？

A: 可以，但不会自动累加。如果用户已有授信，会返回验证错误（未来可能会添加唯一性约束）。

## 版本历史

- **v2.0** (2025-10-23): 使用自定义 endpoint，返回标准成功响应
- **v1.1** (2025-10-23): 添加 `CREDIT_INCREMENTED` 错误码
- **v1.0** (2025-10-23): 初始实现，使用错误码方式
