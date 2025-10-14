# API 协作指南

## 概述

本项目基于 **Payload CMS 3.x** 构建，提供完整的 RESTful API 和 GraphQL API。本文档指导如何与同事进行 API 协作。

## Payload CMS API 规范

### REST API 基础结构

Payload CMS 自动为每个 Collection 生成标准的 CRUD API：

```
GET    /api/{collection}          # 获取列表（分页、筛选、排序）
GET    /api/{collection}/{id}     # 获取单个文档
POST   /api/{collection}          # 创建文档
PATCH  /api/{collection}/{id}     # 更新文档
DELETE /api/{collection}/{id}     # 删除文档
```

### 2. GraphQL API

Payload 同时提供 GraphQL API：

```
POST   /api/graphql               # GraphQL 端点
GET    /api/graphql-playground    # GraphQL Playground（开发环境）
```

### 3. 认证端点

```
POST   /api/users/login           # 登录
POST   /api/users/logout          # 登出
POST   /api/users/refresh-token  # 刷新 Token
GET    /api/users/me              # 获取当前用户信息
```

## 项目 API 端点列表

### 标准 Collection API

| Collection | 端点前缀 | 描述 |
|------------|---------|------|
| users | `/api/users` | 用户管理 |
| merchants | `/api/merchants` | 商户管理 |
| categories | `/api/categories` | 类目管理 |
| merchant-skus | `/api/merchant-skus` | 商户SKU |
| devices | `/api/devices` | 设备管理 |
| orders | `/api/orders` | 订单管理 |
| user-merchant-credit | `/api/user-merchant-credit` | 用户授信 |
| shipping-templates | `/api/shipping-templates` | 运费模板 |
| payments | `/api/payments` | 支付记录 |
| logistics | `/api/logistics` | 物流信息 |

## 认证方式

### 1. JWT Token 认证（推荐）

适用于前后端分离的应用。

#### 登录获取 Token

```bash
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "your_username",
    "password": "your_password"
  }'
```

响应示例：
```json
{
  "message": "Auth Passed",
  "user": {
    "id": "user_id",
    "username": "your_username",
    "role": "customer",
    "name": "用户姓名"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### 使用 Token 调用 API

```bash
curl -X GET http://localhost:3000/api/orders \
  -H "Authorization: JWT eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```


## API 使用示例

### 1. 获取商户列表

```bash
# 获取所有商户（需要管理员权限）
curl -X GET http://localhost:3000/api/merchants \
  -H "Authorization: JWT ${TOKEN}"

# 分页查询
curl -X GET "http://localhost:3000/api/merchants?limit=10&page=1" \
  -H "Authorization: JWT ${TOKEN}"

# 筛选激活的商户
curl -X GET "http://localhost:3000/api/merchants?where[status][equals]=active" \
  -H "Authorization: JWT ${TOKEN}"
```

### 2. 创建订单

```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Authorization: JWT ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "sku": "sku_id",
    "quantity": 2,
    "rent_days": 30,
    "shipping_address": {
      "receiver_name": "张三",
      "receiver_phone": "13800138000",
      "province": "北京市",
      "city": "北京市",
      "district": "朝阳区",
      "address": "某某街道123号"
    }
  }'
```

### 3. 查询授信额度

```bash
# 获取当前用户的所有授信
curl -X GET "http://localhost:3000/api/user-merchant-credit?where[user][equals]=${USER_ID}" \
  -H "Authorization: JWT ${TOKEN}"
```

## GraphQL 使用示例

### 查询示例

```graphql
# 获取订单列表
query GetOrders {
  Orders(limit: 10, page: 1, where: { status: { equals: "in_rent" } }) {
    docs {
      id
      order_no
      status
      total_amount
      sku {
        name
        daily_rent
      }
      user {
        name
        phone
      }
    }
    totalDocs
    totalPages
  }
}
```

### 变更示例

