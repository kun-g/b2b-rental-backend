# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个基于 **Payload CMS 3.x** 构建的 B2B 设备租赁平台后端系统。使用 Next.js 15 和 PostgreSQL，实现了完整的订单、授信、商户管理等功能。

## 技术栈

- **框架**: Payload CMS 3.59.1 + Next.js 15.4.4
- **数据库**: PostgreSQL (生产/开发), SQLite (测试)
- **运行时**: Node.js >=18.20.2, pnpm >=9
- **测试**: Vitest (集成测试), Playwright (E2E测试)
- **语言**: TypeScript 5.7.3

## 核心命令

### 开发和构建

```bash
# 启动开发服务器（端口 3000）
pnpm dev

# 构建生产版本
pnpm build

# 启动生产服务器
pnpm start

# 清理后重启开发服务器（解决缓存问题）
pnpm devsafe
```

### 代码质量

```bash
# 运行 ESLint
pnpm lint

# 生成 TypeScript 类型定义
pnpm generate:types

# 生成 import map
pnpm generate:importmap
```

### 测试

```bash
# 运行所有测试（集成测试 + E2E测试）
pnpm test

# 仅运行集成测试（Vitest，使用 SQLite 内存数据库）
pnpm test:int

# 仅运行 E2E 测试（Playwright，需要开发服务器运行）
pnpm test:e2e
```

**重要提示**：
- 集成测试使用 SQLite 内存数据库（需在开发环境运行）
- E2E 测试会自动启动开发服务器
- 生产环境不包含 SQLite 依赖，无法运行测试

### 数据库 Seed

```bash
# 创建演示数据（如果数据库已有数据会警告）
pnpm seed

# 清空数据库后创建演示数据
pnpm seed --clean

# 仅清空数据库
pnpm seed:clean
```

Seed 数据包括：12个用户、3个商户、7个类目、7个SKU、25个设备、6条授信、10个订单等。

### Docker

```bash
# 构建镜像
docker build -t b2b-rental-backend .

# 运行容器（需要环境变量）
docker run -p 3000:3000 \
  -e DATABASE_URI="postgresql://..." \
  -e PAYLOAD_SECRET="your-secret" \
  b2b-rental-backend
```

## 项目架构

### 目录结构

```
src/
├── collections/          # Payload Collections (14个)
│   ├── users.ts         # 用户（多角色）
│   ├── Categories.ts    # 类目
│   ├── Merchants.ts     # 商户
│   ├── MerchantSKUs.ts  # 商户SKU
│   ├── Devices.ts       # 设备
│   ├── Orders.ts        # 订单（状态机）
│   ├── UserMerchantCredit.ts  # 授信
│   ├── CreditInvitations.ts   # 授信邀请码
│   └── ...
├── endpoints/           # 自定义 API 端点
│   ├── validateInvitationCode.ts
│   └── useInvitationCode.ts
├── components/          # 自定义管理页面组件
├── utils/               # 工具函数
├── seed/                # 测试数据生成器
│   ├── data/           # 数据定义
│   └── scenarios/      # 场景生成器
├── app/
│   ├── (payload)/      # Payload Admin 和 API
│   └── (frontend)/     # 前端页面（邀请码使用等）
└── payload.config.ts   # Payload 配置

docs/                    # 详细文档
├── QUICK_START.md      # 快速开始指南
├── COLLECTIONS.md      # 数据模型设计文档
├── AUTH_GUIDE.md       # 认证系统指南
├── CREDIT_INVITATION_FLOW.md  # 授信邀请码流程
└── ...

tests/
├── int/                # 集成测试（Vitest）
└── e2e/                # 端到端测试（Playwright）
```

### 核心业务模型

系统围绕 **授信驱动** 的租赁模式设计：

1. **用户体系** (`users`)
   - 6种角色：平台管理员/运营/客服、商户管理员/成员、普通用户
   - 用户名+密码登录（可扩展手机验证码登录）

2. **商户体系** (`Merchants`)
   - 邀请制入驻，审核通过后可上架SKU
   - 商户可创建授信邀请码，用户自助获取授信

3. **授信体系** (`UserMerchantCredit`)
   - **用户 × 商户** 维度授信
   - 用户只能看到有授信的商户的SKU
   - 支持手动授信和邀请码自动授信

