# 授信额度累加 API 接入文档

## 接口概述

用于创建或累加用户授信额度。如果用户已有授信，新的额度会自动累加到原有额度上。

**接口地址**：`POST /api/user-merchant-credit/create-or-increment`

**认证方式**：需要 JWT Token（商户管理员权限）

---

## 请求参数

### Headers
```
Content-Type: application/json
Authorization: JWT <your-token>
```

### Body 参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| user | number | 是 | 用户ID（必须是 customer 角色） |
| merchant | number | 是 | 商户ID |
| credit_limit | number | 是 | 授信额度（必须 > 0） |
| notes | string | 否 | 备注说明 |

### 请求示例

```json
POST /api/user-merchant-credit/create-or-increment
Content-Type: application/json
Authorization: JWT eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "user": 7,
  "merchant": 1,
  "credit_limit": 5000,
  "notes": "追加授信"
}
```

---

## 响应格式

### 成功响应

**HTTP 状态码**：200

#### 场景1：首次创建授信

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
    "notes": "首次授信",
    "createdAt": "2025-10-23T06:30:00.000Z"
  }
}
```

#### 场景2：累加授信（用户已有授信）

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

**字段说明**：
- `success`: 请求是否成功
- `action`: 操作类型
  - `"created"`: 首次创建授信
  - `"incremented"`: 累加授信额度
- `data`: 授信记录数据
- `message`: 仅在累加时返回，包含详细的额度变化信息

### 错误响应

**HTTP 状态码**：400 / 404 / 500

```json
{
  "success": false,
  "error": "错误描述"
}
```

**常见错误**：

| 错误消息 | 原因 | 解决方案 |
|---------|------|---------|
| 缺少必填字段: user, merchant, credit_limit | 请求参数不完整 | 检查请求体，补全必填字段 |
| 授信额度必须大于 0 | credit_limit ≤ 0 | 传入正数金额 |
| 用户不存在 | user ID 不存在 | 检查用户 ID 是否正确 |
| 只能为普通用户（customer）创建授信，当前角色: merchant_admin | 用户角色错误 | 只能为 customer 角色创建授信 |

---

## 前端集成示例

### JavaScript / TypeScript

```typescript
/**
 * 创建或累加授信
 * @param userId 用户ID
 * @param merchantId 商户ID
 * @param amount 授信额度
 * @param notes 备注（可选）
 * @returns 授信记录或 null
 */
async function createOrIncrementCredit(
  userId: number,
  merchantId: number,
  amount: number,
  notes?: string
) {
  try {
    const response = await fetch('/api/user-merchant-credit/create-or-increment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `JWT ${getToken()}` // 获取当前登录 token
      },
      body: JSON.stringify({
        user: userId,
        merchant: merchantId,
        credit_limit: amount,
        notes
      })
    })

    const result = await response.json()

    if (!result.success) {
      console.error('操作失败:', result.error)
      alert(result.error)
      return null
    }

    // 根据操作类型显示不同提示
    if (result.action === 'created') {
      alert(`授信创建成功！额度: ${result.data.credit_limit}元`)
    } else if (result.action === 'incremented') {
      alert(result.message) // "授信额度已累加：从 10000元 增加到 15000元（新增 5000元）"
    }

    return result.data
  } catch (error) {
    console.error('网络错误:', error)
    alert('网络错误，请稍后重试')
    return null
  }
}

// 使用示例
const credit = await createOrIncrementCredit(7, 1, 5000, '追加授信')
if (credit) {
  console.log('操作成功，当前额度:', credit.credit_limit)
  refreshCreditList() // 刷新授信列表
}
```

### React Hooks

```typescript
import { useState } from 'react'

interface CreditResponse {
  success: boolean
  action?: 'created' | 'incremented'
  data?: any
  message?: string
  error?: string
}

function useCreditManagement() {
  const [loading, setLoading] = useState(false)

  const createOrIncrement = async (
    userId: number,
    merchantId: number,
    amount: number,
    notes?: string
  ): Promise<CreditResponse> => {
    setLoading(true)
    try {
      const response = await fetch('/api/user-merchant-credit/create-or-increment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `JWT ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          user: userId,
          merchant: merchantId,
          credit_limit: amount,
          notes
        })
      })

      const result = await response.json()
      return result
    } catch (error) {
      return {
        success: false,
        error: '网络错误，请稍后重试'
      }
    } finally {
      setLoading(false)
    }
  }

  return { createOrIncrement, loading }
}

// 组件中使用
function CreditManagementPage() {
  const { createOrIncrement, loading } = useCreditManagement()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const result = await createOrIncrement(7, 1, 5000, '追加授信')

    if (!result.success) {
      toast.error(result.error)
      return
    }

    if (result.action === 'created') {
      toast.success(`授信创建成功，额度 ${result.data.credit_limit}元`)
    } else if (result.action === 'incremented') {
      toast.success(result.message)
    }

    // 刷新列表
    refetchCreditList()
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* 表单内容 */}
      <button type="submit" disabled={loading}>
        {loading ? '提交中...' : '提交'}
      </button>
    </form>
  )
}
```

### Axios 示例

```typescript
import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器：自动添加 token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `JWT ${token}`
  }
  return config
})

