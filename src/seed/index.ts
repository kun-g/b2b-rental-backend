/**
 * Seed 脚本 - 创建完整的测试/演示数据
 *
 * 用法:
 *   pnpm seed              # 创建数据（如果数据库已有数据则警告退出）
 *   pnpm seed --clean      # 先清空，再创建
 *   pnpm seed:clean        # 只清空，不创建
 *
 * 环境要求:
 *   - NODE_ENV != production（禁止在生产环境运行）
 *   - DATABASE_URI 不包含 _prod 或 production
 */

import 'dotenv/config'
import { getPayload, type Payload } from 'payload'
import pg from 'pg'
import config from '../payload.config'
import { usersData } from './data/users'
import { categoriesData } from './data/categories'
import { merchantsData, merchantAdminsData } from './data/merchants'
import { skusData } from './data/skus'
import { devicesData } from './data/devices'
import { invitationsData, invitationUsagesData } from './data/invitations'
import { createOrderScenarios } from './scenarios/orders'

async function seed() {
  // ===== 安全检查 =====
  if (process.env.NODE_ENV === 'production') {
    throw new Error('❌ 禁止在生产环境运行 seed！')
  }

  const dbUri = process.env.DATABASE_URI || ''
  if (dbUri.includes('_prod') || dbUri.includes('production')) {
    throw new Error('❌ 禁止对生产数据库运行 seed！')
  }

  const args = process.argv.slice(2)
  const hasClean = args.includes('--clean')
  const cleanOnly = args.includes('--clean-only')

  console.log('📦 Seed 配置:')
  console.log(`   数据库: ${dbUri || 'SQLite (内存模式)'}`)
  console.log(`   环境: ${process.env.NODE_ENV || 'development'}`)
  console.log(`   模式: ${cleanOnly ? '仅清空' : hasClean ? '清空后创建' : '创建'}`)
  console.log('')

  // ===== 预处理：清理不兼容的数据 =====
  if ((hasClean || cleanOnly) && dbUri) {
    console.log('🔧 预处理数据库 schema 变更...')
    await prepareDatabase(dbUri)
    console.log('✅ 预处理完成')
  }

  // ===== 初始化 Payload =====
  console.log('🔌 连接数据库...')
  const payload = await getPayload({ config })
  console.log('✅ 数据库连接成功')

  try {
    // ===== 清空数据（可选）=====
    if (hasClean || cleanOnly) {
      console.log('\n🧹 清空现有数据...')
      await cleanDatabase(payload)
      console.log('✅ 数据清空完成')

      // 如果是只清空模式，直接返回
      if (cleanOnly) {
        console.log('\n✅ 清空完成！')
        return
      }
    } else {
      // 检查数据库是否已有数据
      const existingUsers = await payload.find({
        collection: 'users',
        limit: 1,
      })
      if (existingUsers.docs.length > 0) {
        console.log('\n⚠️  警告: 数据库已有数据！')
        console.log('   如需清空后创建，请使用: pnpm seed --clean')
        console.log('   如需只清空，请使用: pnpm seed:clean')
        console.log('   终止执行以避免数据冲突。')
        return
      }
    }

    // ===== 创建数据 =====
    console.log('\n🌱 开始创建 seed 数据...\n')

    // 1. 创建平台用户
    console.log('👤 创建平台用户...')
    const admin = await payload.create({
      collection: 'users',
      data: usersData.platformAdmin,
    })
    console.log(`   ✓ ${admin.email}`)

    const operator = await payload.create({
      collection: 'users',
      data: usersData.platformOperator,
    })
    console.log(`   ✓ ${operator.email}`)

    const support = await payload.create({
      collection: 'users',
      data: usersData.platformSupport,
    })
    console.log(`   ✓ ${support.email}`)

    // 2. 创建类目
    console.log('\n📂 创建类目...')
    const electronics = await payload.create({
      collection: 'categories',
      data: categoriesData.electronics,
    })
    console.log(`   ✓ ${electronics.name}`)

    const drone = await payload.create({
      collection: 'categories',
      data: {
        ...categoriesData.drone,
        parent: electronics.id,
      },
    })
    console.log(`   ✓ ${electronics.name} > ${drone.name}`)

    const camera = await payload.create({
      collection: 'categories',
      data: {
        ...categoriesData.camera,
        parent: electronics.id,
      },
    })
    console.log(`   ✓ ${electronics.name} > ${camera.name}`)

    const gimbal = await payload.create({
      collection: 'categories',
      data: {
        ...categoriesData.gimbal,
        parent: electronics.id,
      },
    })
    console.log(`   ✓ ${electronics.name} > ${gimbal.name}`)

    const outdoor = await payload.create({
      collection: 'categories',
      data: categoriesData.outdoor,
    })
    console.log(`   ✓ ${outdoor.name}`)

    const tent = await payload.create({
      collection: 'categories',
      data: {
        ...categoriesData.tent,
        parent: outdoor.id,
      },
    })
    console.log(`   ✓ ${outdoor.name} > ${tent.name}`)

    const climbing = await payload.create({
      collection: 'categories',
      data: {
        ...categoriesData.climbing,
        parent: outdoor.id,
      },
    })
    console.log(`   ✓ ${outdoor.name} > ${climbing.name}`)

    // 3. 创建商户
    console.log('\n🏪 创建商户...')
    const merchantA = await payload.create({
      collection: 'merchants',
      data: merchantsData.geekRental,
    })
    console.log(`   ✓ ${merchantA.name} (${merchantA.status})`)

    const merchantB = await payload.create({
      collection: 'merchants',
      data: merchantsData.outdoorAdventure,
    })
    console.log(`   ✓ ${merchantB.name} (${merchantB.status})`)

    const merchantC = await payload.create({
      collection: 'merchants',
      data: merchantsData.digitalTrends,
    })
    console.log(`   ✓ ${merchantC.name} (${merchantC.status})`)

    // 4. 创建商户管理员
    console.log('\n👨‍💼 创建商户管理员...')
    const merchantAdminA = await payload.create({
      collection: 'users',
      data: {
        ...merchantAdminsData.geekAdmin,
        merchant: merchantA.id,
      },
    })
    console.log(`   ✓ ${merchantAdminA.email} → ${merchantA.name}`)

    const merchantMemberA = await payload.create({
      collection: 'users',
      data: {
        ...merchantAdminsData.geekMember,
        merchant: merchantA.id,
      },
    })
    console.log(`   ✓ ${merchantMemberA.email} → ${merchantA.name}`)

    const merchantAdminB = await payload.create({
      collection: 'users',
      data: {
        ...merchantAdminsData.outdoorAdmin,
        merchant: merchantB.id,
      },
    })
    console.log(`   ✓ ${merchantAdminB.email} → ${merchantB.name}`)

    // 5. 创建运费模板
    console.log('\n🚚 创建运费模板...')
    const shippingTemplateA = await payload.create({
      collection: 'shipping-templates',
      data: {
        merchant: merchantA.id,
        name: '全国包邮计划',
        version: 1,
        is_default: true,
        status: 'active',
        default_fee: 15,
        region_rules: [
          { region_code_path: '440300', region_name: '深圳市', fee: 5 },
          { region_code_path: '440000', region_name: '广东省', fee: 10 },
          { region_code_path: '110000', region_name: '北京市', fee: 12 },
        ],
        blacklist_regions: [
          { region_code_path: '540000', region_name: '西藏自治区', reason: '物流不覆盖' },
          { region_code_path: '810000', region_name: '香港特别行政区', reason: '暂不支持' },
        ],
      },
    })
    console.log(`   ✓ ${shippingTemplateA.name} → ${merchantA.name}`)

    const shippingTemplateB = await payload.create({
      collection: 'shipping-templates',
      data: {
        merchant: merchantB.id,
        name: '标准运费',
        version: 1,
        is_default: true,
        status: 'active',
        default_fee: 20,
        region_rules: [
          { region_code_path: '310000', region_name: '上海市', fee: 10 },
          { region_code_path: '110000', region_name: '北京市', fee: 10 },
        ],
        blacklist_regions: [
          { region_code_path: '650000', region_name: '新疆维吾尔自治区', reason: '户外装备物流限制' },
          { region_code_path: '540000', region_name: '西藏自治区', reason: '高海拔地区暂不发货' },
        ],
      },
    })
    console.log(`   ✓ ${shippingTemplateB.name} → ${merchantB.name}`)

    // 6. 创建 SKU
    console.log('\n📱 创建商品 SKU...')
    const djiMini3 = await payload.create({
      collection: 'merchant-skus',
      data: {
        ...skusData.djiMini3,
        merchant: merchantA.id,
        category: drone.id,
        shipping_template: shippingTemplateA.id,
      },
    })
    console.log(`   ✓ ${djiMini3.name} → ${merchantA.name}`)

    const sonyA7M4 = await payload.create({
      collection: 'merchant-skus',
      data: {
        ...skusData.sonyA7M4,
        merchant: merchantA.id,
        category: camera.id,
        shipping_template: shippingTemplateA.id,
      },
    })
    console.log(`   ✓ ${sonyA7M4.name} (无库存) → ${merchantA.name}`)

    const djiRS3 = await payload.create({
      collection: 'merchant-skus',
      data: {
        ...skusData.djiRS3,
        merchant: merchantA.id,
        category: gimbal.id,
        shipping_template: shippingTemplateA.id,
      },
    })
    console.log(`   ✓ ${djiRS3.name} (未上架) → ${merchantA.name}`)

    const goProHero12 = await payload.create({
      collection: 'merchant-skus',
      data: {
        ...skusData.goProHero12,
        merchant: merchantA.id,
        category: camera.id,
        shipping_template: shippingTemplateA.id,
      },
    })
    console.log(`   ✓ ${goProHero12.name} (待审核) → ${merchantA.name}`)

    const tent2Person = await payload.create({
      collection: 'merchant-skus',
      data: {
        ...skusData.tent2Person,
        merchant: merchantB.id,
        category: tent.id,
        shipping_template: shippingTemplateB.id,
      },
    })
    console.log(`   ✓ ${tent2Person.name} → ${merchantB.name}`)

    const backpack60L = await payload.create({
      collection: 'merchant-skus',
      data: {
        ...skusData.backpack60L,
        merchant: merchantB.id,
        category: climbing.id,
        shipping_template: shippingTemplateB.id,
      },
    })
    console.log(`   ✓ ${backpack60L.name} → ${merchantB.name}`)

    const switchOLED = await payload.create({
      collection: 'merchant-skus',
      data: {
        ...skusData.switchOLED,
        merchant: merchantC.id,
        category: electronics.id,
        shipping_template: null, // 商户未审核，无运费模板
      },
    })
    console.log(`   ✓ ${switchOLED.name} (商户待审核) → ${merchantC.name}`)

    // 7. 创建设备
    console.log('\n📟 创建设备...')
    const djiMini3_003 = await payload.create({
      collection: 'devices',
      data: {
        ...devicesData.djiMini3_003,
        merchant_sku: djiMini3.id,
      },
    })

    const tent2Person_003 = await payload.create({
      collection: 'devices',
      data: {
        ...devicesData.tent2Person_003,
        merchant_sku: tent2Person.id,
      },
    })

    const sonyA7M4_001 = await payload.create({
      collection: 'devices',
      data: {
        ...devicesData.sonyA7M4_001,
        merchant_sku: sonyA7M4.id,
      },
    })

    // 创建其他设备
    for (const [key, deviceData] of Object.entries(devicesData)) {
      if (key === 'djiMini3_003' || key === 'tent2Person_003' || key === 'sonyA7M4_001') continue

      let skuId
      if (key.startsWith('djiMini3')) skuId = djiMini3.id
      else if (key.startsWith('sonyA7M4')) skuId = sonyA7M4.id
      else if (key.startsWith('djiRS3')) skuId = djiRS3.id
      else if (key.startsWith('goProHero12')) skuId = goProHero12.id
      else if (key.startsWith('tent2Person')) skuId = tent2Person.id
      else if (key.startsWith('backpack60L')) skuId = backpack60L.id
      else if (key.startsWith('switchOLED')) skuId = switchOLED.id

      if (!skuId) {
        console.warn(`   ⚠️  警告: 无法为设备 ${key} 找到对应的 SKU，跳过`)
        continue
      }

      await payload.create({
        collection: 'devices',
        data: {
          ...deviceData,
          merchant_sku: skuId,
        },
      })
    }
    console.log(`   ✓ 创建了 ${Object.keys(devicesData).length} 个设备`)

    // 8. 创建普通用户
    console.log('\n👥 创建普通用户...')
    const alice = await payload.create({
      collection: 'users',
      data: usersData.alice,
    })
    console.log(`   ✓ ${alice.username} (${alice.phone})`)

    const bob = await payload.create({
      collection: 'users',
      data: usersData.bob,
    })
    console.log(`   ✓ ${bob.username} (${bob.phone})`)

    const charlie = await payload.create({
      collection: 'users',
      data: usersData.charlie,
    })
    console.log(`   ✓ ${charlie.username} (${charlie.phone})`)

    const david = await payload.create({
      collection: 'users',
      data: usersData.david,
    })
    console.log(`   ✓ ${david.username} (${david.phone}) - 无授信`)

    const eve = await payload.create({
      collection: 'users',
      data: usersData.eve,
    })
    console.log(`   ✓ ${eve.username} (${eve.phone})`)

    const frank = await payload.create({
      collection: 'users',
      data: usersData.frank,
    })
    console.log(`   ✓ ${frank.username} (${frank.phone}) - KYC待认证`)

    // 9. 创建授信关系
    console.log('\n💳 创建授信关系...')
    await payload.create({
      collection: 'user-merchant-credit',
      data: {
        user: alice.id,
        merchant: merchantA.id,
        credit_limit: 10000,
        used_credit: 5000,
        status: 'active',
        source: 'manual',
      },
    })
    console.log(`   ✓ ${alice.username} × ${merchantA.name}: 10000元 (已用5000)`)

    await payload.create({
      collection: 'user-merchant-credit',
      data: {
        user: bob.id,
        merchant: merchantA.id,
        credit_limit: 8000,
        used_credit: 0,
        status: 'active',
        source: 'manual',
      },
    })
    console.log(`   ✓ ${bob.username} × ${merchantA.name}: 8000元`)

    await payload.create({
      collection: 'user-merchant-credit',
      data: {
        user: bob.id,
        merchant: merchantB.id,
        credit_limit: 6000,
        used_credit: 1500,
        status: 'active',
        source: 'manual',
      },
    })
    console.log(`   ✓ ${bob.username} × ${merchantB.name}: 6000元 (已用1500)`)

    await payload.create({
      collection: 'user-merchant-credit',
      data: {
        user: charlie.id,
        merchant: merchantB.id,
        credit_limit: 5000,
        used_credit: 0,
        status: 'disabled',
        source: 'manual',
      },
    })
    console.log(`   ✓ ${charlie.username} × ${merchantB.name}: 5000元 (已冻结)`)

    await payload.create({
      collection: 'user-merchant-credit',
      data: {
        user: eve.id,
        merchant: merchantA.id,
        credit_limit: 5000,
        used_credit: 4900,
        status: 'active',
        source: 'manual',
      },
    })
    console.log(`   ✓ ${eve.username} × ${merchantA.name}: 5000元 (已用4900，额度不足)`)

    await payload.create({
      collection: 'user-merchant-credit',
      data: {
        user: frank.id,
        merchant: merchantA.id,
        credit_limit: 3000,
        used_credit: 0,
        status: 'active',
        source: 'manual',
      },
    })
    console.log(`   ✓ ${frank.username} × ${merchantA.name}: 3000元`)

    // 10. 创建授信邀请码
    console.log('\n🎟️  创建授信邀请码...')
    const invite2024A = await payload.create({
      collection: 'credit-invitations',
      data: {
        ...invitationsData.invite2024A,
        merchant: merchantA.id,
        expires_at: invitationsData.invite2024A.expires_at(),
      },
    })
    console.log(`   ✓ ${invite2024A.invitation_code} → ${merchantA.name}`)

    const invite2024B = await payload.create({
      collection: 'credit-invitations',
      data: {
        ...invitationsData.invite2024B,
        merchant: merchantB.id,
        expires_at: invitationsData.invite2024B.expires_at(),
      },
    })
    console.log(`   ✓ ${invite2024B.invitation_code} → ${merchantB.name}`)

    const expired2023 = await payload.create({
      collection: 'credit-invitations',
      data: {
        ...invitationsData.expired2023,
        merchant: merchantA.id,
        expires_at: invitationsData.expired2023.expires_at(),
      },
    })
    console.log(`   ✓ ${expired2023.invitation_code} (已过期)`)

    // 创建邀请码使用记录
    await payload.create({
      collection: 'credit-invitation-usages',
      data: {
        ...invitationUsagesData.usage1,
        invitation: invite2024A.id,
        merchant: merchantA.id,
        invitation_code: invitationsData.invite2024A.invitation_code,
        user: alice.id,
      },
    })

    await payload.create({
      collection: 'credit-invitation-usages',
      data: {
        ...invitationUsagesData.usage2,
        invitation: invite2024A.id,
        merchant: merchantA.id,
        invitation_code: invitationsData.invite2024A.invitation_code,
        user: frank.id,
      },
    })

    await payload.create({
      collection: 'credit-invitation-usages',
      data: {
        ...invitationUsagesData.usage3,
        invitation: invite2024B.id,
        merchant: merchantB.id,
        invitation_code: invitationsData.invite2024B.invitation_code,
        user: bob.id,
      },
    })

    // 11. 创建订单场景
    await createOrderScenarios(payload, {
      users: { alice, bob, charlie },
      merchants: { merchantA, merchantB },
      skus: { djiMini3, tent2Person },
      devices: { djiMini3_003, tent2Person_003, sonyA7M4_001 },
    })

    // 12. 创建审计日志
    console.log('\n📝 创建审计日志...')
    await payload.create({
      collection: 'audit-logs',
      data: {
        entity: 'merchant',
        entity_id: String(merchantB.id),
        action: 'approve',
        operator: operator.id,
        reason: '资质审核通过',
        after_data: { status: 'approved' },
      },
    })

    await payload.create({
      collection: 'audit-logs',
      data: {
        entity: 'credit',
        entity_id: String(alice.id),
        action: 'adjust_credit',
        operator: merchantAdminA.id,
        reason: '用户信用良好，提升额度',
        before_data: { credit_limit: 5000 },
        after_data: { credit_limit: 10000 },
      },
    })

    await payload.create({
      collection: 'audit-logs',
      data: {
        entity: 'credit',
        entity_id: String(charlie.id),
        action: 'revoke_credit',
        operator: operator.id,
        reason: '风控要求',
        before_data: { status: 'active' },
        after_data: { status: 'disabled' },
      },
    })
    console.log(`   ✓ 创建了 3 条审计日志`)

    // ===== 完成 =====
    console.log('\n✅ Seed 数据创建完成！')
    console.log('\n📊 数据统计:')
    console.log(`   用户: 12 个 (3个平台 + 3个商户 + 6个租方)`)
    console.log(`   商户: 3 个 (2个已审核 + 1个待审核)`)
    console.log(`   类目: 7 个 (2个一级 + 5个二级)`)
    console.log(`   SKU: 7 个`)
    console.log(`   设备: ${Object.keys(devicesData).length} 个`)
    console.log(`   授信: 6 条`)
    console.log(`   运费模板: 2 个`)
    console.log(`   邀请码: 3 个`)
    console.log(`   订单: 10 个 (覆盖所有状态)`)
    console.log(`   审计日志: 3 条`)

    console.log('\n🔑 登录信息:')
    console.log(`   平台管理员: ${admin.email} / Admin123!`)
    console.log(`   平台运营: ${operator.email} / Operator123!`)
    console.log(`   商户A管理员: ${merchantAdminA.email} / MerchantA123!`)
    console.log(`   商户B管理员: ${merchantAdminB.email} / MerchantB123!`)

    console.log('\n📱 测试场景:')
    console.log(`   - Alice: 有商户A授信，看不到商户B`)
    console.log(`   - Bob: 有商户A和B授信，看到所有SKU`)
    console.log(`   - Charlie: 授信被冻结，看不到商户B`)
    console.log(`   - David: 无任何授信，看不到任何SKU`)
    console.log(`   - Eve: 额度不足，无法租18000元的相机`)
  } catch (error) {
    console.error('\n❌ Seed 失败:', error)
    throw error
  }
}

