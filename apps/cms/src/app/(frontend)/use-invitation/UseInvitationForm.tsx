'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'

interface UseInvitationFormProps {
  user: any
}

export const UseInvitationForm: React.FC<UseInvitationFormProps> = ({ user }) => {
  const router = useRouter()
  const [invitationCode, setInvitationCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [validating, setValidating] = useState(false)
  const [result, setResult] = useState<{
    type: 'success' | 'error' | 'info'
    message: string
    data?: any
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
          message: `邀请码有效！\n商户：${data.invitation.merchant.name}\n授信额度：￥${data.invitation.credit_limit.toLocaleString()}`,
          data: data.invitation,
        })
      } else {
        setResult({
          type: 'error',
          message: data.message,
        })
      }
    } catch (error) {
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
          message: `🎉 授信成功！\n\n商户：${data.credit.merchant.name}\n授信额度：￥${data.credit.credit_limit.toLocaleString()}\n\n现在您可以开始租赁设备了！`,
          data: data.credit,
        })
        setInvitationCode('')

        // 3秒后跳转到首页或授信列表
        setTimeout(() => {
          router.push('/')
        }, 3000)
      } else {
        setResult({
          type: 'error',
          message: data.message,
        })
      }
    } catch (error) {
      setResult({
        type: 'error',
        message: '使用失败，请稍后重试',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        maxWidth: '600px',
        margin: '0 auto',
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '2rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 'bold', color: '#333' }}>
          使用邀请码
        </h1>
        <p style={{ marginTop: '0.5rem', color: '#666', fontSize: '0.95rem' }}>
          欢迎，{user.username || user.email}
        </p>
      </div>

      {/* Description */}
      <div
        style={{
          marginBottom: '1.5rem',
          padding: '1rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '6px',
          borderLeft: '4px solid #007bff',
        }}
      >
        <p style={{ margin: 0, color: '#555', fontSize: '0.95rem', lineHeight: '1.6' }}>
          输入商户提供的邀请码，即可获得授信额度，开始租赁设备。
        </p>
      </div>

      {/* Input */}
      <div style={{ marginBottom: '1rem' }}>
        <label
          htmlFor="invitation-code"
          style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontWeight: '600',
            color: '#333',
          }}
        >
          邀请码
        </label>
        <input
          id="invitation-code"
          type="text"
          value={invitationCode}
          onChange={(e) => setInvitationCode(e.target.value.toUpperCase())}
          placeholder="CREDIT-XXXXXXXX"
          disabled={loading || validating}
          style={{
            width: '100%',
            padding: '0.875rem',
            border: '2px solid #e0e0e0',
            borderRadius: '6px',
            fontSize: '1.1rem',
            fontFamily: 'Monaco, Consolas, monospace',
            letterSpacing: '0.05em',
            transition: 'border-color 0.2s',
            outline: 'none',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#007bff'
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#e0e0e0'
          }}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleUse()
            }
          }}
        />
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <button
          onClick={handleValidate}
          disabled={loading || validating || !invitationCode.trim()}
          style={{
            flex: 1,
            padding: '0.875rem 1.5rem',
            backgroundColor: validating ? '#ccc' : '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: validating || !invitationCode.trim() ? 'not-allowed' : 'pointer',
            opacity: validating || !invitationCode.trim() ? 0.6 : 1,
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            if (!validating && invitationCode.trim()) {
              e.currentTarget.style.backgroundColor = '#5a6268'
            }
          }}
          onMouseLeave={(e) => {
            if (!validating) {
              e.currentTarget.style.backgroundColor = '#6c757d'
            }
          }}
        >
          {validating ? '验证中...' : '验证邀请码'}
        </button>

        <button
          onClick={handleUse}
          disabled={loading || validating || !invitationCode.trim()}
          style={{
            flex: 2,
            padding: '0.875rem 1.5rem',
            backgroundColor: loading ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: loading || !invitationCode.trim() ? 'not-allowed' : 'pointer',
            opacity: loading || !invitationCode.trim() ? 0.6 : 1,
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            if (!loading && invitationCode.trim()) {
              e.currentTarget.style.backgroundColor = '#0056b3'
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              e.currentTarget.style.backgroundColor = '#007bff'
            }
          }}
        >
          {loading ? '处理中...' : '立即使用'}
        </button>
      </div>

      {/* Result Message */}
      {result && (
        <div
          style={{
            padding: '1.25rem',
            borderRadius: '6px',
            marginBottom: '1.5rem',
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
            border: `2px solid ${
              result.type === 'success'
                ? '#c3e6cb'
                : result.type === 'error'
                  ? '#f5c6cb'
                  : '#bee5eb'
            }`,
            whiteSpace: 'pre-line',
          }}
        >
          <p style={{ margin: 0, fontSize: '1rem', lineHeight: '1.6' }}>{result.message}</p>
        </div>
      )}

      {/* Instructions */}
      <div
        style={{
          padding: '1.25rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '6px',
          fontSize: '0.9rem',
          color: '#666',
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: '0.75rem', fontSize: '1rem', color: '#333' }}>
          📋 使用说明
        </h3>
        <ol style={{ margin: 0, paddingLeft: '1.5rem', lineHeight: '1.8' }}>
          <li>从商户获取邀请码（格式：CREDIT-XXXXXXXX）</li>
          <li>在上方输入框中输入邀请码</li>
          <li>点击「验证邀请码」查看详情（可选）</li>
          <li>点击「立即使用」完成授信</li>
          <li>授信成功后即可开始租赁该商户的设备</li>
        </ol>
        <p style={{ margin: '0.75rem 0 0 0', fontSize: '0.85rem', fontStyle: 'italic' }}>
          💡 提示：每个邀请码只能使用一次，请妥善保管。
        </p>
      </div>
    </div>
  )
}
