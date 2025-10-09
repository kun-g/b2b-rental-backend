# 用户管理权限说明

## 权限矩阵

### Users Collection 权限

| 操作 | platform_admin | platform_operator | platform_support | merchant_admin | merchant_member | customer |
|------|----------------|-------------------|------------------|----------------|-----------------|----------|
| **访问 Admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **查看用户列表** | ✅ 所有用户 | ✅ 所有用户 | ❌ 仅自己 | ❌ 仅自己 | ❌ 仅自己 | ❌ 仅自己 |
| **创建用户** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **修改用户** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **删除用户** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 详细说明

### 1. Admin Panel 访问

所有人员（除了 customer）都可以访问 Admin 后台：

```typescript
admin: ({ req: { user } }) => {
  const allowedRoles = [
    'platform_admin',
    'platform_operator',
    'platform_support',
    'merchant_admin',
    'merchant_member',
  ]
  return allowedRoles.includes(user?.role)
}
```

**效果**:
- ✅ 平台人员、商户人员可以登录 `/admin`
- ❌ 普通用户（customer）无法访问 Admin

---

### 2. 查看用户（Read）

```typescript
read: ({ req: { user } }) => {
  if (user?.role === 'platform_admin' || user?.role === 'platform_operator') {
    return true // 可以查看所有用户
  }
  // 其他角色只能查看自己
  return {
    id: {
      equals: user?.id,
    },
  }
}
```

**效果**:
- ✅ `platform_admin` / `platform_operator` → 可以看到所有用户列表
- ℹ️ 其他角色 → 只能查看自己的信息

**在 Admin UI 中**:
- `platform_admin` / `platform_operator` → 可以进入「Users」菜单，看到完整列表
- 其他角色 → 「Users」菜单会被隐藏或只显示自己

**通过 API**:
```bash
# platform_admin 调用
GET /api/users
# 返回所有用户

# merchant_admin 调用
GET /api/users
# 只返回自己的信息

# 查看自己的信息（所有角色都可以）
GET /api/users/me
# 返回当前登录用户信息
```

---

### 3. 创建用户（Create）

```typescript
create: ({ req: { user } }) => {
  return user?.role === 'platform_admin' || user?.role === 'platform_operator'
}
```

**效果**:
- ✅ `platform_admin` / `platform_operator` → 可以创建用户
- ❌ 其他角色 → 无法创建用户

**在 Admin UI 中**:
- `platform_admin` / `platform_operator` → 看到「Create New」按钮
- 其他角色 → 按钮被隐藏

---

### 4. 修改用户（Update）

```typescript
update: ({ req: { user } }) => {
  return user?.role === 'platform_admin' || user?.role === 'platform_operator'
}
```

**效果**:
- ✅ `platform_admin` / `platform_operator` → 可以修改任何用户
- ❌ 其他角色 → 无法修改用户（包括自己）

**注意**: 如果你希望用户可以修改自己的信息（如密码、邮箱），需要额外配置：

```typescript
update: ({ req: { user }, id }) => {
  // 平台人员可以修改所有人
  if (user?.role === 'platform_admin' || user?.role === 'platform_operator') {
    return true
  }
  // 其他人只能修改自己
  return user?.id === id
}
```

---

### 5. 删除用户（Delete）

```typescript
delete: ({ req: { user } }) => {
  return user?.role === 'platform_admin'
}
```

**效果**:
- ✅ `platform_admin` → 可以删除用户
- ❌ 其他所有角色 → 无法删除用户

---

## 测试场景

### 场景 1: 平台管理员

```bash
# 登录
Username: admin
Role: platform_admin

# 可以做的操作
✅ 进入「账号管理」→「Users」
✅ 看到所有用户列表
✅ 点击「Create New」创建新用户
✅ 编辑任何用户
✅ 删除用户
```

### 场景 2: 平台运营

```bash
# 登录
Username: operator
Role: platform_operator

# 可以做的操作
✅ 进入「账号管理」→「Users」
✅ 看到所有用户列表
✅ 点击「Create New」创建新用户
✅ 编辑任何用户
❌ 删除用户（按钮被隐藏）
```

### 场景 3: 商户管理员

```bash
# 登录
Username: merchant1
Role: merchant_admin

# 可以做的操作
❌ 看不到「账号管理」→「Users」菜单（或菜单为空）
❌ 无法查看其他用户
❌ 无法创建用户
❌ 无法修改用户
❌ 无法删除用户

# 可以通过 API 查看自己
GET /api/users/me → ✅ 返回自己的信息
```