```graphql
# 创建商户SKU
mutation CreateSKU {
  createMerchantSKU(data: {
    name: "MacBook Pro 16寸",
    daily_rent: 150,
    merchant: "merchant_id",
    category: "category_id",
    market_price: 20000,
    status: "active"
  }) {
    id
    name
    daily_rent
  }
}
```

## 权限控制

### 角色权限矩阵

| 角色 | 代码值 | 权限范围 |
|------|--------|----------|
| 平台管理员 | `platform_admin` | 所有资源的完全权限 |
| 平台运营 | `platform_operator` | 管理商户、用户、订单 |
| 平台客服 | `platform_support` | 查看订单、处理售后 |
| 商户管理员 | `merchant_admin` | 管理自己商户的资源 |
| 商户成员 | `merchant_member` | 查看和操作订单 |
| 普通用户 | `customer` | 只能访问自己的数据 |

### 数据隔离规则

1. **商户隔离**：商户只能看到自己的数据
2. **用户隔离**：用户只能看到自己的订单和授信
3. **授信限制**：用户只能看到有授信的商户的SKU

## 开发环境配置

### 1. 环境变量

创建 `.env.local` 文件：

```bash
# API 服务地址
API_URL=http://localhost:3000/api

# 开发环境 Token（可选，用于测试）
DEV_TOKEN=your_dev_token_here
```

### 2. 启动开发服务器

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# API 将运行在 http://localhost:3000/api
```

### 3. 创建测试数据

```bash
# 创建完整的测试数据
pnpm seed

# 包括：
# - 12个用户（各种角色）
# - 3个商户
# - 7个类目
# - 7个SKU
# - 25个设备
# - 10个订单
```

## API 文档生成

### 使用 Postman

1. 导入 Collection：
   - 在 Postman 中创建新的 Collection
   - 设置环境变量（base_url, token）
   - 添加所有 API 端点

2. 生成文档：
   - Postman → Publish Docs
   - 分享链接给团队成员

### 使用 Swagger/OpenAPI（需要额外配置）

```typescript
// src/swagger.ts
import swaggerJsdoc from 'swagger-jsdoc'
import swaggerUi from 'swagger-ui-express'

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'B2B Rental API',
      version: '1.0.0',
    },
    servers: [
      {
        url: 'http://localhost:3000/api',
      },
    ],
  },
  apis: ['./src/endpoints/*.ts', './src/collections/*.ts'],
}

const specs = swaggerJsdoc(options)

// 在 Express 中使用
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs))
```

## 最佳实践

### 1. 版本控制

虽然 Payload CMS 默认不支持 API 版本控制，但可以通过以下方式实现：

```typescript
// 自定义端点支持版本
endpoints: [
  {
    path: '/v1/custom-endpoint',
    method: 'get',
    handler: v1Handler,
  },
  {
    path: '/v2/custom-endpoint',
    method: 'get',
    handler: v2Handler,
  },
]
```

### 2. 错误处理

标准错误响应格式：

```json
{
  "errors": [
    {
      "message": "Validation failed",
      "field": "email",
      "value": "invalid-email"
    }
  ]
}
```

### 3. 分页规范

```bash
# 请求
GET /api/orders?limit=20&page=2&sort=-createdAt

# 响应
{
  "docs": [...],
  "totalDocs": 100,
  "limit": 20,
  "totalPages": 5,
  "page": 2,
  "pagingCounter": 21,
  "hasPrevPage": true,
  "hasNextPage": true,
  "prevPage": 1,
  "nextPage": 3
}
```

### 4. 筛选和查询

Payload 支持复杂的查询语法：

```bash
# 等于
?where[status][equals]=active

# 不等于
?where[status][not_equals]=deleted

# 包含
?where[name][contains]=Mac

# 大于/小于
?where[price][greater_than]=1000
?where[price][less_than_equal]=5000

