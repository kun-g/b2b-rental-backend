# 数据库设置指南

## 问题诊断

你遇到的错误：
```
Error: SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string
```

**原因**: `.env` 文件中的 `DATABASE_URI` 格式错误。

### ❌ 错误格式
```env
DATABASE_URI=postgres:///kun:password@127.0.0.1:5432/cms
```

### ✅ 正确格式
```env
DATABASE_URI=postgresql://kun:password@127.0.0.1:5432/cms
```

**注意**:
- 协议必须是 `postgresql://`（不是 `postgres://`）
- 格式：`postgresql://用户名:密码@主机:端口/数据库名`
- 如果密码包含特殊字符，需要 URL 编码

---

## 完整设置步骤

### 1. 安装 PostgreSQL

**macOS (Homebrew)**:
```bash
brew install postgresql@16
brew services start postgresql@16
```

**Ubuntu/Debian**:
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Docker** (推荐开发环境):
```bash
docker run --name postgres-cms \
  -e POSTGRES_USER=kun \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=cms \
  -p 5432:5432 \
  -d postgres:16
```

### 2. 创建数据库和用户

**方式 1: 使用 psql 命令行**
```bash
# 连接到 PostgreSQL
psql -U postgres

# 创建用户
CREATE USER kun WITH PASSWORD 'password';

# 创建数据库
CREATE DATABASE cms OWNER kun;

# 授予权限
GRANT ALL PRIVILEGES ON DATABASE cms TO kun;

# 退出
\q
```

**方式 2: 使用 Docker**
如果使用上面的 Docker 命令，数据库和用户已自动创建。

### 3. 配置环境变量

编辑 `/apps/cms/.env` 文件：

```env
# PostgreSQL 连接字符串
DATABASE_URI=postgresql://kun:password@localhost:5432/cms

# Payload 密钥（已生成，无需修改）
PAYLOAD_SECRET=50ddbce39f37c9de38c1dc5e
```

**重要提示**:
- 替换 `kun` 为你的实际用户名
- 替换 `password` 为你的实际密码
- 如果 PostgreSQL 运行在其他端口或主机，相应修改 `localhost:5432`

### 4. 测试连接

**使用 psql**:
```bash
psql postgresql://kun:password@localhost:5432/cms -c "SELECT version();"
```

**使用 Node.js**:
```bash
cd apps/cms
node -e "
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://kun:password@localhost:5432/cms'
});
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('连接失败:', err.message);
  } else {
    console.log('连接成功!', res.rows[0]);
  }
  pool.end();
});
"
```

### 5. 运行数据库迁移

Payload CMS 会自动创建表结构，但你也可以手动触发：

```bash
cd apps/cms
pnpm run payload migrate
```

如果没有 `migrate` 命令，首次启动时 Payload 会自动创建表。

### 6. 启动开发服务器

```bash
cd apps/cms
pnpm dev
```

访问 http://localhost:3000/admin 进入后台。

---

## 常见问题

### Q1: 端口 5432 被占用
```bash
# 查看占用端口的进程
lsof -i :5432

# 或者修改 PostgreSQL 端口
# 编辑 postgresql.conf，将 port 改为其他值（如 5433）
```

### Q2: 权限错误 `permission denied for database`
```sql
-- 连接到 postgres 数据库
psql -U postgres

-- 授予所有权限
GRANT ALL PRIVILEGES ON DATABASE cms TO kun;
ALTER DATABASE cms OWNER TO kun;
```

### Q3: 密码包含特殊字符
如果密码包含 `@`、`:`、`/` 等特殊字符，需要 URL 编码：

| 字符 | 编码 |
|------|------|
| @    | %40  |
| :    | %3A  |
| /    | %2F  |
| #    | %23  |

例如密码 `pass@word:123` → `pass%40word%3A123`

完整连接字符串：
```env
DATABASE_URI=postgresql://kun:pass%40word%3A123@localhost:5432/cms
```

