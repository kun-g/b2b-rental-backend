# 订单列表 API 接入指导

## 概述

本文档说明前端如何根据不同角色查询订单列表。**重点：前端不需要根据角色手动构造不同的查询条件，后端会自动根据登录用户的角色过滤数据。**

---

## 核心原则

### 1. 统一的 API 调用

**所有角色都使用相同的 API 端点**：

```typescript
GET /api/orders?page=1&limit=20&depth=2
```

### 2. 后端自动权限过滤

后端会根据当前登录用户的角色自动过滤订单数据：

| 角色 | 可见订单范围 | 后端过滤逻辑 |
|------|-------------|-------------|
| **平台管理员** (`platform_admin`) | 所有订单 | 无过滤 |
| **平台运营** (`platform_operator`) | 所有订单 | 无过滤 |
| **平台客服** (`platform_support`) | 无权限 | 返回空 |
| **商户管理员** (`merchant_admin`) | 本商户的所有订单 | `where[merchant][equals]=<当前用户的商户ID>` |
| **商户成员** (`merchant_member`) | 本商户的所有订单 | `where[merchant][equals]=<当前用户的商户ID>` |
| **普通用户** (`customer`) | 自己下的订单 | `where[customer][equals]=<当前用户ID>` |

---

## 实现步骤

### 步骤 1：获取当前用户信息

登录后，调用用户信息接口获取当前用户的角色：

```typescript
// 请求
GET /api/accounts/me

// 响应示例（Accounts 对象包含关联的 Users）
{
  "id": "account-123",
  "email": "merchant@example.com",
  "users": [
    {
      "id": "4",
      "role": "merchant_admin",        // ⭐ 角色信息
      "user_type": "merchant",
      "merchant": {
        "id": "1",
        "name": "优租设备"
      },
      "status": "active"
    }
  ]
}
```

**关键字段说明**：
- `role`: 用户角色（6种角色之一）
- `user_type`: 业务类型（customer/merchant/platform）
- `merchant`: 如果是商户角色，会包含关联的商户信息

**⚠️ 注意**：
- ❌ **不要调用** `/api/users/4/roles`（此端点不存在）
- ✅ **应该调用** `/api/accounts/me` 或 `/api/users/4`，从响应的 `role` 字段获取角色

---

### 步骤 2：调用订单列表 API

**所有角色使用相同的 API 调用**：

```typescript
// TypeScript 示例
const fetchOrders = async (page: number = 1, limit: number = 20) => {
  const response = await fetch(
    `/api/orders?page=${page}&limit=${limit}&depth=2`,
    {
      headers: {
        'Authorization': `Bearer ${token}`, // 必须携带登录凭证
      }
    }
  )

  if (!response.ok) {
    throw new Error('Failed to fetch orders')
  }

  return await response.json()
}

// 使用
const ordersData = await fetchOrders(1, 20)
```

**响应格式**：

```json
{
  "docs": [
    {
      "id": "order-1",
      "order_no": "ORD-1234567890",
      "customer": {
        "id": "5",
        "account": { "email": "user@example.com" }
      },
      "merchant": {
        "id": "1",
        "name": "优租设备"
      },
      "merchant_sku": {
        "id": "sku-1",
        "name": "MacBook Pro 16寸",
        "category": { "name": "笔记本电脑" }
      },
      "status": "IN_RENT",
      "daily_fee_snapshot": 50,
      "rent_start_date": "2025-01-15",
      "rent_end_date": "2025-02-15",
      ...
    }
  ],
  "totalDocs": 10,
  "limit": 20,
  "page": 1,
  "totalPages": 1,
  "hasNextPage": false,
  "hasPrevPage": false
}
```

---

### 步骤 3（可选）：添加额外的查询条件

如果需要在自动过滤的基础上进一步筛选，可以添加额外的 where 参数：

```typescript
// 示例1：商户查询特定状态的订单
GET /api/orders?where[status][equals]=TO_SHIP&page=1&limit=20

// 示例2：查询特定时间范围的订单
GET /api/orders?where[createdAt][greater_than_equal]=2025-01-01&page=1&limit=20

// 示例3：组合查询（待发货 + 最近7天）
GET /api/orders?where[status][equals]=TO_SHIP&where[createdAt][greater_than_equal]=2025-01-10&page=1&limit=20
```

