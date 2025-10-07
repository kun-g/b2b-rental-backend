# B2B 租赁后端 Monorepo

本仓库使用 pnpm 搭配 Turbo 建立 monorepo，包含以下服务：

- **Core**：基于 NestJS 的 HTTP API，提供健康检查、Swagger 文档与配置管理。
- **CMS**：基于 Payload + Next.js 的内容管理服务，包含最小页面与 Payload 管理后台。
- **Shared**：共享的 TypeScript 类型与工具。

## 环境要求

- Node.js 20+
- pnpm 8+
- Docker 与 Docker Compose

## 安装步骤

```bash
pnpm install
```

复制环境变量样例文件并按需调整：

```bash
cp .env.sample .env
```

## 启动全套服务

1. 启动 PostgreSQL、Core 与 CMS 容器：

   ```bash
   docker compose up -d
   ```

2. 在容器运行后开启本地开发模式（Core 与 CMS 同时监听）：

   ```bash
   pnpm dev
   ```

### 服务访问地址

- Core 健康检查：[http://localhost:4001/health](http://localhost:4001/health) → `{ "ok": true }`
- Core Swagger 文档：[http://localhost:4001/docs](http://localhost:4001/docs)
- CMS 页面：[http://localhost:4002](http://localhost:4002)
- Payload 管理后台：[http://localhost:4002/admin](http://localhost:4002/admin)

## 常用脚本

| 指令 | 说明 |
| --- | --- |
| `pnpm dev` | 通过 Turbo 并行运行 Core（`ts-node-dev`）与 CMS（`payload dev`）。 |
| `pnpm build` | 构建所有 packages 与 apps。 |
| `pnpm lint` | 运行 ESLint 检查整个工作区。 |
| `pnpm format` | 使用 Prettier 格式化整个工作区。 |

## 常见问题排查

- **端口已被占用**：启动前确认 `4001`、`4002` 与 `5432` 端口空闲。
- **数据库连接失败**：确认 `.env` 中的 `DATABASE_URL` 与实际运行的 PostgreSQL 一致并可访问。
- **Payload Admin 报错 schema 相关问题**：修改 CMS Schema 后执行 `pnpm build` 以重新生成类型。
- **Docker 构建缓存异常**：使用 `docker compose build --no-cache` 重新构建镜像。
