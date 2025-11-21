/**
 * 直接通过 SQL 创建管理员账号
 * 用于无法通过 API 创建时的应急方案
 * 
 * 运行方式：
 * DATABASE_URI=postgresql://... node scripts/create-admin-sql.js
 */

const pg = require('pg')
const bcrypt = require('bcrypt')

const DATABASE_URI = process.env.DATABASE_URI || 'postgresql://postgress:hHvjxC24@rent-database-gvfzwv:5432/cms'

async function createAdmin() {
  const client = new pg.Client({ connectionString: DATABASE_URI })

  try {
    await client.connect()
    console.log('✅ 数据库连接成功')

    // 检查是否已有账号
    const existing = await client.query('SELECT COUNT(*) FROM accounts')
    if (parseInt(existing.rows[0].count) > 0) {
      console.log('⚠️  数据库已有账号，跳过创建')
      return
    }

    // 生成密码哈希
    const password = '123'
    const passwordHash = await bcrypt.hash(password, 10)
    console.log('✅ 密码哈希生成成功')

    // 1. 创建 Account
    const accountResult = await client.query(`
      INSERT INTO accounts (username, email, phone, password, status, updated_at, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING id
    `, ['kun', 'admin@platform.com', '13900000001', passwordHash, 'active'])

    const accountId = accountResult.rows[0].id
    console.log(`✅ 创建 Account: kun (ID: ${accountId})`)

    // 2. 创建 User
    await client.query(`
      INSERT INTO users (account_id, user_type, role, status, updated_at, created_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
    `, [accountId, 'platform', 'platform_admin', 'active'])

    console.log('✅ 创建 User: platform_admin')
    console.log('\n🎉 管理员账号创建成功！')
    console.log('登录信息:')
    console.log('  用户名: kun')
    console.log('  密码: 123')
    console.log('  登录地址: https://rental-api.speedstarsunblocked.online/admin')

  } catch (error) {
    console.error('❌ 创建失败:', error)
  } finally {
    await client.end()
  }
}

createAdmin().catch(console.error)