/**
 * 预处理数据库 - 处理 schema 变更前的数据清理
 * 解决从旧 schema 迁移到新 schema 时的数据兼容问题
 */
async function prepareDatabase(dbUri: string) {
  const client = new pg.Client({ connectionString: dbUri })

  try {
    await client.connect()

    // 1. 给 phone 为 null 的用户填充临时值（因为我们把 phone 改成了必填）
    const updateResult = await client.query(`
      UPDATE users
      SET phone = CONCAT('temp_', id::text)
      WHERE phone IS NULL
    `)
    if (updateResult.rowCount && updateResult.rowCount > 0) {
      console.log(`   ✓ 修复了 ${updateResult.rowCount} 个用户的 phone 字段`)
    }

    // 2. 删除 merchant_role 列（如果存在）
    await client.query(`
      ALTER TABLE users DROP COLUMN IF EXISTS merchant_role
    `)
    console.log(`   ✓ 删除了 merchant_role 字段（如果存在）`)

  } catch (error) {
    console.warn('   ⚠️  预处理警告:', error)
    // 不抛出错误，因为某些情况下表可能不存在
  } finally {
    await client.end()
  }
}

/**
 * 清空数据库
 */
async function cleanDatabase(payload: Payload) {
  const collections = [
    'audit-logs',
    'statements',
    'surcharges',
    'payments',
    'logistics',
    'orders',
    'credit-invitation-usages',
    'credit-invitations',
    'user-merchant-credit',
    'devices',
    'merchant-skus',
    'shipping-templates',
    'merchants',
    'categories',
    'users',
    'media',
  ] as const

  for (const collection of collections) {
    try {
      const result = await payload.find({
        collection,
        limit: 1000,
      })

      for (const doc of result.docs) {
        await payload.delete({
          collection,
          id: doc.id,
        })
      }

      if (result.docs.length > 0) {
        console.log(`   清理 ${collection}: ${result.docs.length} 条`)
      }
    } catch (err) {
      // 忽略错误（可能是集合不存在）
      const error = err as Error
      if (!error.message?.includes('not found')) {
        console.warn(`   警告: 清理 ${collection} 失败 -`, error.message)
      }
    }
  }
}

// 执行
seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
