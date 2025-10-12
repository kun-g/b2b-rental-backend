import { headers as getHeaders } from 'next/headers.js'
import { getPayload } from 'payload'
import { redirect } from 'next/navigation'
import config from '@/payload.config'
import { UseInvitationForm } from './UseInvitationForm'

export default async function UseInvitationPage() {
  const headers = await getHeaders()
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })
  const { user } = await payload.auth({ headers })

  // 如果未登录，重定向到登录页
  if (!user) {
    redirect(`${payloadConfig.routes.admin}/login?redirect=/use-invitation`)
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', padding: '2rem' }}>
      <UseInvitationForm user={user} />
    </div>
  )
}
