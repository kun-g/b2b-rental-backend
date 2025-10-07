import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { withPayload } from '@payloadcms/next/withPayload';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default withPayload(
  {
    reactStrictMode: true,
    typedRoutes: true,
    output: 'standalone'
  },
  {
    configPath: path.resolve(dirname, './payload.config.ts')
  }
);
