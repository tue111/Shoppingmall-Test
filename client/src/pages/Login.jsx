import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import useAuth from '@/hooks/useAuth.js'

const INITIAL_FORM = {
  email: '',
  password: '',
  remember: false,
}

function EyeIcon({ crossed }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      {crossed && <path d="M3 3l18 18" />}
    </svg>
  )
}

// 로그인 후 돌아갈 주소. 다른 사이트로 보내지 않도록 이 사이트 안의 경로('/...')만 허용
function safeRedirect(from) {
  return typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') ? from : '/'
}

function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  // 장바구니 등 로그인이 필요한 곳에서 보낸 경우: 돌아갈 주소(from)와 안내 문구(message)
  const redirectTo = safeRedirect(location.state?.from)
  const reason = location.state?.message
  const { user, loading, login } = useAuth()
  const [form, setForm] = useState(INITIAL_FORM)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const handleChange = (e) => {
    const { name, type, value, checked } = e.target
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.email.trim() || !form.password) {
      setError('이메일과 비밀번호를 모두 입력해 주세요.')
      return
    }

    setError(null)
    setNotice(null)
    setSubmitting(true)
    try {
      await login({ email: form.email.trim(), password: form.password, remember: form.remember })
      navigate(redirectTo, { replace: true })
    } catch (err) {
      // 401(이메일/비밀번호 불일치), 400(누락)은 서버 메시지를 그대로 사용
      setError(err.status ? err.message : '서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요.')
      setForm((prev) => ({ ...prev, password: '' }))
    } finally {
      setSubmitting(false)
    }
  }

  // 쿠키의 토큰으로 이미 유저 정보를 가져왔다면 로그인 폼 대신 원래 가려던 곳(없으면 메인)으로 보냄
  // 확인이 끝나기 전에는 폼이 잠깐 보였다 사라지지 않도록 아무것도 그리지 않음
  if (loading) return null
  if (user) return <Navigate to={redirectTo} replace />

  return (
    <section className="auth">
      <h1 className="auth-title">다시 만나 반가워요</h1>
      <p className="auth-subtitle">로그인하고 주문 내역과 적립금을 확인하세요.</p>
      {reason && (
        <p className="auth-reason" role="status">
          {reason}
        </p>
      )}

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className="field field-full">
          <label htmlFor="email">이메일</label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="bada@example.com"
            autoComplete="email"
            value={form.email}
            onChange={handleChange}
          />
        </div>

        <div className="field field-full">
          <label htmlFor="password">비밀번호</label>
          <div className="password-input">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="8자 이상"
              autoComplete="current-password"
              value={form.password}
              onChange={handleChange}
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
              aria-pressed={showPassword}
            >
              <EyeIcon crossed={showPassword} />
            </button>
          </div>
        </div>

        <div className="auth-options field-full">
          <label className="checkbox">
            <input type="checkbox" name="remember" checked={form.remember} onChange={handleChange} />
            로그인 상태 유지
          </label>
          <button type="button" className="text-button" onClick={() => setNotice('비밀번호 찾기는 준비 중이에요.')}>
            비밀번호 찾기
          </button>
        </div>

        {error && (
          <p className="auth-error field-full" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="auth-notice field-full" role="status">
            {notice}
          </p>
        )}

        <button type="submit" className="auth-submit field-full" disabled={submitting}>
          {submitting ? '로그인하는 중…' : '로그인'}
        </button>

        <p className="auth-switch field-full">
          아직 회원이 아니신가요? <Link to="/signup">회원가입</Link>
        </p>
      </form>
    </section>
  )
}

export default Login
