import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildConfig } from 'payload';
import { postgresAdapter } from '@payloadcms/db-postgres';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

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
  collections: [
    {
      slug: 'users',
      auth: true,
      fields: [
        {
          name: 'displayName',
          type: 'text',
          required: false
        }
      ]
    }
  ],
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
