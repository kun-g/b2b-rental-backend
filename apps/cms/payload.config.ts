import { fileURLToPath } from 'node:url';
import path from 'node:path';
import dotenv from 'dotenv';
import { postgresAdapter } from '@payloadcms/db-postgres';
import { buildConfig } from 'payload';
import { Tenants } from './src/collections/tenants';
import { TenantPages } from './src/collections/tenantPages';
import { Users } from './src/collections/users';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

// 在 CLI 环境下默认加载仓库根目录的 .env，避免 Payload dev/start 缺少密钥配置。
dotenv.config({
  path: process.env.CMS_ENV_PATH ?? path.resolve(dirname, '../../.env')
});

export default buildConfig({
  serverURL: process.env.CMS_PUBLIC_URL ?? `http://localhost:${process.env.CMS_PORT ?? 4002}`,
  admin: {
    user: 'users',
    components: {
      graphics: {
        Logo: path.resolve(dirname, './src/components/Logo.tsx')
      }
    }
  },
  bin: [
    {
      key: 'dev',
      scriptPath: path.resolve(dirname, './src/bin/dev.ts')
    },
    {
      key: 'build',
      scriptPath: path.resolve(dirname, './src/bin/build.ts')
    },
    {
      key: 'start',
      scriptPath: path.resolve(dirname, './src/bin/start.ts')
    }
  ],
  collections: [Tenants, Users, TenantPages],
  cors: [process.env.CORE_ORIGIN ?? 'http://localhost:4001'],
  csrf: [process.env.CORE_ORIGIN ?? 'http://localhost:4001'],
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL ?? ''
    }
  }),
  secret: process.env.PAYLOAD_SECRET || (() => {
    throw new Error('PAYLOAD_SECRET environment variable is required');
  })(),
  typescript: {
  }
});
