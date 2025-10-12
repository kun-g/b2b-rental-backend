# 用户认证指南

## 登录方式

系统支持以下登录方式：

### 1. 用户名 + 密码登录 ✅

**适用场景**: 管理后台、API调用

```bash
POST /api/users/login
Content-Type: application/json

{
  "username": "admin",
  "password": "your-password"
}
```

**特点**:
- ✅ 用户名（username）是唯一的登录账号
- ✅ 不能使用邮箱登录
- ✅ 不能使用手机号登录（手机号仅用于身份验证）

### 2. 手机号 + 验证码登录 🚧

**适用场景**: 用户端（小程序、H5）

```bash
# 步骤1: 发送验证码
POST /api/auth/send-sms
{
  "phone": "13800138000"
}

# 步骤2: 验证码登录
POST /api/auth/login-with-phone
{
  "phone": "13800138000",
  "code": "123456"
}
```

**状态**: 需要自定义实现（Payload 默认不支持）

**实现方案**:
- 使用 Payload 的 Custom Endpoints
- 集成短信服务商（阿里云、腾讯云等）
- 验证码存储在 Redis 或数据库
- 验证成功后生成 JWT Token

---

## 字段说明

| 字段 | 类型 | 必填 | 唯一 | 说明 |
|------|------|------|------|------|
| **username** | string | ✅ | ✅ | 登录账号（用户名） |
| **password** | string | ✅ | - | 登录密码（自动加密） |
| **email** | string | ❌ | ❌ | 邮箱（用于身份验证和通知） |
| **phone** | string | ✅ | ✅ | 手机号（用于身份验证和验证码） |
| **name** | string | ✅ | - | 真实姓名 |
| **role** | string | ✅ | - | 角色（仅管理员可修改） |

---

## 角色权限

### 角色类型

| 角色 | 值 | 描述 | 可修改角色 |
|------|-----|------|------------|
| **平台管理员** | `platform_admin` | 系统最高权限 | ✅ 所有角色 |
| **平台运营** | `platform_operator` | 运营管理权限 | ✅ 商户/用户角色 |
| **平台客服** | `platform_support` | 客服支持权限 | ❌ 只读 |
| **商户管理员** | `merchant_admin` | 商户最高权限 | ❌ 不能修改 |
| **商户成员** | `merchant_member` | 商户普通成员 | ❌ 不能修改 |
| **用户（租方）** | `customer` | 普通用户 | ❌ 不能修改 |

### 角色限制

**❌ 用户不能自选角色**
- 注册时默认角色为 `customer`
- 只有平台管理员/运营可以修改角色
- 用户在前端无法看到角色选择

**✅ 管理员分配角色**
```typescript
// 只有这些角色可以修改用户角色
access: {
  update: ({ req: { user } }) => {
    return user?.role === 'platform_admin' || user?.role === 'platform_operator'
  },
}
```

---

## 账号注册流程

### 方式1: 管理后台手动创建

1. 平台管理员登录后台
2. 进入「账号管理」->「Users」
3. 点击「Create New」
4. 填写必填字段：
   - username（用户名）
   - password（密码）
   - name（姓名）
   - phone（手机号）
   - role（角色，默认 customer）
5. 保存

### 方式2: API 注册（需自定义）

```typescript
// src/endpoints/register.ts
import type { PayloadRequest } from 'payload'

export const registerEndpoint = {
  path: '/register',
  method: 'post',
  handler: async (req: PayloadRequest) => {
    const { username, password, phone, name } = req.body

    // 1. 验证手机验证码
    // 2. 检查用户名是否已存在
    // 3. 创建用户（默认角色为 customer）
    const user = await req.payload.create({
      collection: 'users',
      data: {
        username,
        password,
        phone,
        name,
        role: 'customer', // 强制设置为普通用户
      },
    })

    return { success: true, user }
  },
}
```

---

## 密码管理

### 密码要求

建议设置密码复杂度要求：

```typescript
// 添加到 Users Collection fields
{
  name: 'password',
  type: 'text',
  required: true,
  validate: (val: string) => {
    // 最小8位，包含大小写字母和数字
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/
    if (!regex.test(val)) {
      return '密码必须至少8位，包含大小写字母和数字'
    }
    return true
  },
}
```

### 密码重置

**方式1: 管理员重置**
- 管理员在后台直接修改用户密码

**方式2: 手机验证码重置（需自定义）**
```bash
# 步骤1: 验证手机号
POST /api/auth/forgot-password
{
  "phone": "13800138000"
}

# 步骤2: 验证码重置密码
POST /api/auth/reset-password
{
  "phone": "13800138000",
  "code": "123456",
  "new_password": "NewPass123"
}
```

---

## 安全建议

### 1. 用户名规则
```typescript
{
  name: 'username',
  type: 'text',
  validate: (val: string) => {
    // 仅允许字母、数字、下划线，3-20位
    const regex = /^[a-zA-Z0-9_]{3,20}$/
    if (!regex.test(val)) {
      return '用户名只能包含字母、数字、下划线，长度3-20位'
    }
    return true
  },
}
```

### 2. 手机号验证
```typescript
{
  name: 'phone',
  type: 'text',
  validate: (val: string) => {
    // 中国大陆手机号
    const regex = /^1[3-9]\d{9}$/
    if (!regex.test(val)) {
      return '请输入有效的手机号'
    }
    return true
  },
}
```

