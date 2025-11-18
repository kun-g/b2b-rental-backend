# 项目启动指南

## 快速开始

### 1. 安装依赖

```bash
npm install
# 或
pnpm install
```

### 2. 配置环境变量

复制 `.env.sample` 为 `.env`：

```bash
cp .env.sample .env
```

`.env` 文件内容：
```env
# 使用SQLite作为开发数据库（无需PostgreSQL服务）
DEV_USE_SQLITE="true"
DATABASE_URI="file:./dev.db"
PAYLOAD_SECRET="dev-payload-secret-change-in-production"
JWT_SECRET="dev-jwt-secret-change-in-production"
NODE_ENV="development"
DATABASE_PUSH="true"
```

### 3. 初始化数据库（创建种子数据）

```bash
npm run seed
```

这个命令会：
- 创建数据库表结构
- 创建测试账号
- 创建基础数据（类目、商户、SKU等）
- 创建示例订单

**重要**：首次运行必须执行此命令！

### 4. 启动开发服务器

```bash
npm run dev
```

服务将运行在：http://localhost:3000

## 测试账号

种子数据会创建以下测试账号：

### 平台端
- **平台管理员**: `kun` / `123`
- **平台运营**: `operator` / `Operator123!`

### 商户端
- **商户A管理员**: `geek_admin` / `123`
- **商户B管理员**: `tech_admin` / `123`

### 客户端
- **客户 Alice**: `alice` / `123`
- **客户 Bob**: `bob` / `123`
- **客户 Carol**: `carol` / `123`

## 创建测试订单（可选）

如果需要测试补差价支付功能，可以创建测试订单：

```bash
node scripts/create-test-orders-api.js
```

这会创建8个不同场景的测试订单（逾期、运费补差等）。

**前提条件**：
1. 后端服务必须正在运行（`npm run dev`）
2. 已经运行过 `npm run seed` 创建基础数据

## 清理测试订单

```bash
node scripts/clean-test-orders-api.js
```

## 重置数据库

如果需要完全重置数据库：

```bash
# 清空并重新创建数据
npm run seed -- --clean
```

## 常见问题

### Q1: 运行 `npm run dev` 报错 "Database not found"

**解决方案**：先运行 `npm run seed` 初始化数据库

### Q2: 登录后看不到任何数据

**解决方案**：
1. 确认已运行 `npm run seed`
2. 检查 `.env` 文件中的 `DATABASE_URI` 配置
3. 查看 `dev.db` 文件是否存在

### Q3: 端口 3000 被占用

**解决方案**：
```bash
# Windows
netstat -ano | findstr :3000
taskkill /F /PID <进程ID>

# Mac/Linux
lsof -ti:3000 | xargs kill -9
```

### Q4: 种子数据创建失败

**解决方案**：
1. 删除 `dev.db` 文件
2. 重新运行 `npm run seed`

## 项目结构

```
b2b-rental-backend/
├── src/
│   ├── collections/      # 数据模型定义
│   ├── seed/            # 种子数据
│   │   ├── data/        # 测试数据
│   │   └── index.ts     # 种子脚本
│   └── payload.config.ts
├── scripts/             # 工具脚本
│   ├── create-test-orders-api.js  # 创建测试订单
│   └── clean-test-orders-api.js   # 清理测试订单
├── dev.db              # SQLite 数据库（不提交到 Git）
├── .env                # 环境变量（不提交到 Git）
└── .env.sample         # 环境变量示例
```

## 数据库说明

项目使用 SQLite 作为开发数据库：
- **文件位置**：`dev.db`
- **不提交到 Git**：数据库文件在 `.gitignore` 中
- **每个开发者独立**：每个人拉代码后需要自己运行 `npm run seed`

## Admin Panel

启动后访问：http://localhost:3000/admin

使用任意测试账号登录即可管理数据。

## API 文档

API 端点：http://localhost:3000/api

主要 Collections：
- `/api/accounts` - 账号管理
- `/api/users` - 用户管理
- `/api/orders` - 订单管理
- `/api/payments` - 支付记录
- `/api/merchants` - 商户管理
- `/api/merchant-skus` - 商品管理

## 开发建议

1. **首次启动**：必须运行 `npm run seed`
2. **数据重置**：使用 `npm run seed -- --clean`
3. **测试订单**：使用 `node scripts/create-test-orders-api.js`
4. **环境隔离**：不要修改 `.env.sample`，只修改 `.env`

## 生产环境部署

生产环境建议使用 PostgreSQL：

```env
DATABASE_URI="postgresql://user:password@host:5432/dbname"
PAYLOAD_SECRET="your-secure-secret"
JWT_SECRET="your-secure-jwt-secret"
NODE_ENV="production"
```

**注意**：生产环境禁止运行 `npm run seed`！

## 技术栈

- **框架**：Payload CMS 3.x
- **数据库**：SQLite (开发) / PostgreSQL (生产)
- **Node.js**：18+
- **包管理器**：npm / pnpm

## 获取帮助

如果遇到问题：
1. 查看控制台错误信息
2. 检查 `.env` 配置
3. 确认已运行 `npm run seed`
4. 查看 Payload 官方文档：https://payloadcms.com/docs
