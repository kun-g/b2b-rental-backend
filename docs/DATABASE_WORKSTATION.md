# 数据库工作站使用指南

## 概述

`db-workstation` 是一个常驻运行的工具容器，包含完整的项目源码和依赖，用于执行数据库相关操作。

## 使用方式

### 1. 进入工作站容器

```bash
docker exec -it cms-db-workstation sh
```

### 2. 执行数据库操作

#### 初始化数据库（创建测试数据）

```bash
# 在容器内执行
pnpm seed

# 或者从外部直接执行
docker exec cms-db-workstation pnpm seed
```

#### 清空数据库

```bash
# 在容器内执行
pnpm seed:clean

# 或者
pnpm seed --clean
```

#### 清空后重新创建

```bash
# 在容器内执行
pnpm seed --clean
```

### 3. 其他可用命令

```bash
# 生成类型定义
pnpm generate:types

# 生成 import map
pnpm generate:importmap

# 运行测试（注意：测试使用 SQLite，不会影响生产数据库）
pnpm test:int

# 直接使用 psql 连接数据库
PGPASSWORD=hHvjxC24 psql -h rent-database-gvfzwv -U postgress -d cms
```

### 4. 查看环境信息

```bash
# 在容器内
echo $DATABASE_URI
echo $NODE_ENV
```

## 常见场景

### 场景 2：重置数据库

```bash
# 清空所有数据并重新创建
docker exec cms-db-workstation pnpm seed --clean
```

### 场景 3：只清空数据

```bash
# 只删除所有数据，不创建新数据
docker exec cms-db-workstation pnpm seed:clean
```

### 场景 4：调试数据库问题

```bash
# 进入容器
docker exec -it cms-db-workstation sh

# 手动测试连接
nc -zv rent-database-gvfzwv 5432

# 查看数据库表
PGPASSWORD=hHvjxC24 psql -h rent-database-gvfzwv -U postgress -d cms -c "\dt"

# 查询用户数量
PGPASSWORD=hHvjxC24 psql -h rent-database-gvfzwv -U postgress -d cms -c "SELECT COUNT(*) FROM users;"
```

## 安全注意事项

1. **工作站不应长期启用** - 包含完整源码，仅在需要时启用
2. **生产环境谨慎使用 seed** - seed 脚本有安全检查，但仍需小心

## 容器信息

- **容器名称**: `cms-db-workstation`
- **基础镜像**: Node.js 22.17.0-alpine
- **网络**: dokploy-network
- **工作目录**: `/app`
- **包含内容**:
  - 完整源代码 (`/app/src/`)
  - 所有依赖 (`/app/node_modules/`)
  - pnpm 包管理器
  - TypeScript 执行器 (tsx)

## 故障排查

### 问题：容器无法启动

检查日志：
```bash
docker logs cms-db-workstation
```

### 问题：无法连接数据库

```bash
# 进入容器测试
docker exec -it cms-db-workstation sh
nc -zv rent-database-gvfzwv 5432
getent hosts rent-database-gvfzwv
```

### 问题：seed 执行失败

```bash
# 查看完整错误信息
docker exec cms-db-workstation pnpm seed 2>&1

# 检查数据库连接字符串
docker exec cms-db-workstation sh -c 'echo $DATABASE_URI'
```
