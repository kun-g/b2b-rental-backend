import { withPayload } from '@payloadcms/next/withPayload'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Your Next.js config here
  // Note: standalone mode not used - Payload CMS 3.x has compatibility issues
  // See: https://github.com/payloadcms/payload/issues/7176
  typescript: {
    // Skip type checking during build if SKIP_TYPE_CHECK is set
    ignoreBuildErrors: process.env.SKIP_TYPE_CHECK === 'true',
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