**⚠️ 重要**：
- ✅ 可以添加 `status`、`createdAt` 等字段的过滤条件
- ❌ **不要**手动添加 `where[user]` 或 `where[merchant]` 或 `where[customer]`（后端已自动处理）

---

## 不同角色的典型场景

### 场景 1：普通用户查看"我的订单"

```typescript
// 前端代码
const MyOrders = () => {
  const [orders, setOrders] = useState([])

  useEffect(() => {
    // 直接调用，后端自动返回当前用户的订单
    fetch('/api/orders?page=1&limit=20&depth=2', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setOrders(data.docs))
  }, [])

  return (
    <div>
      <h1>我的订单</h1>
      {/* 只会显示当前用户下的订单 */}
      {orders.map(order => <OrderCard key={order.id} order={order} />)}
    </div>
  )
}
```

**后端自动过滤**：`where[customer][equals]=<当前用户ID>`

---

### 场景 2：商户查看"待发货订单"

```typescript
// 前端代码
const MerchantPendingOrders = () => {
  const [orders, setOrders] = useState([])

  useEffect(() => {
    // 只需指定状态过滤，商户过滤由后端自动处理
    fetch('/api/orders?where[status][equals]=TO_SHIP&page=1&limit=20&depth=2', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setOrders(data.docs))
  }, [])

  return (
    <div>
      <h1>待发货订单</h1>
      {/* 只会显示当前商户的待发货订单 */}
      {orders.map(order => <OrderCard key={order.id} order={order} />)}
    </div>
  )
}
```

**后端自动过滤**：`where[merchant][equals]=<当前用户的商户ID> AND where[status][equals]=TO_SHIP`

---

### 场景 3：平台管理员查看所有订单

```typescript
// 前端代码
const AdminAllOrders = () => {
  const [orders, setOrders] = useState([])
  const [filters, setFilters] = useState({
    status: '',
    merchantId: ''
  })

  const fetchOrders = () => {
    let url = '/api/orders?page=1&limit=20&depth=2'

    // 平台管理员可以主动添加商户过滤
    if (filters.merchantId) {
      url += `&where[merchant][equals]=${filters.merchantId}`
    }

    if (filters.status) {
      url += `&where[status][equals]=${filters.status}`
    }

    fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setOrders(data.docs))
  }

  return (
    <div>
      <h1>订单管理</h1>
      {/* 平台管理员可以看到所有订单，可以按商户/状态筛选 */}
      <Filters filters={filters} onChange={setFilters} />
      {orders.map(order => <OrderCard key={order.id} order={order} />)}
    </div>
  )
}
```

**后端自动过滤**：无过滤（返回所有订单），前端可选择性添加过滤条件

---

## 常见错误及解决方案

### ❌ 错误 1：手动根据角色构造不同查询

```typescript
// ❌ 不要这样做
const fetchOrders = (userRole, userId, merchantId) => {
  let url = '/api/orders?page=1&limit=20'

  if (userRole === 'customer') {
    url += `&where[customer][equals]=${userId}`  // 不需要手动添加
  } else if (userRole === 'merchant_admin') {
    url += `&where[merchant][equals]=${merchantId}`  // 不需要手动添加
  }

  return fetch(url)
}
```

**✅ 正确做法**：

```typescript
// ✅ 应该这样做
const fetchOrders = () => {
  // 直接调用，后端自动处理权限过滤
  return fetch('/api/orders?page=1&limit=20&depth=2')
}
```

---

### ❌ 错误 2：调用不存在的角色端点

```typescript
// ❌ 不要这样做
const userRoles = await fetch('/api/users/4/roles')  // 此端点不存在
```

**✅ 正确做法**：

```typescript
// ✅ 应该这样做
const user = await fetch('/api/users/4').then(res => res.json())
const role = user.role  // 从用户对象中读取角色
```

---

### ❌ 错误 3：使用错误的字段名

```typescript
// ❌ 不要这样做
GET /api/orders?where[user][equals]=4  // 字段名错误，Orders 没有 user 字段
```