# 日期范围
?where[createdAt][greater_than]=2024-01-01
?where[createdAt][less_than]=2024-12-31

# 多条件组合
?where[and][0][status][equals]=active&where[and][1][price][less_than]=1000
```

## 调试工具

### 1. Payload Admin UI

访问 `http://localhost:3000/admin`，可以：
- 查看所有 Collections
- 测试 CRUD 操作
- 查看数据关系

### 2. GraphQL Playground

访问 `http://localhost:3000/api/graphql-playground`（开发环境），可以：
- 测试 GraphQL 查询
- 查看 Schema 文档
- 自动补全

### 3. 日志查看

```bash
# 查看服务器日志
pnpm dev

# 查看数据库查询（开发环境）
DATABASE_LOGGING=true pnpm dev
```

## 安全建议

### 1. 生产环境配置

```env
# .env.production
NODE_ENV=production
PAYLOAD_SECRET=使用强密码，至少32个字符
CORS_ORIGINS=https://your-domain.com
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=15min
```

### 2. API 访问限制

```typescript
// 限制 IP 白名单
const allowedIPs = ['192.168.1.0/24', '10.0.0.0/8']

// 限流配置
const rateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 最多100次请求
  message: 'Too many requests',
}
```

### 3. 敏感数据保护

- 不要在响应中返回密码字段
- 使用 HTTPS 传输
- 记录审计日志

## 常见问题

### Q1: 如何处理跨域问题？

在 `payload.config.ts` 中配置 CORS：

```typescript
cors: {
  origins: [
    'http://localhost:3001',
    'https://your-frontend.com',
  ],
  credentials: true,
}
```

### Q2: Token 过期时间如何设置？

```typescript
// payload.config.ts
auth: {
  tokenExpiration: 7 * 24 * 60 * 60, // 7天（秒）
  maxLoginAttempts: 5,
  lockTime: 2 * 60 * 60 * 1000, // 2小时（毫秒）
}
```

### Q3: 如何实现 Webhook？

```typescript
// 在 Collection 中添加 Hook
hooks: {
  afterChange: [
    async ({ doc, operation }) => {
      if (operation === 'create') {
        // 发送 Webhook
        await fetch('https://webhook.site/xxx', {
          method: 'POST',
          body: JSON.stringify(doc),
        })
      }
    },
  ],
}
```

### Q4: 如何监控 API 性能？

1. 使用 Payload 内置的 metrics
2. 集成 APM 工具（New Relic, DataDog）
3. 添加自定义中间件记录响应时间

## 协作流程建议

### 1. API 设计评审

- 新增 API 前先编写设计文档
- 团队评审 API 接口设计
- 确定请求/响应格式

### 2. 文档同步

- API 变更时同步更新文档
- 使用版本控制管理 API 文档
- 提供变更日志

### 3. 测试协作

- 提供 Postman Collection
- 编写集成测试
- Mock 数据支持

### 4. 沟通机制

- 建立 API 变更通知机制
- 定期同步开发进度
- 及时处理 API 问题反馈

## 下一步

1. **创建 Postman Collection**：整理所有 API 端点
2. **编写集成测试**：确保 API 稳定性
3. **设置监控告警**：及时发现问题
4. **优化性能**：添加缓存、优化查询
5. **完善文档**：添加更多使用示例

## 相关资源

- [Payload CMS 官方文档](https://payloadcms.com/docs)
- [REST API 文档](https://payloadcms.com/docs/rest-api/overview)
- [GraphQL 文档](https://payloadcms.com/docs/graphql/overview)
- [认证文档](https://payloadcms.com/docs/authentication/overview)
- 项目文档：
  - [AUTH_GUIDE.md](./AUTH_GUIDE.md) - 认证系统详解
  - [COLLECTIONS.md](./COLLECTIONS.md) - 数据模型设计
  - [USER_PERMISSIONS.md](./USER_PERMISSIONS.md) - 权限矩阵