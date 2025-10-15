// storage-adapter-import-placeholder
import { postgresAdapter } from '@payloadcms/db-postgres'
import { payloadCloudPlugin } from '@payloadcms/payload-cloud'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

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
 * - 测试环境: SQLite (内存模式，速度快，完全隔离) - 需在开发环境运行
 * - 开发/生产: PostgreSQL (功能完整)
 */
function getDatabaseAdapter() {
  const isTest = process.env.NODE_ENV === 'test'

  if (isTest) {
    // 测试环境需要 SQLite，在生产构建中不可用
    // 请在开发环境运行测试
    throw new Error(
      'SQLite adapter is not available in production build. Please run tests in development environment.'
    )
  }

  // 开发/生产环境：使用 PostgreSQL
  return postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI || '',
    },
    // 允许通过 DATABASE_PUSH 环境变量控制是否自动同步
    push: process.env.DATABASE_PUSH === 'true' || process.env.NODE_ENV !== 'production',
  })
}

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  // CORS 在 Payload 3.x 中由 Next.js middleware 处理（见 src/middleware.ts）
  // Payload 3.x 运行在 Next.js 之上，这里的 cors/csrf 配置不会生效
  collections: [
    // 账号管理
    Users,

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
  db: getDatabaseAdapter(),
  sharp,
  plugins: [
    payloadCloudPlugin(),
    // storage-adapter-placeholder
  ],
})
