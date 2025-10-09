# Admin 后台访问控制

## 访问权限

### ✅ 可以访问 Admin 后台的角色

| 角色 | 值 | 说明 |
|------|-----|------|
| **平台管理员** | `platform_admin` | 完全访问权限 |
| **平台运营** | `platform_operator` | 运营管理权限 |
| **平台客服** | `platform_support` | 客服支持权限 |
| **商户管理员** | `merchant_admin` | 管理自己的商户 |
| **商户成员** | `merchant_member` | 商户普通成员 |

### ❌ 无法访问 Admin 后台的角色

| 角色 | 值 | 说明 |
|------|-----|------|
| **用户（租方）** | `customer` | 普通用户，使用前端应用（小程序/H5） |

---

## 工作流程

### 平台端（Admin 后台）

**访问地址**: `http://localhost:3000/admin`

**适用人员**:
- 平台管理员、运营、客服
- 商户管理员、商户成员

**功能**:
- 平台管理（类目、商户审核、SKU审核）
- 商户管理（商品、设备、运费模板）
- 授信管理
- 订单管理
- 对账管理
- 审计日志

### 用户端（前端应用）

**访问地址**: `http://localhost:3000/`（需要自己开发）

**适用人员**:
- 普通用户（customer）

**功能**:
- 浏览授信商户的 SKU
- 下单租赁
- 查看订单状态
- 管理收货地址
- 查看对账单

---

## 测试访问控制

### 1. 创建测试账号

**平台管理员**（可以访问）:
```
Username: admin
Password: Admin123456
Role: platform_admin
```

**普通用户**（无法访问）:
```
Username: customer1
Password: Customer123456
Role: customer
```

### 2. 测试访问

**步骤 1: 以管理员身份登录**
```bash
# 访问 Admin 登录页
http://localhost:3000/admin/login

# 使用 admin 账号登录
# ✅ 应该可以成功进入后台
```

**步骤 2: 以普通用户身份登录**
```bash
# 使用 customer1 账号登录
# ❌ 登录后应该会被重定向或显示无权限
```

### 3. 预期行为

**平台人员登录后**:
- ✅ 可以看到完整的 Admin 菜单
- ✅ 可以访问所有页面（根据 Collection 权限）
- ✅ 可以管理数据

**普通用户登录后**:
- ❌ 无法访问 `/admin` 路径
- ❌ 会看到 "Access Denied" 或被重定向
- ℹ️ 应该引导用户使用前端应用

---

## 自定义访问控制

如果你想修改哪些角色可以访问 Admin，编辑 `payload.config.ts`:

```typescript
// payload.config.ts
admin: {
  access: {
    '/': ({ req }) => {
      const allowedRoles = [
        'platform_admin',      // 平台管理员
        'platform_operator',   // 平台运营
        'platform_support',    // 平台客服
        'merchant_admin',      // 商户管理员
        'merchant_member',     // 商户成员
        // 如果想让 customer 也能访问，取消注释下面这行
        // 'customer',
      ]
      return allowedRoles.includes(req.user?.role)
    },
  },
}
```

### 示例：只允许平台人员访问

```typescript
admin: {
  access: {
    '/': ({ req }) => {
      // 只允许平台人员
      const allowedRoles = [
        'platform_admin',
        'platform_operator',
        'platform_support',
      ]
      return allowedRoles.includes(req.user?.role)
    },
  },
}
```

### 示例：商户也无法访问（只有平台）

如果你想让商户也使用前端应用，不访问 Admin：

```typescript
admin: {
  access: {
    '/': ({ req }) => {
      // 只允许平台人员，商户和用户都用前端
      return req.user?.role?.startsWith('platform_')
    },
  },
}
```

---

## API 访问控制

Admin 访问控制**不影响** API 访问：

- ✅ 所有角色都可以通过 API 访问（根据 Collection 权限）
- ✅ 普通用户仍然可以通过 API 登录、查询、下单
- ✅ 商户可以通过 API 管理商品（如果你要开发商户端应用）

### API 登录示例

```bash
# 普通用户仍然可以通过 API 登录
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "customer1",
    "password": "Customer123456"
  }'

# 返回 Token，可以用于后续 API 调用
{
  "message": "Auth Passed",
  "user": { ... },
  "token": "eyJhbGc..."
}
```

