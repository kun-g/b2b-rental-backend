# 授信额度累加功能

## 功能说明

当商户为已有授信的用户重新创建授信时，系统会**自动累加**新的额度到原有授信记录上，而不是报错或创建新记录。

## 使用场景

- 商户为客户追加授信额度
- 批量导入授信时，避免因重复导入导致失败
- 客户信用提升，需要增加授信额度

## 工作流程

### 1. 首次创建授信

```javascript
POST /api/user-merchant-credit
{
  "user": 7,           // 用户ID
  "merchant": 1,       // 商户ID
  "credit_limit": 10000,
  "status": "active"
}

// 响应：成功创建，授信额度 10000元
```

### 2. 再次创建授信（累加）

```javascript
POST /api/user-merchant-credit
{
  "user": 7,           // 同一用户
  "merchant": 1,       // 同一商户
  "credit_limit": 5000,
  "notes": "追加授信"   // 可选：备注
}

// 响应：抛出错误（阻止创建新记录）
// Error: 授信记录已存在，已将额度从 10000元 增加到 15000元（新增 5000元）
```

**结果**：
- 原有授信记录的 `credit_limit` 从 10000 变为 15000
- 自动记录到 `credit_history` 数组
- 如果提供了 `notes`，使用用户的备注；否则使用默认消息 "新增授信额度 5000元"

### 3. 查看授信历史

```javascript
GET /api/user-merchant-credit?where[user][equals]=7&where[merchant][equals]=1

// 响应
{
  "docs": [{
    "id": "...",
    "user": 7,
    "merchant": 1,
    "credit_limit": 15000,
    "used_credit": 0,
    "available_credit": 15000,
    "credit_history": [
      {
        "date": "2025-10-23T02:00:00.000Z",
        "old_limit": 10000,
        "new_limit": 15000,
        "reason": "追加授信",
        "operator": 3
      }
    ]
  }]
}
```

## 技术实现

### 实现位置

`src/collections/UserMerchantCredit.ts` 的 `beforeValidate` hook

### 核心逻辑

1. 在创建授信前，检查是否已存在 `user + merchant` 的授信记录
2. 如果存在：
   - 计算新额度 = 原额度 + 新增额度
   - 调用 `payload.update()` 更新原有记录
   - 记录到 `credit_history` 数组
   - 抛出错误阻止创建新记录（向前端返回友好提示）
3. 如果不存在：继续正常创建流程

### 关键代码

```typescript
// 检查是否已存在授信记录
if (data.merchant) {
  const existingCredits = await req.payload.find({
    collection: 'user-merchant-credit',
    where: {
      and: [
        { user: { equals: data.user } },
        { merchant: { equals: data.merchant } },
      ],
    },
    limit: 1,
  })

  // 如果已存在授信，累加额度
  if (existingCredits.docs.length > 0) {
    const existingCredit = existingCredits.docs[0]
    const oldLimit = existingCredit.credit_limit || 0
    const addAmount = data.credit_limit || 0
    const newLimit = oldLimit + addAmount

    // 更新已有授信记录
    await req.payload.update({
      collection: 'user-merchant-credit',
      id: existingCredit.id,
      data: {
        credit_limit: newLimit,
        notes: data.notes || `新增授信额度 ${addAmount}元`,
      },
    })

    // 抛出错误阻止创建新记录
    throw new Error(
      `授信记录已存在，已将额度从 ${oldLimit}元 增加到 ${newLimit}元（新增 ${addAmount}元）`,
    )
  }
}
```

## 测试覆盖

测试文件：`tests/int/UserMerchantCredit.spec.ts`

- ✅ 首次创建授信应该成功
- ✅ 再次创建授信应该累加到原有额度（有备注）
- ✅ 第三次创建授信应该继续累加（无备注，使用默认消息）
- ✅ 有已用额度时累加授信应该保持已用额度不变

## 注意事项

1. **前端处理**：当收到"授信记录已存在"的错误时，应该作为**成功消息**展示给用户，而不是错误提示

2. **已用额度不受影响**：累加授信只增加 `credit_limit`，不会改变 `used_credit`，因此可用额度会相应增加

3. **权限控制**：只有商户管理员可以创建授信（原有权限规则）

4. **审计日志**：每次累加都会记录到 `credit_history` 数组，包含：
   - 调整时间
   - 原额度
   - 新额度
   - 调整原因（用户备注或默认消息）
   - 操作人

## 前端集成指南

### 错误响应格式

当授信累加成功时，后端会返回一个特殊的业务错误，错误消息格式如下：

