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
  },
})
