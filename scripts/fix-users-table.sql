-- 修复 users 表结构
-- 问题：users 表中不应该有 username 字段（username 在 accounts 表中）

-- 1. 如果 users 表中有 username 字段，删除它
ALTER TABLE users DROP COLUMN IF EXISTS username;

-- 2. 确保 users 表有正确的字段
-- 如果表不存在，创建它
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
  user_type VARCHAR(50) NOT NULL,
  role VARCHAR(50) NOT NULL,
  merchant_id INTEGER REFERENCES merchants(id) ON DELETE SET NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  kyc_status VARCHAR(50),
  last_login_at TIMESTAMP,
  notes TEXT,
  updated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. 创建索引
CREATE INDEX IF NOT EXISTS users_account_id_idx ON users(account_id);
CREATE INDEX IF NOT EXISTS users_role_idx ON users(role);
CREATE INDEX IF NOT EXISTS users_merchant_id_idx ON users(merchant_id);

-- 4. 插入管理员 User（如果 account_id=1 存在且没有对应的 user）
INSERT INTO users (account_id, user_type, role, status, created_at, updated_at)
SELECT 1, 'platform', 'platform_admin', 'active', NOW(), NOW()
WHERE EXISTS (SELECT 1 FROM accounts WHERE id = 1)
  AND NOT EXISTS (SELECT 1 FROM users WHERE account_id = 1 AND role = 'platform_admin')
ON CONFLICT DO NOTHING;

-- 完成
SELECT 'Users table fixed successfully' AS result;