**✅ 正确做法**：

```typescript
// ✅ 如果需要按下单用户过滤（仅平台管理员）
GET /api/orders?where[customer][equals]=4

// ✅ 如果需要按商户过滤（仅平台管理员）
GET /api/orders?where[merchant][equals]=1

// ✅ 大多数情况下，直接调用即可，后端自动处理
GET /api/orders?page=1&limit=20
```

---

## Query 参数参考

### 基础参数

| 参数 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `page` | number | 页码（从1开始） | `page=1` |
| `limit` | number | 每页数量 | `limit=20` |
| `depth` | number | 关联深度（0-2） | `depth=2` |
| `sort` | string | 排序字段 | `sort=-createdAt` |

### 常用过滤条件

```typescript
// 按状态过滤
where[status][equals]=TO_SHIP

// 按时间范围过滤
where[createdAt][greater_than_equal]=2025-01-01
where[createdAt][less_than_equal]=2025-12-31

// 按订单号搜索（模糊匹配）
where[order_no][like]=ORD-1234

// 逾期订单
where[is_overdue][equals]=true

// 组合条件（AND逻辑）
where[status][equals]=IN_RENT&where[is_overdue][equals]=true
```

### 完整的 Where 查询操作符

| 操作符 | 说明 | 示例 |
|--------|------|------|
| `equals` | 等于 | `where[status][equals]=PAID` |
| `not_equals` | 不等于 | `where[status][not_equals]=CANCELED` |
| `like` | 包含（模糊匹配） | `where[order_no][like]=ORD-123` |
| `contains` | 包含 | `where[notes][contains]=urgent` |
| `in` | 在数组中 | `where[status][in]=PAID,TO_SHIP` |
| `not_in` | 不在数组中 | `where[status][not_in]=CANCELED,COMPLETED` |
| `greater_than` | 大于 | `where[rent_days][greater_than]=30` |
| `greater_than_equal` | 大于等于 | `where[order_total_amount][greater_than_equal]=1000` |
| `less_than` | 小于 | `where[rent_days][less_than]=7` |
| `less_than_equal` | 小于等于 | `where[daily_fee_snapshot][less_than_equal]=100` |

---

## 测试账号

可以使用以下测试账号验证不同角色的订单查询：

| 账号 | 密码 | 角色 | 可见订单 |
|------|------|------|----------|
| `admin` | `admin123456` | platform_admin | 所有订单（10个） |
| `merchant1` | `merchant123` | merchant_admin | 商户1的订单（约3-4个） |
| `merchant2` | `merchant123` | merchant_admin | 商户2的订单（约3-4个） |
| `user1` | `user123456` | customer | user1的订单（约2-3个） |
| `user2` | `user123456` | customer | user2的订单（约2-3个） |

---

## 总结

### 关键要点

1. ✅ **所有角色使用相同的 API 端点**：`GET /api/orders`
2. ✅ **后端自动根据登录用户的角色过滤数据**，前端无需关心权限逻辑
3. ✅ **从用户对象的 `role` 字段获取角色**，不要调用 `/api/users/:id/roles`
4. ✅ **字段名称**：`customer`（下单用户）、`merchant`（商户）、`status`（订单状态）
5. ✅ **可以添加额外的过滤条件**（如状态、时间），但不要手动添加用户/商户过滤

### 推荐做法

```typescript
// 1. 获取当前用户信息
const currentAccount = await fetch('/api/accounts/me').then(r => r.json())
const currentUser = currentAccount.users[0]
const role = currentUser.role

// 2. 调用订单API（所有角色相同）
const orders = await fetch('/api/orders?page=1&limit=20&depth=2').then(r => r.json())

// 3. 根据角色调整UI展示（可选）
if (role === 'platform_admin') {
  // 显示管理员专属功能（如商户筛选器）
} else if (role.startsWith('merchant_')) {
  // 显示商户专属功能（如批量发货）
} else if (role === 'customer') {
  // 显示用户专属功能（如催发货）
}
```

---

## 联系与支持

如有疑问，请联系后端团队或查阅：
- 权限矩阵：`docs/USER_PERMISSIONS.md`
- 认证指南：`docs/AUTH_GUIDE.md`