### 3. 防止暴力破解
- ✅ 最大登录尝试次数: 5次
- ✅ 锁定时间: 2小时
- ✅ Token 过期时间: 7天
- 🚧 IP 限流（需自定义）
- 🚧 验证码（需自定义）

### 4. 密码存储
- ✅ Payload 自动使用 bcrypt 加密
- ✅ 不会在 API 响应中返回密码
- ✅ 不会在日志中记录密码

---

## 手机验证码登录实现示例

### 1. 创建自定义 Endpoint

```typescript
// src/endpoints/sms-login.ts
import type { Endpoint } from 'payload'
import { generateSMSCode, verifySMSCode, sendSMS } from '../utils/sms'

export const sendSMSEndpoint: Endpoint = {
  path: '/send-sms',
  method: 'post',
  handler: async (req) => {
    const { phone } = req.body

    // 验证手机号格式
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      return req.payload.sendError('无效的手机号', 400)
    }

    // 生成6位验证码
    const code = generateSMSCode()

    // 存储到 Redis (5分钟过期)
    await req.payload.redis.set(`sms:${phone}`, code, 'EX', 300)

    // 发送短信
    await sendSMS(phone, `您的验证码是: ${code}，5分钟内有效`)

    return { success: true }
  },
}

export const loginWithSMSEndpoint: Endpoint = {
  path: '/login-with-sms',
  method: 'post',
  handler: async (req) => {
    const { phone, code } = req.body

    // 验证验证码
    const storedCode = await req.payload.redis.get(`sms:${phone}`)
    if (!storedCode || storedCode !== code) {
      return req.payload.sendError('验证码错误或已过期', 400)
    }

    // 查找或创建用户
    let user = await req.payload.find({
      collection: 'users',
      where: { phone: { equals: phone } },
      limit: 1,
    })

    if (user.docs.length === 0) {
      // 自动注册
      user = await req.payload.create({
        collection: 'users',
        data: {
          username: `user_${phone}`,
          phone,
          name: '新用户',
          role: 'customer',
          password: Math.random().toString(36), // 随机密码
        },
      })
    }

    // 生成 JWT Token
    const token = await req.payload.login({
      collection: 'users',
      data: { id: user.docs[0].id },
      req,
    })

    // 删除验证码
    await req.payload.redis.del(`sms:${phone}`)

    return {
      success: true,
      token,
      user: user.docs[0],
    }
  },
}
```

### 2. 注册 Endpoint

```typescript
// payload.config.ts
import { sendSMSEndpoint, loginWithSMSEndpoint } from './endpoints/sms-login'

export default buildConfig({
  // ...
  endpoints: [
    sendSMSEndpoint,
    loginWithSMSEndpoint,
  ],
})
```

---

## 前端集成示例

### React Hook

```typescript
// hooks/useAuth.ts
import { useState } from 'react'

export function useAuth() {
  const [loading, setLoading] = useState(false)

  const loginWithUsername = async (username: string, password: string) => {
    setLoading(true)
    try {
      const res = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (data.token) {
        localStorage.setItem('token', data.token)
        return data.user
      }
      throw new Error(data.message)
    } finally {
      setLoading(false)
    }
  }

  const sendSMS = async (phone: string) => {
    await fetch('/api/send-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    })
  }

  const loginWithSMS = async (phone: string, code: string) => {
    setLoading(true)
    try {
      const res = await fetch('/api/login-with-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      })
      const data = await res.json()
      if (data.token) {
        localStorage.setItem('token', data.token)
        return data.user
      }
      throw new Error(data.message)
    } finally {
      setLoading(false)
    }
  }

  return { loginWithUsername, sendSMS, loginWithSMS, loading }
}
```

---

## 测试

### 创建测试账号

```bash
# 进入 Payload Admin
http://localhost:3000/admin

# 首次访问会要求创建第一个管理员账号
# 填写：
username: admin
password: Admin123456
name: 系统管理员
phone: 13800138000
role: platform_admin (自动设置)
```

### 测试登录

```bash
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "Admin123456"
  }'
```

预期返回：
```json
{
  "message": "Auth Passed",
  "user": {
    "id": "xxx",
    "username": "admin",
    "name": "系统管理员",
    "role": "platform_admin",
    ...
  },
  "token": "eyJhbGc..."
}
```

---

## 常见问题

### Q1: 可以同时使用用户名和邮箱登录吗？
A: 不可以。当前配置只支持用户名登录。如需支持邮箱登录，修改：
```typescript
loginWithUsername: {
  allowEmailLogin: true, // 改为 true
  requireEmail: true,    // 改为 true
}
```

### Q2: 用户可以修改自己的角色吗？
A: 不可以。角色字段设置了 `access.update` 限制，只有平台管理员/运营可以修改。

### Q3: 如何实现微信登录？
A: 需要自定义 Endpoint，参考手机验证码登录的实现方式。

### Q4: 密码会被明文存储吗？
A: 不会。Payload 自动使用 bcrypt 加密密码，不会存储明文。

---

## 下一步

- [ ] 实现手机验证码登录
- [ ] 添加用户名/密码复杂度验证
- [ ] 集成短信服务商
- [ ] 实现微信登录
- [ ] 添加登录日志
- [ ] 实现 IP 限流

参考 [TODO.md](./TODO.md) 查看完整任务。