4. **订单状态机** (`Orders`)
   ```
   NEW → PAID → TO_SHIP → SHIPPED → IN_RENT → RETURNING → RETURNED → COMPLETED
            ↓
        CANCELED
   ```
   - 计费起点：发货日次日00:00
   - 支持改址（最多2次）、逾期计费
   - 发货时绑定设备SN

5. **设备管理** (`Devices`)
   - 实体设备，有独立状态（在库/租赁中/运输中/维修中/报废）
   - 发货时绑定到订单

### 关键设计原则

1. **访问控制**
   - 所有 Collection 都有细粒度的 RBAC 权限控制
   - 商户只能看到/修改自己的数据
   - 用户只能看到有授信的商户的SKU

2. **数据完整性**
   - 订单锁定快照（日租金、运费模板版本）
   - 审计日志记录敏感操作
   - 邀请码使用记录不可修改

3. **状态机流转**
   - 订单状态有严格的流转规则
   - 关键操作触发 Hook 自动处理（授信冻结/释放等）

4. **测试友好**
   - 开发/测试使用不同数据库适配器
   - Seed 数据覆盖所有业务场景
   - 集成测试使用内存数据库，完全隔离

## 环境变量

创建 `.env` 文件（参考 `test.env`）：

```bash
# 数据库
DATABASE_URI=postgresql://user:password@localhost:5432/dbname

# Payload 密钥
PAYLOAD_SECRET=your-secret-key-here

# 可选：跳过类型检查（加快构建）
SKIP_TYPE_CHECK=true

# 可选：禁用遥测
NEXT_TELEMETRY_DISABLED=1
```

## 开发指南

### 添加新 Collection

1. 创建 Collection 文件：`src/collections/YourCollection.ts`
2. 在 `payload.config.ts` 中注册
3. 运行 `pnpm generate:types` 生成类型
4. 添加访问控制和 Hooks

### 添加自定义 API 端点

1. 创建文件：`src/endpoints/yourEndpoint.ts`
2. 导出 `Endpoint` 对象（包含 path, method, handler）
3. 在 `payload.config.ts` 的 `endpoints` 数组中注册

### 修改 Collection 字段

1. 编辑 Collection 文件
2. 运行 `pnpm generate:types`
3. 如果是生产环境，需要手动迁移数据库（Payload 不自动迁移生产数据库）

### 添加测试

- **集成测试**：放在 `tests/int/` 或 `src/utils/*.test.ts`
- **E2E 测试**：放在 `tests/e2e/`
- 使用 Seed 数据快速搭建测试场景

## 常见问题

### 类型检查失败导致构建失败

```bash
# 临时跳过类型检查
SKIP_TYPE_CHECK=true pnpm build
```

或在 `.env` 中设置 `SKIP_TYPE_CHECK=true`。

### 数据库连接失败

检查 `DATABASE_URI` 格式：
```bash
postgresql://username:password@host:port/database
```

### 测试环境提示 SQLite 不可用

确保在开发环境运行测试（生产构建不包含 SQLite 依赖）。

### 首次访问创建管理员时选错了角色

**必须选择 `platform_admin` 角色**，否则无法管理系统。

如果选错，可以：
1. 直接修改数据库：`UPDATE users SET role = 'platform_admin' WHERE username = 'admin';`
2. 或运行 `pnpm seed --clean` 重新开始

## 相关文档

所有详细文档都在 `./docs` 目录：

- **QUICK_START.md** - 快速开始和首次设置
- **COLLECTIONS.md** - 数据模型设计文档（必读）
- **AUTH_GUIDE.md** - 认证系统和角色权限
- **CREDIT_INVITATION_FLOW.md** - 授信邀请码业务流程
- **DATABASE_SETUP.md** - 数据库配置
- **USER_PERMISSIONS.md** - 权限矩阵

查看 `TODO.md` 了解待实现功能。

## 部署注意事项

1. **Next.js Standalone 模式**
   - `next.config.mjs` 配置了 `output: 'standalone'`
   - Payload CMS 3.x 对 standalone 模式支持有限，需要复制配置文件到生产镜像

2. **Docker 镜像优化**
   - 使用多阶段构建，分离生产依赖
   - 仅复制生产依赖到最终镜像

3. **环境变量**
   - 确保设置 `DATABASE_URI` 和 `PAYLOAD_SECRET`
   - 生产环境不要设置 `SKIP_TYPE_CHECK=true`

4. **数据库迁移**
   - 开发环境 Payload 自动同步 schema（`push: true`）
   - 生产环境需要手动迁移（`push: false`）
