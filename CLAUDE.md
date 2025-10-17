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
- **部署**: Docker (standalone模式) + Dokploy
- **网络**: dokploy-network (外部网络)

## 核心命令

### 开发和构建

```bash
# 启动开发服务器（端口 3000）
pnpm dev

# 构建生产版本
pnpm build
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

**Seed 数据概览**：
- **用户** (12个): 包括平台管理员、商户管理员、普通用户等各种角色
- **商户** (3个): 优租设备、长租科技、租赁之家
- **类目** (7个): 笔记本电脑、显示器、打印机等
- **SKU** (7个): MacBook Pro、Dell显示器、HP打印机等
- **设备** (25个): 各SKU对应的实体设备（带SN号）
- **授信** (6条): 用户与商户的授信关系
- **订单** (10个): 涵盖各种状态（新建、已支付、发货中、租赁中等）
- **邀请码** (3个): 每个商户一个授信邀请码

**重要账号**：
```
平台管理员: admin / admin123456
商户管理员: merchant1 / merchant123
普通用户: user1 / user123456
```

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

### 开发环境 (.env)

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

### Dokploy 生产环境 (.env.dokploy)

```bash
# 使用 Dokploy 创建的数据库（注意用户名是 postgress 双s）
DATABASE_URI=postgresql://postgress:password@rent-database-gvfzwv:5432/cms

# CMS 配置
CMS_PORT=3000
PAYLOAD_SECRET=<生成一个安全的密钥>
PAYLOAD_PUBLIC_SERVER_URL=https://your-domain.com

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

### 部署相关问题

#### 问题：password authentication failed for user "postgres"

**原因**：Dokploy 创建的数据库用户名是 `postgress`（双s），不是 `postgres`。

**解决方案**：
```bash
# 检查 DATABASE_URI，确保用户名正确
postgresql://postgress:password@rent-database-gvfzwv:5432/cms
#              ^^^^^^^^ 注意是双s
```

#### 问题：CMS 容器无法连接数据库

**原因**：网络配置问题，容器不在同一网络。

**解决方案**：
```yaml
# docker-compose.yml 确保使用 dokploy-network
networks:
  dokploy-network:
    external: true
```

#### 问题：本地无法连接远程数据库执行 seed

**原因**：数据库未对外暴露端口。

**解决方案**：使用工作站容器执行（根据环境选择命令）：

```bash
# 本地开发环境（Podman）
podman exec cms-db-workstation pnpm seed

# 预发布/生产环境（Docker）
docker exec cms-db-workstation pnpm seed
```

### 开发相关问题

#### 类型检查失败导致构建失败

```bash
# 临时跳过类型检查
SKIP_TYPE_CHECK=true pnpm build
```

或在 `.env` 中设置 `SKIP_TYPE_CHECK=true`。

#### 测试环境提示 SQLite 不可用

确保在开发环境运行测试（生产构建不包含 SQLite 依赖）。

### 运维相关问题

#### 首次访问创建管理员时选错了角色

**必须选择 `platform_admin` 角色**，否则无法管理系统。

如果选错，可以通过工作站修复（根据环境选择命令）：

```bash
# 本地开发环境（Podman）
# 方法1：直接修改用户角色
podman exec cms-db-workstation sh -c 'PGPASSWORD=$DB_PASSWORD psql -h <数据库容器名> -U postgress -d cms -c "UPDATE users SET role = '\''platform_admin'\'' WHERE username = '\''admin'\'';"'

# 方法2：清空重建（会删除所有数据）
podman exec cms-db-workstation pnpm seed --clean

# 预发布/生产环境（Docker）
# 方法1：直接修改用户角色（预发布环境）
docker exec cms-db-workstation sh -c 'PGPASSWORD=$DB_PASSWORD psql -h rent-database-gvfzwv.1.n495txe9mw7riip8ox4zfcyqk -U postgress -d cms -c "UPDATE users SET role = '\''platform_admin'\'' WHERE username = '\''admin'\'';"'

# 方法2：清空重建（会删除所有数据）
docker exec cms-db-workstation pnpm seed --clean
```

## 调试技巧

### 容器日志查看

根据环境选择对应的命令：

```bash
# 本地开发环境（Podman）
podman logs cms                        # 查看 CMS 服务日志
podman logs cms-db-workstation        # 查看工作站日志
podman logs -f cms                    # 实时跟踪 CMS 日志
podman logs -f cms-db-workstation     # 实时跟踪工作站日志

# 预发布/生产环境（Docker）
docker logs cms                        # 查看 CMS 服务日志
docker logs cms-db-workstation        # 查看工作站日志
docker logs -f cms                    # 实时跟踪 CMS 日志
docker logs -f cms-db-workstation     # 实时跟踪工作站日志
```

### 数据库连接测试

