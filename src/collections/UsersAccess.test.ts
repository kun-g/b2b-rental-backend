import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getPayload, Payload } from 'payload'
import config from '@/payload.config'

let payload: Payload
let platformAccount: any
let testAllAccount: any
let merchant: any

describe('Users Access - merchant admin self can read customer identity', () => {
  beforeAll(async () => {
    const payloadConfig = await config
    payload = await getPayload({ config: payloadConfig })

    platformAccount = await payload.create({
      collection: 'accounts',
      data: {
        username: 'test_platform_for_users_access',
        phone: '13899990001',
        password: 'admin123',
        status: 'active',
      },
    })

    await payload.create({
      collection: 'users',
      data: {
        account: platformAccount.id,
        user_type: 'platform',
        role: 'platform_admin',
        status: 'active',
      },
    })

    merchant = await payload.create({
      collection: 'merchants',
      data: {
        name: '测试商户-UsersAccess',
        contact: { name: '测试', phone: '13800000000' },
        status: 'approved',
      },
      user: platformAccount,
    })

    testAllAccount = await payload.create({
      collection: 'accounts',
      data: {
        username: 'test_all_users_access',
        phone: '13899990002',
        password: '123',
        status: 'active',
      },
    })

    await payload.create({
      collection: 'users',
      data: {
        account: testAllAccount.id,
        user_type: 'merchant',
        role: 'merchant_admin',
        status: 'active',
        merchant: merchant.id,
      },
    })

    await payload.create({
      collection: 'users',
      data: {
        account: testAllAccount.id,
        user_type: 'customer',
        role: 'customer',
        status: 'active',
      },
    })
  })

  afterAll(async () => {
    try {
      const users = await payload.find({
        collection: 'users',
        where: {
          account: { equals: testAllAccount.id },
        },
        limit: 100,
      })
      for (const u of users.docs) {
        await payload.delete({ collection: 'users', id: u.id })
      }
    } catch {}

    try {
      await payload.delete({ collection: 'accounts', id: testAllAccount.id })
    } catch {}

    try {
      const platformUsers = await payload.find({
        collection: 'users',
        where: { account: { equals: platformAccount.id } },
        limit: 100,
      })
      for (const u of platformUsers.docs) {
        await payload.delete({ collection: 'users', id: u.id })
      }
    } catch {}

    try {
      await payload.delete({ collection: 'accounts', id: platformAccount.id })
    } catch {}

    try {
      await payload.delete({ collection: 'merchants', id: merchant.id, user: platformAccount })
    } catch {}
  })

  it('returns both merchant_admin and customer identities via accounts join', async () => {
    const account = await payload.findByID({
      collection: 'accounts',
      id: testAllAccount.id,
      overrideAccess: false,
      user: testAllAccount,
      depth: 2,
    })

    const joined = (account as any).users
    const docs = Array.isArray(joined?.docs) ? joined.docs : []
    const roles = docs.map((u: any) => u.role)
    expect(roles).toContain('merchant_admin')
    expect(roles).toContain('customer')
  })
})