```json
{
  "errors": [
    {
      "message": "[CREDIT_INCREMENTED] 授信额度已累加：从 10000元 增加到 15000元（新增 5000元）"
    }
  ]
}
```

**关键点**：
- 错误消息以 `[CREDIT_INCREMENTED]` 开头，这是错误码
- 这个"错误"实际上表示操作成功，只是为了阻止创建重复记录

### 前端处理示例

#### 方案1：根据错误码识别（推荐）

```typescript
try {
  await creditApi.createCredit({
    user: userId,
    merchant: merchantId,
    credit_limit: 5000,
    notes: '追加授信',
  })
  // 首次创建成功
  showSuccess('授信创建成功')
  refreshCreditList()
} catch (error: any) {
  const errorMessage = error.response?.data?.errors?.[0]?.message || error.message

  // 检查是否是授信累加成功
  if (errorMessage.includes('[CREDIT_INCREMENTED]')) {
    // 提取纯消息（去掉错误码）
    const message = errorMessage.replace(/^\[CREDIT_INCREMENTED\]\s*/, '')
    showSuccess(message)  // "授信额度已累加：从 10000元 增加到 15000元（新增 5000元）"
    refreshCreditList()
  } else {
    // 真正的错误
    showError(errorMessage)
  }
}
```

#### 方案2：通用错误处理工具函数

```typescript
// utils/errorHandler.ts
export const BusinessErrorCode = {
  CREDIT_INCREMENTED: 'CREDIT_INCREMENTED',
  // ... 其他错误码
}

export function parseBusinessError(error: any): {
  code: string | null
  message: string
  isSuccess: boolean
} {
  const errorMessage = error.response?.data?.errors?.[0]?.message || error.message

  // 提取错误码 [CODE] message
  const match = errorMessage.match(/^\[(\w+)\]\s*(.*)$/)

  if (match) {
    const code = match[1]
    const message = match[2]

    // CREDIT_INCREMENTED 是成功状态
    const isSuccess = code === BusinessErrorCode.CREDIT_INCREMENTED

    return { code, message, isSuccess }
  }

  return { code: null, message: errorMessage, isSuccess: false }
}

// 使用示例
try {
  await creditApi.createCredit(...)
  showSuccess('授信创建成功')
} catch (error) {
  const { code, message, isSuccess } = parseBusinessError(error)

  if (isSuccess) {
    showSuccess(message)
  } else {
    showError(message)
  }

  refreshCreditList()
}
```

### 响应示例对比

#### 首次创建（成功）

```javascript
// 请求
POST /api/user-merchant-credit
{ user: 7, merchant: 1, credit_limit: 10000 }

// 响应 200 OK
{
  "doc": {
    "id": "123",
    "user": 7,
    "merchant": 1,
    "credit_limit": 10000,
    "used_credit": 0,
    "available_credit": 10000,
    "status": "active"
  }
}
```

#### 累加授信（也是成功，但以错误形式返回）

```javascript
// 请求
POST /api/user-merchant-credit
{ user: 7, merchant: 1, credit_limit: 5000, notes: "追加授信" }

// 响应 400 Bad Request（但实际是成功的）
{
  "errors": [
    {
      "message": "[CREDIT_INCREMENTED] 授信额度已累加：从 10000元 增加到 15000元（新增 5000元）"
    }
  ]
}
```

**前端处理**：检查错误消息中是否包含 `[CREDIT_INCREMENTED]`，如果包含，作为成功消息展示。

## 常见问题

### Q: 为什么授信累加成功要返回错误？

A: 这是一个技术实现的权衡。Payload CMS 的 Collection hooks 在创建记录时，如果要阻止创建并返回自定义数据，必须抛出错误。我们选择了这种方式来：
1. 阻止创建重复的授信记录
2. 同时更新已有记录
3. 向前端返回明确的操作结果

通过在错误消息中添加 `[CREDIT_INCREMENTED]` 错误码，前端可以识别这是一个"成功"的错误。

### Q: 前端如何区分真正的错误和授信累加成功？

A: 检查错误消息是否以 `[CREDIT_INCREMENTED]` 开头：

```typescript
if (error.message.startsWith('[CREDIT_INCREMENTED]')) {
  // 这是成功消息
  showSuccess(error.message)
} else {
  // 这是真正的错误
  showError(error.message)
}
```

### Q: 能否返回 200 成功响应而不是错误？

A: 技术上可行，但需要创建自定义 API endpoint，这会增加代码复杂度。当前方案已经足够简单和可靠。

## 版本历史

- **v1.0** (2025-10-23): 初始实现，支持授信额度累加
- **v1.1** (2025-10-23): 添加 `CREDIT_INCREMENTED` 错误码，便于前端识别