### Q4: Docker 容器停止后数据丢失
使用数据卷持久化数据：

```bash
docker run --name postgres-cms \
  -e POSTGRES_USER=kun \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=cms \
  -p 5432:5432 \
  -v pgdata:/var/lib/postgresql/data \
  -d postgres:16
```

---

## 生产环境建议

### 1. 使用环境变量
不要在 `.env` 文件中硬编码密码，使用云服务商的密钥管理：

```bash
# AWS Secrets Manager
export DATABASE_URI=$(aws secretsmanager get-secret-value --secret-id cms-db-uri --query SecretString --output text)

# Kubernetes Secret
kubectl create secret generic cms-db \
  --from-literal=DATABASE_URI='postgresql://...'
```

### 2. 使用连接池
Payload 已内置连接池，可调整配置：

```typescript
// payload.config.ts
db: postgresAdapter({
  pool: {
    connectionString: process.env.DATABASE_URI,
    max: 20, // 最大连接数
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },
}),
```

### 3. 启用 SSL
生产环境应启用 SSL 连接：

```env
DATABASE_URI=postgresql://user:pass@host:5432/db?sslmode=require
```

### 4. 定期备份
```bash
# 备份数据库
pg_dump -U kun -d cms > backup_$(date +%Y%m%d).sql

# 恢复数据库
psql -U kun -d cms < backup_20241009.sql
```

### 5. 监控连接数
```sql
-- 查看当前连接数
SELECT count(*) FROM pg_stat_activity WHERE datname = 'cms';

-- 查看最大连接数
SHOW max_connections;
```

---

---

## Seed 数据管理

### 快速初始化（推荐）

使用 seed 命令可以一键创建完整的测试数据：

```bash
# 创建测试数据（数据库为空时）
pnpm seed

# 清空并重新创建
pnpm seed --clean

# 只清空数据库
pnpm seed:clean
```

### Seed 命令详解

| 命令 | 说明 | 使用场景 |
|------|------|----------|
| `pnpm seed` | 创建数据（已有数据会警告退出） | 首次初始化空数据库 |
| `pnpm seed --clean` | 先清空，再创建 | 重置开发环境 |
| `pnpm seed:clean` | 只清空，不创建 | 清除测试数据后手动创建 |

### 安全限制

为了防止误操作，seed 命令有以下安全检查：

1. **禁止在生产环境运行**
   ```bash
   # ❌ 这会报错
   NODE_ENV=production pnpm seed
   ```

2. **禁止操作生产数据库**
   ```bash
   # ❌ 包含 _prod 或 production 的数据库 URI 会报错
   DATABASE_URI=postgresql://user:pass@host/cms_prod pnpm seed
   ```

3. **已有数据时警告**
   ```bash
   # ✅ 如果数据库已有数据，会提示使用 --clean 参数
   pnpm seed
   # 输出: ⚠️  警告: 数据库已有数据！如需重新初始化，请使用: pnpm seed --clean
   ```

### 测试数据内容

运行 `pnpm seed` 会创建：
- 12 个用户（平台管理员、商户管理员、普通用户）
- 3 个商户（已审核、待审核）
- 7 个类目（电子设备、户外装备等）
- 7 个 SKU + 25 个设备
- 6 条授信记录
- 10 个订单（覆盖所有状态）
- 3 个邀请码
- 更多...

详细信息请查看 `src/seed/` 目录。

---

## 下一步

1. ✅ 修复数据库连接
2. 🔄 启动开发服务器
3. 🌱 使用 `pnpm seed` 创建测试数据（推荐）
4. 📝 或手动创建第一个平台管理员账号
5. 🗂️ 添加初始类目数据（如果手动创建）
6. 🏢 邀请第一个商户入驻（如果手动创建）

参考 [QUICK_START.md](./QUICK_START.md) 查看快速启动指南。