/**
 * 创建或累加授信
 */
export async function createOrIncrementCredit(
  userId: number,
  merchantId: number,
  amount: number,
  notes?: string
) {
  try {
    const { data } = await api.post('/user-merchant-credit/create-or-increment', {
      user: userId,
      merchant: merchantId,
      credit_limit: amount,
      notes
    })

    return data
  } catch (error: any) {
    throw new Error(error.response?.data?.error || '请求失败')
  }
}

// 使用示例
try {
  const result = await createOrIncrementCredit(7, 1, 5000, '追加授信')

  if (result.action === 'created') {
    message.success(`授信创建成功，额度 ${result.data.credit_limit}元`)
  } else {
    message.success(result.message)
  }
} catch (error) {
  message.error(error.message)
}
```

---

## 响应字段详解

### data 对象字段

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | string/number | 授信记录 ID |
| user | number | 用户 ID |
| merchant | number | 商户 ID |
| credit_limit | number | 授信总额度（元） |
| used_credit | number | 已使用额度（元） |
| available_credit | number | 可用额度（元）= credit_limit - used_credit |
| status | string | 授信状态：active / disabled / frozen |
| notes | string | 备注信息 |
| createdAt | string | 创建时间（ISO 8601 格式） |
| updatedAt | string | 更新时间（ISO 8601 格式） |

---

## 业务逻辑说明

### 1. 累加规则

- **首次调用**：创建新的授信记录
- **再次调用**：如果用户已有授信（同一 user + merchant），自动累加额度

**示例**：
```
第一次：credit_limit = 10000  → 创建，总额度 = 10000
第二次：credit_limit = 5000   → 累加，总额度 = 15000
第三次：credit_limit = 3000   → 累加，总额度 = 18000
```

### 2. 已用额度不受影响

累加授信只增加 `credit_limit`，不改变 `used_credit`：

```
原授信：credit_limit = 10000, used_credit = 3000
累加 5000 后：credit_limit = 15000, used_credit = 3000
可用额度：15000 - 3000 = 12000
```

### 3. 角色限制

只能为 **customer** 角色的用户创建授信。如果传入的 user 是其他角色（如 merchant_admin），会返回错误。

### 4. 历史记录

每次累加操作都会自动记录到授信记录的 `credit_history` 数组中，包含：
- 调整时间
- 原额度
- 新额度
- 调整原因
- 操作人

---

## 测试建议

### 1. 正常流程测试

```javascript
// 1. 首次创建
await createOrIncrementCredit(7, 1, 10000, '首次授信')
// 预期：action = 'created', credit_limit = 10000

// 2. 累加授信
await createOrIncrementCredit(7, 1, 5000, '追加授信')
// 预期：action = 'incremented', credit_limit = 15000, message 包含累加信息

// 3. 再次累加
await createOrIncrementCredit(7, 1, 3000)
// 预期：action = 'incremented', credit_limit = 18000
```

### 2. 边界情况测试

```javascript
// 负数金额
await createOrIncrementCredit(7, 1, -100)
// 预期：返回错误 "授信额度必须大于 0"

// 缺少必填字段
await fetch('/api/user-merchant-credit/create-or-increment', {
  method: 'POST',
  body: JSON.stringify({ user: 7 }) // 缺少 merchant 和 credit_limit
})
// 预期：返回错误 "缺少必填字段"

// 错误的用户角色
await createOrIncrementCredit(999, 1, 5000) // 999 是商户管理员
// 预期：返回错误 "只能为普通用户（customer）创建授信"
```

---

## 常见问题

### Q1: 如何判断是创建还是累加？

**A**: 检查响应中的 `action` 字段：
- `action === 'created'`：首次创建
- `action === 'incremented'`：累加授信

### Q2: 累加授信后，原有的已用额度会清零吗？

**A**: 不会。累加只增加总额度 `credit_limit`，`used_credit` 保持不变。

### Q3: 可以减少授信额度吗？

**A**: 不行。此接口只支持增加额度。如需减少，请使用 `PATCH /api/user-merchant-credit/:id` 直接更新。

### Q4: 如果传入的 notes 为空会怎样？

**A**: 系统会使用默认备注 `"新增授信额度 X元"`。

### Q5: 这个接口需要什么权限？

**A**: 需要商户管理员（merchant_admin）权限。普通用户无法调用此接口。

---

## 相关接口

- `GET /api/user-merchant-credit` - 查询授信列表
- `GET /api/user-merchant-credit/:id` - 查询授信详情
- `PATCH /api/user-merchant-credit/:id` - 更新授信（修改额度、状态等）
- `DELETE /api/user-merchant-credit/:id` - 删除授信

---

## 版本历史

- **v2.0** (2025-10-23): 初始版本，支持创建和累加授信

---

## 技术支持

如有问题，请联系后端开发团队或查看完整技术文档：
- [CREDIT_INCREMENT_FEATURE_V2.md](./CREDIT_INCREMENT_FEATURE_V2.md)
