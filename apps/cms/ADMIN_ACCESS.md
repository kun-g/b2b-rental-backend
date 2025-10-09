# Admin 后台访问控制

## ✅ 正确实现方式

Admin 访问控制需要在 **Users Collection** 中配置 `access.admin`。

### 配置代码

```typescript
// src/collections/Users.ts
export const Users: CollectionConfig = {
  slug: 'users',
  access: {
    // ⭐ 这里控制谁可以访问 Admin Panel
    admin: ({ req: { user } }) => {
      const allowedRoles = [
        'platform_admin',
        'platform_operator',
        'platform_support',
        'merchant_admin',
        'merchant_member',
      ]
      return allowedRoles.includes(user?.role)
    },
  },
  auth: true,
}
```

### 当前配置

- ✅ `platform_admin` - 可访问
- ✅ `platform_operator` - 可访问
- ✅ `platform_support` - 可访问
- ✅ `merchant_admin` - 可访问
- ✅ `merchant_member` - 可访问
- ❌ `customer` - **无法访问**

---

## 测试

1. 创建 `customer` 角色的用户
2. 尝试登录 `http://localhost:3000/admin`
3. 登录后应该被阻止访问

---

## 自定义

### 只允许平台人员

```typescript
admin: ({ req: { user } }) => {
  return user?.role?.startsWith('platform_')
}
```

### 商户需要审核通过

```typescript
admin: async ({ req: { user } }) => {
  if (user?.role?.startsWith('platform_')) return true

  if (user?.role === 'merchant_admin') {
    const merchant = await req.payload.findByID({
      collection: 'merchants',
      id: user.merchant,
    })
    return merchant.status === 'approved'
  }

  return false
}
```

---

## 参考

- [Payload Access Control](https://payloadcms.com/docs/access-control/overview)
