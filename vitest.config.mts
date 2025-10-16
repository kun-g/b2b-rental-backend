import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['tests/**/*.spec.ts', 'src/**/*.test.ts'],
    exclude: ['tests/e2e/**', '**/node_modules/**'],
    globals: true,
    env: {
      NODE_ENV: 'test', // 使用 SQLite 内存数据库
    },
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: [
        'src/**/*.{ts,tsx}',
      ],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/seed/**',
        'src/payload-types.ts',
        'src/app/**', // Next.js app 目录暂时排除
        'src/collections/**', // Payload Collections 配置文件排除（hooks 和 access control 难以测试）
        'src/payload.config.ts', // Payload 配置文件排除
        'src/middleware.ts', // Next.js 中间件排除（难以单元测试）
        '**/node_modules/**',
        '**/*.d.ts',
      ],
      thresholds: {
        lines: 50,
        functions: 50,
        branches: 50,
        statements: 50,
      },
      all: true,
    },
  },
})