### 场景 4: 普通用户

```bash
# 登录
Username: customer1
Role: customer

# 可以做的操作
❌ 无法访问 Admin Panel
❌ 所有 Admin UI 操作均不可用

# 可以通过 API 查看自己
GET /api/users/me → ✅ 返回自己的信息
```

---

## API 访问示例

### 查看所有用户

```bash
# platform_admin 或 platform_operator
curl -X GET http://localhost:3000/api/users \
  -H "Authorization: Bearer <token>"

# 返回
{
  "docs": [
    { "id": "1", "username": "admin", "role": "platform_admin" },
    { "id": "2", "username": "merchant1", "role": "merchant_admin" },
    { "id": "3", "username": "customer1", "role": "customer" }
  ]
}
```

```bash
# merchant_admin 或其他角色
curl -X GET http://localhost:3000/api/users \
  -H "Authorization: Bearer <token>"

# 返回（只有自己）
{
  "docs": [
    { "id": "2", "username": "merchant1", "role": "merchant_admin" }
  ]
}
```

### 查看自己的信息

```bash
# 所有角色都可以
curl -X GET http://localhost:3000/api/users/me \
  -H "Authorization: Bearer <token>"

# 返回当前登录用户信息
{
  "user": {
    "id": "2",
    "username": "merchant1",
    "role": "merchant_admin"
  }
}
```

### 创建用户

```bash
# 只有 platform_admin 或 platform_operator 可以
curl -X POST http://localhost:3000/api/users \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newuser",
    "password": "Password123",
    "role": "customer"
  }'

# platform_admin → ✅ 成功
# merchant_admin → ❌ 403 Forbidden
```

---

## 自定义配置

### 允许用户修改自己的信息

```typescript
update: ({ req: { user }, id }) => {
  // 平台人员可以修改所有人
  if (user?.role === 'platform_admin' || user?.role === 'platform_operator') {
    return true
  }
  // 其他人只能修改自己（通过 /api/users/<own-id>）
  return user?.id === id
}
```

### 允许商户管理员查看本商户的员工

```typescript
read: ({ req: { user } }) => {
  // 平台人员可以看所有人
  if (user?.role === 'platform_admin' || user?.role === 'platform_operator') {
    return true
  }
  // 商户管理员可以看本商户的所有员工
  if (user?.role === 'merchant_admin') {
    return {
      merchant: {
        equals: user.merchant,
      },
    }
  }
  // 其他人只能看自己
  return {
    id: {
      equals: user?.id,
    },
  }
}
```

---

## 常见问题

### Q1: 商户管理员看不到「Users」菜单？

**正常行为**。因为商户管理员无权查看用户列表，Payload 会自动隐藏该菜单。

如果需要商户管理员管理本商户员工，参考上面的自定义配置。

### Q2: 用户能修改自己的密码吗？

**当前配置不能**。如果需要，有两种方式：

**方式 1**: 修改 `update` 权限允许用户修改自己

**方式 2**: 创建自定义 API endpoint 专门处理密码修改：

```typescript
// src/endpoints/change-password.ts
export const changePasswordEndpoint = {
  path: '/change-password',
  method: 'post',
  handler: async (req) => {
    const { oldPassword, newPassword } = req.body
    const user = req.user

    // 验证旧密码
    // 更新新密码
    // ...
  },
}
```

### Q3: 如何记录用户管理操作？

在 Users Collection 的 hooks 中添加：

```typescript
hooks: {
  afterChange: [
    async ({ doc, req, operation }) => {
      if (operation === 'create' || operation === 'update' || operation === 'delete') {
        await req.payload.create({
          collection: 'audit-logs',
          data: {
            entity: 'user',
            entity_id: doc.id,
            action: operation,
            operator: req.user?.id,
          },
        })
      }
    },
  ],
}
```

---

## 总结

### 当前权限配置

- ✅ 只有 `platform_admin` 和 `platform_operator` 可以对用户进行增删改查
- ✅ 其他角色只能查看自己的信息
- ✅ Admin UI 会根据权限自动隐藏/禁用相关功能
- ✅ API 访问也受到相同的权限限制

### 推荐实践

1. **最小权限原则**: 只给必要的角色分配权限
2. **使用审计日志**: 记录所有用户管理操作
3. **定期审查**: 定期检查用户列表和权限分配
4. **前端验证**: 虽然后端已限制，前端也应隐藏无权限的按钮

参考 [ADMIN_ACCESS.md](./ADMIN_ACCESS.md) 了解 Admin 访问控制。
