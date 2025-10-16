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
import { accountsData, usersData } from './data/users'
import { categoriesData } from './data/categories'
import { merchantsData, merchantAccountsData, merchantUsersData } from './data/merchants'
import { skusData } from './data/skus'
import { devicesData } from './data/devices'
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
      const existingAccounts = await payload.find({
        collection: 'accounts',
        limit: 1,
      })
      if (existingAccounts.docs.length > 0) {
        console.log('\n⚠️  警告: 数据库已有数据！')
        console.log('   如需清空后创建，请使用: pnpm seed --clean')
        console.log('   如需只清空，请使用: pnpm seed:clean')
        console.log('   终止执行以避免数据冲突。')
        return
      }
    }

    // ===== 创建数据 =====
    console.log('\n🌱 开始创建 seed 数据...\n')

    // 1. 创建平台 Accounts 和 Users
    console.log('👤 创建平台用户（Accounts + Users）...')

    // 1.1 创建平台管理员 Account
    const adminAccount = await payload.create({
      collection: 'accounts',
      data: accountsData.platformAdmin,
    })

    // 1.2 创建平台管理员 User（关联到 Account）
    const admin = await payload.create({
      collection: 'users',
      data: {
        ...usersData.platformAdmin,
        account: adminAccount.id,
      },
    })
    console.log(`   ✓ ${adminAccount.username} (${admin.role})`)

    // 1.3 创建平台运营 Account
    const operatorAccount = await payload.create({
      collection: 'accounts',
      data: accountsData.platformOperator,
    })

    // 1.4 创建平台运营 User（关联到 Account）
    const operator = await payload.create({
      collection: 'users',
      data: {
        ...usersData.platformOperator,
        account: operatorAccount.id,
      },
    })
    console.log(`   ✓ ${operatorAccount.username} (${operator.role})`)

    // 1.5 创建平台客服 Account
    const supportAccount = await payload.create({
      collection: 'accounts',
      data: accountsData.platformSupport,
    })

    // 1.6 创建平台客服 User（关联到 Account）
    const support = await payload.create({
      collection: 'users',
      data: {
        ...usersData.platformSupport,
        account: supportAccount.id,
      },
    })
    console.log(`   ✓ ${supportAccount.username} (${support.role})`)

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

    // 4. 创建商户管理员（Accounts + Users）
    console.log('\n👨‍💼 创建商户管理员（Accounts + Users）...')

    // 4.1 商户A管理员
    const merchantAdminAAccount = await payload.create({
      collection: 'accounts',
      data: merchantAccountsData.geekAdmin,
    })
    const merchantAdminA = await payload.create({
      collection: 'users',
      data: {
        ...merchantUsersData.geekAdmin,
        account: merchantAdminAAccount.id,
        merchant: merchantA.id,
      },
    })
    console.log(`   ✓ ${merchantAdminAAccount.username} (${merchantAdminA.role}) → ${merchantA.name}`)

    // 4.2 商户A成员
    const merchantMemberAAccount = await payload.create({
      collection: 'accounts',
      data: merchantAccountsData.geekMember,
    })
    const merchantMemberA = await payload.create({
      collection: 'users',
      data: {
        ...merchantUsersData.geekMember,
        account: merchantMemberAAccount.id,
        merchant: merchantA.id,
      },
    })
    console.log(`   ✓ ${merchantMemberAAccount.username} (${merchantMemberA.role}) → ${merchantA.name}`)

    // 4.3 商户B管理员
    const merchantAdminBAccount = await payload.create({
      collection: 'accounts',
      data: merchantAccountsData.outdoorAdmin,
    })
    const merchantAdminB = await payload.create({
      collection: 'users',
      data: {
        ...merchantUsersData.outdoorAdmin,
        account: merchantAdminBAccount.id,
        merchant: merchantB.id,
      },
    })
    console.log(`   ✓ ${merchantAdminBAccount.username} (${merchantAdminB.role}) → ${merchantB.name}`)

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

    // 6. 创建归还信息
    console.log('\n📍 创建归还信息...')
    const returnInfoA = await payload.create({
      collection: 'return-info',
      data: {
        merchant: merchantA.id,
        return_contact_name: '张伟',
        return_contact_phone: '13900001111',
        return_address: {
          province: '广东省',
          city: '深圳市',
          district: '南山区',
          address: '科技园南区深圳湾科技生态园10栋B座2001室',
          postal_code: '518000',
        },
        status: 'active',
        is_default: true,
        notes: '工作日9:00-18:00接收，请提前联系',
      },
    })
    console.log(`   ✓ ${returnInfoA.return_contact_name} (${returnInfoA.return_address.city}) → ${merchantA.name}`)

    const returnInfoB1 = await payload.create({
      collection: 'return-info',
      data: {
        merchant: merchantB.id,
        return_contact_name: '李娜',
        return_contact_phone: '13900002222',
        return_address: {
          province: '上海市',
          city: '上海市',
          district: '浦东新区',
          address: '张江高科技园区祖冲之路2277号',
          postal_code: '201203',
        },
        status: 'active',
        is_default: true,
        notes: '全天候收货，请联系前台',
      },
    })
    console.log(`   ✓ ${returnInfoB1.return_contact_name} (${returnInfoB1.return_address.city}) → ${merchantB.name}`)

    // 商户B的第二个归还地址（备用）
    const returnInfoB2 = await payload.create({
      collection: 'return-info',
      data: {
        merchant: merchantB.id,
        return_contact_name: '王强',
        return_contact_phone: '13900003333',
        return_address: {
          province: '北京市',
          city: '北京市',
          district: '海淀区',
          address: '中关村大街27号中关村大厦18层',
          postal_code: '100080',
        },
        status: 'active',
        is_default: false,
        notes: '北京分仓，工作日10:00-17:00',
      },
    })
    console.log(`   ✓ ${returnInfoB2.return_contact_name} (${returnInfoB2.return_address.city}) → ${merchantB.name}`)

    // 7. 创建 SKU
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

    // 8. 创建普通用户（Accounts + Users）
    console.log('\n👥 创建普通用户（Accounts + Users）...')

    // 8.1 Alice
    const aliceAccount = await payload.create({
      collection: 'accounts',
      data: accountsData.alice,
    })
    const alice = await payload.create({
      collection: 'users',
      data: {
        ...usersData.alice,
        account: aliceAccount.id,
      },
    })
    console.log(`   ✓ ${aliceAccount.username} (${aliceAccount.phone})`)

    // 8.2 Bob
    const bobAccount = await payload.create({
      collection: 'accounts',
      data: accountsData.bob,
    })
    const bob = await payload.create({
      collection: 'users',
      data: {
        ...usersData.bob,
        account: bobAccount.id,
      },
    })
    console.log(`   ✓ ${bobAccount.username} (${bobAccount.phone})`)

    // 8.3 Charlie
    const charlieAccount = await payload.create({
      collection: 'accounts',
      data: accountsData.charlie,
    })
    const charlie = await payload.create({
      collection: 'users',
      data: {
        ...usersData.charlie,
        account: charlieAccount.id,
      },
    })
    console.log(`   ✓ ${charlieAccount.username} (${charlieAccount.phone})`)

    // 8.4 David - 无授信
    const davidAccount = await payload.create({
      collection: 'accounts',
      data: accountsData.david,
    })
    const _david = await payload.create({
      collection: 'users',
      data: {
        ...usersData.david,
        account: davidAccount.id,
      },
    })
    console.log(`   ✓ ${davidAccount.username} (${davidAccount.phone}) - 无授信`)

    // 8.5 Eve
    const eveAccount = await payload.create({
      collection: 'accounts',
      data: accountsData.eve,
    })
    const eve = await payload.create({
      collection: 'users',
      data: {
        ...usersData.eve,
        account: eveAccount.id,
      },
    })
    console.log(`   ✓ ${eveAccount.username} (${eveAccount.phone})`)

    // 8.6 Frank - KYC待认证
    const frankAccount = await payload.create({
      collection: 'accounts',
      data: accountsData.frank,
    })
    const frank = await payload.create({
      collection: 'users',
      data: {
        ...usersData.frank,
        account: frankAccount.id,
      },
    })
    console.log(`   ✓ ${frankAccount.username} (${frankAccount.phone}) - KYC待认证`)

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

    // 10. 创建多角色用户（演示一个账号多个身份）
    console.log('\n🎭 创建多角色用户（演示一个账号拥有多个业务身份）...')

    // 10.1 kun (平台管理员) 添加 customer 身份
    const adminCustomerUser = await payload.create({
      collection: 'users',
      data: {
        account: adminAccount.id,
        user_type: 'customer',
        role: 'customer',
        status: 'active',
      },
    })
    console.log(`   ✓ ${adminAccount.username}: platform_admin + customer (2个身份)`)

    // 10.2 bob 添加 merchant_member 身份（商户A的成员）
    const bobMerchantUser = await payload.create({
      collection: 'users',
      data: {
        account: bobAccount.id,
        user_type: 'merchant',
        role: 'merchant_member',
        merchant: merchantA.id,
        status: 'active',
      },
    })
    console.log(`   ✓ ${bobAccount.username}: customer + merchant_member (2个身份，可在商户A工作)`)

    // 10.3 geek_admin (商户A管理员) 添加 customer 身份
    const geekAdminCustomerUser = await payload.create({
      collection: 'users',
      data: {
        account: merchantAdminAAccount.id,
        user_type: 'customer',
        role: 'customer',
        status: 'active',
      },
    })
    console.log(
      `   ✓ ${merchantAdminAAccount.username}: merchant_admin + customer (2个身份，既管理商户又能租设备)`,
    )

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
    console.log(`   Accounts: 12 个 (登录凭证)`)
    console.log(`   Users: 15 个 (业务身份: 4个平台 + 4个商户 + 7个租方)`)
    console.log(`   多角色账号: 3 个 (kun、bob、geek_admin 各有 2 个身份)`)
    console.log(`   商户: 3 个 (2个已审核 + 1个待审核)`)
    console.log(`   类目: 7 个 (2个一级 + 5个二级)`)
    console.log(`   SKU: 7 个`)
    console.log(`   设备: ${Object.keys(devicesData).length} 个`)
    console.log(`   授信: 6 条`)
    console.log(`   运费模板: 2 个`)
    console.log(`   归还信息: 3 个 (商户A:1个 + 商户B:2个)`)
    console.log(`   订单: 10 个 (覆盖所有状态)`)
    console.log(`   审计日志: 3 条`)

    console.log('\n🔑 登录信息:')
    console.log(`   平台管理员: ${adminAccount.username} / ${accountsData.platformAdmin.password}`)
    console.log(`   平台运营: ${operatorAccount.username} / ${accountsData.platformOperator.password}`)
    console.log(`   商户A管理员: ${merchantAdminAAccount.username} / ${merchantAccountsData.geekAdmin.password}`)
    console.log(`   商户B管理员: ${merchantAdminBAccount.username} / ${merchantAccountsData.outdoorAdmin.password}`)

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


    // 先删除有外键依赖的表
    await client.query('DROP TABLE IF EXISTS user_merchant_credit CASCADE;')
    await client.query('DROP TABLE IF EXISTS audit_logs CASCADE;')
    await client.query('DROP TABLE IF EXISTS merchant_skus CASCADE;')
    await client.query('DROP TABLE IF EXISTS orders CASCADE;')
    await client.query('DROP TABLE IF EXISTS orders_rels CASCADE;')
    await client.query('DROP TABLE IF EXISTS payload_preferences_rels CASCADE;')
    await client.query('DROP TABLE IF EXISTS payload_preferences CASCADE;')

    // 删除 users 和 accounts 表
    await client.query('DROP TABLE IF EXISTS users CASCADE;')
    await client.query('DROP TABLE IF EXISTS accounts CASCADE;')

    // 删除相关枚举类型
    await client.query('DROP TYPE IF EXISTS enum_users_role CASCADE;')
    await client.query('DROP TYPE IF EXISTS enum_users_status CASCADE;')
    await client.query('DROP TYPE IF EXISTS enum_users_kyc_status CASCADE;')
    await client.query('DROP TYPE IF EXISTS enum_users_user_type CASCADE;')
    await client.query('DROP TYPE IF EXISTS enum_accounts_status CASCADE;')

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
    'payments',
    'logistics',
    'orders',
    'user-merchant-credit',
    'devices',
    'merchant-skus',
    'return-info',
    'shipping-templates',
    'merchants',
    'categories',
    'users',    // 必须先删除 users（有外键指向 accounts）
    'accounts', // 后删除 accounts
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