### 使用 Token 调用 API

```bash
# 使用返回的 Token 访问 API
curl -X GET http://localhost:3000/api/merchant-skus \
  -H "Authorization: Bearer eyJhbGc..."

# ✅ 根据 Collection 权限返回数据
```

---

## 开发前端应用

普通用户（customer）应该使用前端应用，而不是 Admin 后台。

### 推荐架构

```
┌─────────────────────────────────────────┐
│         Admin 后台 (Payload CMS)         │
│      http://localhost:3000/admin        │
│                                         │
│  访问者：                                │
│  - 平台管理员、运营、客服                │
│  - 商户管理员、商户成员（可选）           │
│                                         │
│  功能：                                  │
│  - 类目管理、商户审核、SKU审核            │
│  - 商品管理、设备管理、授信管理           │
│  - 订单管理、对账管理                    │
└─────────────────────────────────────────┘
                  ↓
         Payload REST/GraphQL API
                  ↓
┌─────────────────────────────────────────┐
│         用户端前端应用                    │
│      (React/Vue/小程序/H5)              │
│                                         │
│  访问者：                                │
│  - 普通用户 (customer)                   │
│                                         │
│  功能：                                  │
│  - 浏览授信商户的 SKU                     │
│  - 下单租赁                              │
│  - 查看订单状态                          │
│  - 管理收货地址                          │
│  - 查看对账单                            │
└─────────────────────────────────────────┘
```

### 用户端示例页面

```typescript
// pages/SKUList.tsx
import { useEffect, useState } from 'react'

export default function SKUList() {
  const [skus, setSKUs] = useState([])

  useEffect(() => {
    // 调用 API 获取授信商户的 SKU
    fetch('/api/merchant-skus', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
      .then(res => res.json())
      .then(data => setSKUs(data.docs))
  }, [])

  return (
    <div>
      <h1>可租设备</h1>
      {skus.map(sku => (
        <div key={sku.id}>
          <h3>{sku.name}</h3>
          <p>日租金: ¥{sku.daily_fee}</p>
          <button onClick={() => createOrder(sku.id)}>
            立即租赁
          </button>
        </div>
      ))}
    </div>
  )
}
```

---

## 常见问题

### Q1: 普通用户登录后看到空白页？

**原因**: 用户无权访问 Admin 后台，但没有被正确重定向。

**解决**:
1. 方式 1: 在登录后检查角色，如果是 customer 则重定向到用户端
2. 方式 2: 用户使用独立的登录页面（不是 Admin 登录页）
3. 方式 3: 在 Admin 登录页显示友好提示

### Q2: 商户是否应该访问 Admin？

**建议**: 取决于你的产品设计

**选项 A: 商户使用 Admin 后台**（当前配置）
- ✅ 优点: 不需要开发商户端
- ❌ 缺点: Admin UI 可能不够友好

**选项 B: 商户使用独立的商户端**
- ✅ 优点: UI/UX 更好，可以定制
- ❌ 缺点: 需要额外开发

如果选择 B，修改配置让商户也无法访问 Admin。

### Q3: 如何为不同角色定制 Admin UI？

Payload 支持根据角色显示/隐藏菜单：

```typescript
// collections/Orders.ts
admin: {
  hidden: ({ user }) => {
    // 对普通用户隐藏订单管理
    return user.role === 'customer'
  },
}
```

### Q4: 如何记录 Admin 登录日志？

可以在 Users Collection 中添加 Hook：

```typescript
// collections/Users.ts
hooks: {
  afterLogin: [
    async ({ req, user }) => {
      // 记录登录日志
      await req.payload.create({
        collection: 'audit-logs',
        data: {
          entity: 'user',
          entity_id: user.id,
          action: 'login',
          operator: user.id,
          ip_address: req.ip,
          user_agent: req.headers['user-agent'],
        },
      })
    },
  ],
}
```

---

## 下一步

- [ ] 开发用户端前端应用（React/Vue/小程序）
- [ ] 实现用户登录和注册
- [ ] 实现 SKU 浏览和下单
- [ ] 实现订单查看和管理
- [ ] 决定商户是否使用 Admin 或独立商户端

参考 [TODO.md](./TODO.md) 查看完整任务。
