# 定义

这里的 seed 指的是“种子数据/初始化脚本”，用于把数据库预置到一个已知、可复现的状态，便于本地开发、自动化测试或演示环境启动。不是“随机数种子”（random seed），尽管测试里也常顺手设置随机数种子以保证可复现。

- 用途：创建基础实体（组织、角色、管理员账号、示例 SKU/订单等），让系统“开箱可用”，并让测试在稳定初始态下运行。
- 范围：通常分为 dev seed（开发/演示环境）与 test seed（测试环境）。测试版更“轻”、更可控。
- 特性：幂等（多次执行结果一致）、确定性（无需依赖当前时间/随机数，或固定 RNG 种子）、可清理（测试后可一键回滚/清库）。

# 最佳实践
最佳实践（精简清单）
- 幂等：find → create / upsert；用唯一键（如 slug/code/email）保证重复执行不出脏数据。
- 隔离：测试数据加前缀（TEST-*），便于 teardown 精确删除。
- 事务：多表初始化用单事务包裹，避免半成品状态。
- 固定性：需要随机/时间戳时，固定 RNG（如 faker.seed(42)）与“冻结时间”，避免用例抖动。
- 分环境：seed:dev 与 seed:test 分开，生产环境严禁默认注入种子。
- 权限：测试中若需跳过访问控制，用 Local API 的 overrideAccess: true（仅限测试环境）。

# 典型做法

## Payload
``` TypeScript
// scripts/seed.ts
import { getPayload } from 'payload'
import config from '../payload.config'

export async function seed() {
  const payload = await getPayload({ config })

  // 例：幂等创建组织
  const org = await payload.find({
    collection: 'organizations',
    where: { slug: { equals: 'demo' } },
    limit: 1,
  })
  const orgId = org.docs[0]?.id ?? (await payload.create({
    collection: 'organizations',
    data: { name: 'Demo Org', slug: 'demo' },
  })).id

  // 例：幂等创建管理员
  const admin = await payload.find({
    collection: 'users',
    where: { email: { equals: 'admin@example.com' } },
    limit: 1,
  })
  if (!admin.totalDocs) {
    await payload.create({
      collection: 'users',
      data: {
        email: 'admin@example.com',
        password: 'Passw0rd!',
        role: 'admin',
        organization: orgId,
      },
      // 测试时可选择 overrideAccess: true
    })
  }

  // 例：示例 SKU
  await payload.upsert?({
    collection: 'skus',
    where: { code: { equals: 'SKU-DEMO' } },
    data: { code: 'SKU-DEMO', name: 'Demo Camera', dailyPrice: 99 },
  }) : await payload.create({ collection: 'skus', data: { code: 'SKU-DEMO', name: 'Demo Camera', dailyPrice: 99 }})
}

if (require.main === module) seed().then(() => process.exit(0))
```

在单元测试里使用
``` TypeScript
// tests/setup.ts
import { getPayload } from 'payload'
import config from '../payload.config'
import { seed } from '../scripts/seed'

export let payload: any

beforeAll(async () => {
  payload = await getPayload({ config })
  await seed()
})

afterAll(async () => {
  // 清理连接；如使用 Postgres/Neon/池化，请按适配器方式关闭
  await payload?.db?.destroy?.()
})
```
