import { PrismaClient, Role } from '@prisma/client';

/**
 * 演示数据种子脚本：创建一个租户、商户、两款 SKU、运费模板、客户用户以及授信记录。
 */
const prisma = new PrismaClient();

async function main() {
  console.info('开始写入演示数据...');

  const tenant = await prisma.tenant.upsert({
    where: { id: 'tenant_demo' },
    update: {
      name: '演示租户'
    },
    create: {
      id: 'tenant_demo',
      name: '演示租户'
    }
  });

  const merchant = await prisma.merchant.upsert({
    where: { id: 'merchant_demo' },
    update: {
      name: '演示商户',
      tenantId: tenant.id
    },
    create: {
      id: 'merchant_demo',
      name: '演示商户',
      tenantId: tenant.id
    }
  });

  const customer = await prisma.user.upsert({
    where: { email: 'customer@example.com' },
    update: {
      tenantId: tenant.id,
      role: Role.CUSTOMER
    },
    create: {
      id: 'user_demo_customer',
      email: 'customer@example.com',
      passwordHash: 'demo-password-hash',
      role: Role.CUSTOMER,
      tenantId: tenant.id
    }
  });

  await prisma.sKU.upsert({
    where: { id: 'sku_demo_camera' },
    update: {
      name: '4K 摄像机',
      pricePerDay: 29900,
      inventoryQty: 5,
      active: true
    },
    create: {
      id: 'sku_demo_camera',
      merchantId: merchant.id,
      name: '4K 摄像机',
      pricePerDay: 29900,
      inventoryQty: 5,
      active: true
    }
  });

  await prisma.sKU.upsert({
    where: { id: 'sku_demo_lens' },
    update: {
      name: '广角镜头',
      pricePerDay: 9900,
      inventoryQty: 10,
      active: true
    },
    create: {
      id: 'sku_demo_lens',
      merchantId: merchant.id,
      name: '广角镜头',
      pricePerDay: 9900,
      inventoryQty: 10,
      active: true
    }
  });

  const shippingTemplate = await prisma.shippingTemplate.upsert({
    where: { id: 'shipping_template_demo' },
    update: {
      name: '演示运费模板',
      defaultFee: 1500
    },
    create: {
      id: 'shipping_template_demo',
      merchantId: merchant.id,
      name: '演示运费模板',
      defaultFee: 1500
    }
  });

  await prisma.shippingRegionRule.upsert({
    where: { id: 'shipping_rule_demo' },
    update: {
      regionPath: 'CN/Shanghai',
      fee: 800,
      templateId: shippingTemplate.id
    },
    create: {
      id: 'shipping_rule_demo',
      templateId: shippingTemplate.id,
      regionPath: 'CN/Shanghai',
      fee: 800
    }
  });

  await prisma.shippingBlacklistRegion.upsert({
    where: { id: 'shipping_blacklist_demo' },
    update: {
      regionPath: 'CN/Tibet',
      templateId: shippingTemplate.id
    },
    create: {
      id: 'shipping_blacklist_demo',
      templateId: shippingTemplate.id,
      regionPath: 'CN/Tibet'
    }
  });

  await prisma.credit.upsert({
    where: { id: 'credit_demo' },
    update: {
      merchantId: merchant.id,
      userId: customer.id,
      limitCents: 500000,
      holdCents: 10000
    },
    create: {
      id: 'credit_demo',
      merchantId: merchant.id,
      userId: customer.id,
      limitCents: 500000,
      holdCents: 10000
    }
  });

  console.info('演示数据写入完成。');
}

main()
  .catch((error) => {
    console.error('种子脚本执行失败：', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
