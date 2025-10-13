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
import { UserMerchantCredit } from './collections/UserMerchantCredit'
import { CreditInvitations } from './collections/CreditInvitations'
import { CreditInvitationUsages } from './collections/CreditInvitationUsages'
import { ShippingTemplates } from './collections/ShippingTemplates'
import { Orders } from './collections/Orders'
import { Logistics } from './collections/Logistics'
import { Payments } from './collections/Payments'
import { Surcharges } from './collections/Surcharges'
import { Statements } from './collections/Statements'
import { AuditLogs } from './collections/AuditLogs'
import { validateInvitationCode } from './endpoints/validateInvitationCode'
import { useInvitationCode } from './endpoints/useInvitationCode'

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
    components: {
      views: {
        'use-invitation-code': {
          Component: './components/UseInvitationCodePage',
          path: '/use-invitation-code',
        },
      },
    },
  },
  cors: (req) => {
    const origin = req.headers.origin || req.headers.referer

    // 静态允许的域名列表
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      process.env.PAYLOAD_PUBLIC_SERVER_URL || '',
      ...(process.env.CORS_ALLOWED_ORIGINS ? process.env.CORS_ALLOWED_ORIGINS.split(',').map(o => o.trim()) : []),
    ].filter(Boolean)

    // 检查是否在静态列表中
    if (origin && allowedOrigins.includes(origin)) {
      return true
    }

    // 动态匹配 lovable.app 的所有子域名
    if (origin && /^https:\/\/.*\.lovable\.app$/.test(origin)) {
      return true
    }

    // 支持自定义的通配符域名匹配（通过环境变量 CORS_WILDCARD_DOMAINS，格式：*.example.com,*.test.com）
    const wildcardDomains = process.env.CORS_WILDCARD_DOMAINS?.split(',').map(d => d.trim()) || []
    for (const domain of wildcardDomains) {
      if (domain.startsWith('*.')) {
        const baseDomain = domain.slice(2) // 去掉 *.
        const regex = new RegExp(`^https?://.*\\.${baseDomain.replace(/\./g, '\\.')}$`)
        if (origin && regex.test(origin)) {
          return true
        }
      }
    }

    return false
  },
  csrf: (req) => {
    const origin = req.headers.origin || req.headers.referer

    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      process.env.PAYLOAD_PUBLIC_SERVER_URL || '',
      ...(process.env.CORS_ALLOWED_ORIGINS ? process.env.CORS_ALLOWED_ORIGINS.split(',').map(o => o.trim()) : []),
    ].filter(Boolean)

    if (origin && allowedOrigins.includes(origin)) {
      return true
    }

    // 同样支持 lovable.app 子域名
    if (origin && /^https:\/\/.*\.lovable\.app$/.test(origin)) {
      return true
    }

    // 支持自定义通配符域名
    const wildcardDomains = process.env.CORS_WILDCARD_DOMAINS?.split(',').map(d => d.trim()) || []
    for (const domain of wildcardDomains) {
      if (domain.startsWith('*.')) {
        const baseDomain = domain.slice(2)
        const regex = new RegExp(`^https?://.*\\.${baseDomain.replace(/\./g, '\\.')}$`)
        if (origin && regex.test(origin)) {
          return true
        }
      }
    }

    return false
  },
  collections: [
    // 账号管理
    Users,

    // 平台管理
    Categories,

    // 商户管理
    Merchants,
    MerchantSKUs,
    Devices,
    ShippingTemplates,

    // 授信管理
    UserMerchantCredit,
    CreditInvitations,
    CreditInvitationUsages,

    // 订单管理
    Orders,
    Logistics,
    Payments,
    Surcharges,

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
  endpoints: [validateInvitationCode, useInvitationCode],
})
