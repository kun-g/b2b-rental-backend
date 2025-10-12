'use client'

import React, { useState } from 'react'

/**
 * 邀请码使用页面
 * 用户可以在此页面输入邀请码并获得授信
 */
const UseInvitationCodePage: React.FC = () => {
  const [invitationCode, setInvitationCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [validating, setValidating] = useState(false)
  const [result, setResult] = useState<{
    type: 'success' | 'error' | 'info'
    message: string
    data?: unknown
  } | null>(null)

  // 验证邀请码
  const handleValidate = async () => {
    if (!invitationCode.trim()) {
      setResult({
        type: 'error',
        message: '请输入邀请码',
      })
      return
    }

    setValidating(true)
    setResult(null)

    try {
      const response = await fetch('/api/credit-invitations/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ invitation_code: invitationCode }),
      })

      const data = await response.json()

      if (data.valid) {
        setResult({
          type: 'info',
          message: `邀请码有效！商户：${data.invitation.merchant.name}，授信额度：￥${data.invitation.credit_limit}`,
          data: data.invitation,
        })
      } else {
        setResult({
          type: 'error',
          message: data.message,
        })
      }
    } catch (_error) {
      setResult({
        type: 'error',
        message: '验证失败，请稍后重试',
      })
    } finally {
      setValidating(false)
    }
  }

  // 使用邀请码
  const handleUse = async () => {
    if (!invitationCode.trim()) {
      setResult({
        type: 'error',
        message: '请输入邀请码',
      })
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/credit-invitations/use', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ invitation_code: invitationCode }),
      })

      const data = await response.json()

      if (data.success) {
        setResult({
          type: 'success',
          message: `授信成功！商户：${data.credit.merchant.name}，授信额度：￥${data.credit.credit_limit}`,
          data: data.credit,
        })
        setInvitationCode('')
      } else {
        setResult({
          type: 'error',
          message: data.message,
        })
      }
    } catch (_error) {
      setResult({
        type: 'error',
        message: '使用失败，请稍后重试',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '1rem', fontSize: '1.5rem', fontWeight: 'bold' }}>
        使用邀请码获得授信
      </h1>

      <div style={{ marginBottom: '1.5rem' }}>
        <p style={{ color: '#666', marginBottom: '1rem' }}>
          输入商户提供的邀请码，即可获得授信额度，开始租赁设备。
        </p>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label
          htmlFor="invitation-code"
          style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontWeight: '500',
          }}
        >
          邀请码
        </label>
        <input
          id="invitation-code"
          type="text"
          value={invitationCode}
          onChange={(e) => setInvitationCode(e.target.value.toUpperCase())}
          placeholder="例如：CREDIT-ABC12345"
          disabled={loading || validating}
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '1rem',
            fontFamily: 'monospace',
          }}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleUse()
            }
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <button
          onClick={handleValidate}
          disabled={loading || validating || !invitationCode.trim()}
          style={{
            flex: 1,
            padding: '0.75rem 1.5rem',
            backgroundColor: validating ? '#ccc' : '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '1rem',
            cursor: validating || !invitationCode.trim() ? 'not-allowed' : 'pointer',
            opacity: validating || !invitationCode.trim() ? 0.6 : 1,
          }}
        >
          {validating ? '验证中...' : '验证邀请码'}
        </button>

        <button
          onClick={handleUse}
          disabled={loading || validating || !invitationCode.trim()}
          style={{
            flex: 2,
            padding: '0.75rem 1.5rem',
            backgroundColor: loading ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '1rem',
            cursor: loading || !invitationCode.trim() ? 'not-allowed' : 'pointer',
            opacity: loading || !invitationCode.trim() ? 0.6 : 1,
          }}
        >
          {loading ? '处理中...' : '使用邀请码'}
        </button>
      </div>

      {result && (
        <div
          style={{
            padding: '1rem',
            borderRadius: '4px',
            backgroundColor:
              result.type === 'success'
                ? '#d4edda'
                : result.type === 'error'
                  ? '#f8d7da'
                  : '#d1ecf1',
            color:
              result.type === 'success'
                ? '#155724'
                : result.type === 'error'
                  ? '#721c24'
                  : '#0c5460',
            border: `1px solid ${
              result.type === 'success'
                ? '#c3e6cb'
                : result.type === 'error'
                  ? '#f5c6cb'
                  : '#bee5eb'
            }`,
          }}
        >
          <p style={{ margin: 0, fontSize: '0.95rem' }}>{result.message}</p>
          {result.type === 'success' && (
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', opacity: 0.8 }}>
              现在您可以开始租赁设备了！
            </p>
          )}
        </div>
      )}

      <div
        style={{
          marginTop: '2rem',
          padding: '1rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '4px',
          fontSize: '0.9rem',
          color: '#666',
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: '0.5rem', fontSize: '1rem' }}>使用说明</h3>
        <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
          <li>从商户获取邀请码（格式：CREDIT-XXXXXXXX）</li>
          <li>输入邀请码并点击「使用邀请码」</li>
          <li>系统会自动为您创建授信记录</li>
          <li>授信成功后即可开始租赁该商户的设备</li>
          <li>每个邀请码只能使用一次</li>
        </ul>
      </div>
    </div>
  )
}

export default UseInvitationCodePage
