/**
 * Vitest 全局 Setup
 *
 * 测试环境配置：
 * - NODE_ENV=test（vitest.config.mts 中设置）
 * - 数据库：SQLite 内存模式（payload.config.ts 自动切换）
 * - 每个测试文件独立初始化 Payload 实例
 */

// Load .env files
import 'dotenv/config'

// 全局测试超时（可选）
// import { vi } from 'vitest'
// vi.setConfig({ testTimeout: 30000 })
