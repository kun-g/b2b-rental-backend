/**
 * 完全清空数据库 - 删除所有表和类型
 * 用于重置 Neon 数据库
 */

import 'dotenv/config'
import pg from 'pg'

async function dropAllTables() {
  const dbUri = process.env.DATABASE_URI

  if (!dbUri) {
    throw new Error('❌ DATABASE_URI 未配置')
  }

  console.log('🗑️  准备清空数据库...')
  console.log(`   数据库: ${dbUri.split('@')[1]?.split('?')[0] || 'unknown'}`)
  console.log('')

  const client = new pg.Client({ connectionString: dbUri })

  try {
    await client.connect()
    console.log('✅ 数据库连接成功')

    // 删除所有表（CASCADE 会自动删除依赖）
    console.log('\n🔧 删除所有表...')
    
    const dropTablesQuery = `
      DO $$ 
      DECLARE
        r RECORD;
      BEGIN
        -- 删除所有表
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') 
        LOOP
          EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
          RAISE NOTICE 'Dropped table: %', r.tablename;
        END LOOP;
        
        -- 删除所有枚举类型
        FOR r IN (SELECT typname FROM pg_type WHERE typtype = 'e' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public'))
        LOOP
          EXECUTE 'DROP TYPE IF EXISTS public.' || quote_ident(r.typname) || ' CASCADE';
          RAISE NOTICE 'Dropped type: %', r.typname;
        END LOOP;
      END $$;
    `
    
    await client.query(dropTablesQuery)
    
    console.log('✅ 所有表和类型已删除')
    console.log('\n✅ 数据库已完全清空！')
    console.log('\n📝 下一步：')
    console.log('   1. pnpm db:push    # 创建表结构')
    console.log('   2. pnpm seed       # 初始化数据')

  } catch (error) {
    console.error('\n❌ 清空失败:', error)
    throw error
  } finally {
    await client.end()
  }
}

dropAllTables()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
