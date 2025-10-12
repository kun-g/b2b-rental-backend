// storage-adapter-import-placeholder
import { postgresAdapter } from '@payloadcms/db-postgres'
import { sqliteAdapter } from '@payloadcms/db-sqlite'
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
 * - 测试环境: SQLite (内存模式，速度快，完全隔离)
 * - 开发/生产: PostgreSQL (功能完整)
 */
function getDatabaseAdapter() {
  const isTest = process.env.NODE_ENV === 'test'

  if (isTest) {
    // 测试环境：使用 SQLite 内存数据库
    return sqliteAdapter({
      client: {
        url: 'file::memory:?cache=shared',
      },
      push: true, // 自动同步 schema
    })
  }

  // 开发/生产环境：使用 PostgreSQL
  return postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI || '',
    },
    push: process.env.NODE_ENV !== 'production', // 生产环境关闭自动同步
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
