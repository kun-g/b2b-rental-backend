// storage-adapter-import-placeholder
import { postgresAdapter } from '@payloadcms/db-postgres'
import { payloadCloudPlugin } from '@payloadcms/payload-cloud'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Categories } from './collections/Categories'
import { Merchants } from './collections/Merchants'
import { MerchantSKUs } from './collections/MerchantSKUs'
import { Devices } from './collections/Devices'
import { UserMerchantCredit } from './collections/UserMerchantCredit'
import { ShippingTemplates } from './collections/ShippingTemplates'
import { Orders } from './collections/Orders'
import { Logistics } from './collections/Logistics'
import { Payments } from './collections/Payments'
import { Surcharges } from './collections/Surcharges'
import { Statements } from './collections/Statements'
import { AuditLogs } from './collections/AuditLogs'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    // 限制只有平台人员（管理员、运营、客服、商户）可以访问 Admin 后台
    // 普通用户（customer）无法访问
    access: {
      '/': ({ req }) => {
        const allowedRoles = [
          'platform_admin',
          'platform_operator',
          'platform_support',
          'merchant_admin',
          'merchant_member',
        ]
        return allowedRoles.includes(req.user?.role)
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
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI || '',
    },
  }),
  sharp,
  plugins: [
    payloadCloudPlugin(),
    // storage-adapter-placeholder
  ],
})
