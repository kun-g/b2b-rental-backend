// storage-adapter-import-placeholder
import { postgresAdapter } from '@payloadcms/db-postgres'
// 注意：sqliteAdapter 使用动态 import，避免生产环境加载不需要的模块
import { payloadCloudPlugin } from '@payloadcms/payload-cloud'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Accounts } from './collections/Accounts'
import { Users } from './collections/users'
import { Media } from './collections/Media'
import { Categories } from './collections/Categories'
import { Merchants } from './collections/Merchants'
import { MerchantSKUs } from './collections/MerchantSKUs'
import { Devices } from './collections/Devices'
import { ReturnInfo } from './collections/ReturnInfo'
import { UserMerchantCredit } from './collections/UserMerchantCredit'
import { ShippingTemplates } from './collections/ShippingTemplates'
import { Orders } from './collections/Orders'
import { Logistics } from './collections/Logistics'
import { Payments } from './collections/Payments'
import { Statements } from './collections/Statements'
import { AuditLogs } from './collections/AuditLogs'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

/**
 * 根据环境选择数据库适配器
 * - 测试环境: SQLite (内存模式，速度快，完全隔离) - 需要安装 @payloadcms/db-sqlite
 * - 开发/生产: PostgreSQL (功能完整)
 *
 * 注意：生产环境不安装 SQLite 依赖，测试需要在开发环境运行
 */
async function getDatabaseAdapter() {
  const isTest = process.env.NODE_ENV === 'test'

  if (isTest) {
    try {
      const mod = await import('@payloadcms/db-sqlite')
      const { sqliteAdapter } = mod as any
      return sqliteAdapter({
        client: {
          url: ':memory:',
        },
        push: true,
      })
    } catch (_error) {
      throw new Error(
        '测试环境需要 SQLite 依赖。请在开发环境运行测试，或安装依赖：pnpm add -D @payloadcms/db-sqlite better-sqlite3'
      )
    }
  }

  if (process.env.DEV_USE_SQLITE === 'true') {
    const mod = await import('@payloadcms/db-sqlite')
    const { sqliteAdapter } = mod as any
    return sqliteAdapter({
      client: {
        url: 'file:dev.sqlite',
      },
      push: true,
    })
  }

  return postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI || '',
    },
    push: process.env.DATABASE_PUSH === 'true' || process.env.NODE_ENV !== 'production',
  })
}

export default buildConfig({
  admin: {
    user: Accounts.slug, // 使用 Accounts 作为登录
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  // CORS 在 Payload 3.x 中由 Next.js middleware 处理（见 src/middleware.ts）
  // Payload 3.x 运行在 Next.js 之上，这里的 cors/csrf 配置不会生效
  collections: [
    // 账号管理
    Accounts, // 登录凭证
    Users, // 业务身份

    // 平台管理
    Categories,

    // 商户管理
    Merchants,
    MerchantSKUs,
    Devices,
    ReturnInfo,
    ShippingTemplates,

    // 授信管理
    UserMerchantCredit,

    // 订单管理
    Orders,
    Logistics,
    Payments,

    // 对账管理
    Statements,

    // 系统管理
    AuditLogs,
    Media,
  ],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: await getDatabaseAdapter(),
  sharp,
  plugins: [
    payloadCloudPlugin(),
    // storage-adapter-placeholder
  ],
})