```bash
# 本地开发环境（Podman）
# 测试从工作站到数据库的连接
podman exec cms-db-workstation nc -zv <数据库容器名或主机> 5432

# 查看数据库主机解析
podman exec cms-db-workstation getent hosts <数据库容器名>

# 检查网络配置
podman network inspect <网络名>

# 预发布/生产环境（Docker）
# 测试从工作站到数据库的连接（预发布环境）
docker exec cms-db-workstation nc -zv rent-database-gvfzwv.1.n495txe9mw7riip8ox4zfcyqk 5432

# 查看数据库主机解析（预发布环境）
docker exec cms-db-workstation getent hosts rent-database-gvfzwv.1.n495txe9mw7riip8ox4zfcyqk

# 检查网络配置
docker network inspect dokploy-network
```

### 环境变量检查

```bash
# 本地开发环境（Podman）
podman exec cms env | grep -E "DATABASE|PAYLOAD"                           # CMS 容器
podman exec cms-db-workstation env | grep -E "DATABASE|NODE_ENV"          # 工作站容器

# 预发布/生产环境（Docker）
docker exec cms env | grep -E "DATABASE|PAYLOAD"                           # CMS 容器
docker exec cms-db-workstation env | grep -E "DATABASE|NODE_ENV"          # 工作站容器
```

## 数据库工作站使用

工作站是一个包含完整源码和依赖的容器，用于执行数据库相关操作（seed、clean、直接查询等）。

### 环境差异

本项目在不同环境使用不同的容器引擎：

- **本地开发环境**：使用 **Podman** (`podman` 命令)
  - 数据库容器：postgres-db
- **预发布/生产环境**：使用 **Docker** (`docker` 命令)
  - 容器名称：
      - **工作站容器**：`cms-db-workstation`
      - **数据库容器**（预发布）：`rent-database-gvfzwv.1.n495txe9mw7riip8ox4zfcyqk`

### 常见操作

```bash
# 清空数据库
psql -U postgres -d cms -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# seed
pnpm seed --clean
```

## 相关文档

所有详细文档都在 `./docs` 目录：

- **QUICK_START.md** - 快速开始和首次设置
- **AUTH_GUIDE.md** - 认证系统和角色权限
- **CREDIT_INVITATION_FLOW.md** - 授信邀请码业务流程
- **DATABASE_SETUP.md** - 数据库配置
- **DATABASE_WORKSTATION.md** - 数据库工作站详细使用指南
- **USER_PERMISSIONS.md** - 权限矩阵

查看 `TODO.md` 了解待实现功能。

## 部署注意事项

### 部署架构

```
┌─────────────────┐
│   Dokploy平台   │
└────────┬────────┘
         │
    dokploy-network (外部网络)
         │
    ┌────┴────────────────────┐
    │                          │
┌───┴───┐  ┌──────────┐  ┌────┴─────┐
│  CMS  │  │ Database │  │Workstation│
│Service│  │  Service │  │ (可选)   │
└───────┘  └──────────┘  └──────────┘
```

- **CMS Service**: 生产服务，使用 standalone 模式（~500MB）
- **Database Service**: Dokploy 管理的 PostgreSQL
  - 预发布环境：`rent-database-gvfzwv.1.n495txe9mw7riip8ox4zfcyqk`
- **Workstation**: 数据库管理容器（`cms-db-workstation`），包含完整源码，用于 seed/clean 操作

### 环境说明

本项目在不同环境使用不同的容器引擎：
- **本地开发**：Podman
- **预发布/生产**：Docker（Dokploy 平台）

### 数据库初始化工作流

#### 首次部署初始化（预发布/生产环境）

```bash
# 1. 部署应用，等待所有容器启动

# 2. 执行数据库初始化（使用工作站容器）
docker exec cms-db-workstation pnpm seed

# 3. 验证初始化成功（预发布环境）
docker exec cms-db-workstation sh -c 'PGPASSWORD=$DB_PASSWORD psql -h rent-database-gvfzwv.1.n495txe9mw7riip8ox4zfcyqk -U postgress -d cms -c "SELECT COUNT(*) FROM users;"'
```

#### 本地开发环境初始化

```bash
# 使用 Podman 执行
podman exec cms-db-workstation pnpm seed

# 验证（根据实际数据库容器名称调整）
podman exec cms-db-workstation sh -c 'PGPASSWORD=$DB_PASSWORD psql -h <数据库容器名> -U postgress -d cms -c "SELECT COUNT(*) FROM users;"'
```

### Docker 配置要点

1. **Next.js Standalone 模式**
   - `next.config.mjs` 配置了 `output: 'standalone'`
   - 生产镜像只包含必要文件（~500MB vs 开发 30GB）
   - Dockerfile 使用多阶段构建

2. **多阶段构建**
   ```dockerfile
   # runner: 生产服务（精简）
   FROM base AS runner
   COPY --from=builder /app/.next/standalone ./

   # seeder: 工作站（完整源码）
   FROM base AS seeder
   COPY . .
   ENV NODE_ENV=development
   ```

3. **网络配置**
   - 必须使用 `dokploy-network`（外部网络）
   - 不要创建独立网络，否则无法访问 Dokploy 的数据库服务
   - docker-compose.yml 中声明：
   ```yaml
   networks:
     dokploy-network:
       external: true
   ```

4. **数据库 Schema 管理**
   - 开发环境：Payload 自动同步（`push: true`）
   - 生产环境：不自动同步（`push: false`）
   - 生产环境需要通过工作站手动初始化
