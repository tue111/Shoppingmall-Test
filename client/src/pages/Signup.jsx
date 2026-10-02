import { useState } from 'react'
import { Link } from 'react-router-dom'
import { createUser } from '@/api/users.js'

const INITIAL_FORM = {
  username: '',
  email: '',
  password: '',
  passwordConfirm: '',
  address: '',
}

const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/

function validate(form) {
  if (!form.username.trim()) return '이름을 입력해 주세요.'
  if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return '올바른 이메일 주소를 입력해 주세요.'
  if (!PASSWORD_RULE.test(form.password)) return '비밀번호는 영문, 숫자를 포함해 8자 이상이어야 해요.'
  if (form.password !== form.passwordConfirm) return '비밀번호가 일치하지 않아요.'
  return null
}

function Signup() {
  const [form, setForm] = useState(INITIAL_FORM)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [createdUser, setCreatedUser] = useState(null)

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const message = validate(form)
    if (message) {
      setError(message)
      return
    }

    setError(null)
    setSubmitting(true)
    try {
      // userController가 받는 필드(username, email, password, address)만 전송
      const user = await createUser({
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        address: form.address.trim() || undefined,
      })
      setCreatedUser(user)
    } catch (err) {
      setError(err.status === 409 ? '이미 가입된 이메일이에요.' : err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (createdUser) {
    return (
      <section className="auth">
        <h1 className="auth-title">환영해요, {createdUser.username}님</h1>
        <p className="auth-subtitle">물결상점의 이웃이 되셨어요. 첫 주문 10% 할인 쿠폰을 확인해 보세요.</p>
        <Link to="/login" className="auth-submit auth-submit-link">
          로그인하기
        </Link>
      </section>
    )
  }

  return (
    <section className="auth">
      <h1 className="auth-title">물결상점의 이웃이 되어 주세요</h1>
      <p className="auth-subtitle">가입하면 첫 주문 10% 할인 쿠폰을 드려요.</p>

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className="field field-full">
          <label htmlFor="username">이름</label>
          <input
            id="username"
            name="username"
            placeholder="김바다"
            autoComplete="name"
            value={form.username}
            onChange={handleChange}
          />
        </div>

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

        <div className="field">
          <label htmlFor="password">비밀번호</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={handleChange}
          />
          <p className="field-hint">영문, 숫자 포함 8자 이상</p>
        </div>

        <div className="field">
          <label htmlFor="passwordConfirm">비밀번호 확인</label>
          <input
            id="passwordConfirm"
            name="passwordConfirm"
            type="password"
            autoComplete="new-password"
            value={form.passwordConfirm}
            onChange={handleChange}
          />
        </div>

        <div className="field field-full">
          <label htmlFor="address">
            주소 <span className="field-optional">(선택)</span>
          </label>
          <input
            id="address"
            name="address"
            placeholder="제주특별자치도 제주시 해안로 123"
            autoComplete="street-address"
            value={form.address}
            onChange={handleChange}
          />
        </div>

        {error && (
          <p className="auth-error field-full" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="auth-submit field-full" disabled={submitting}>
          {submitting ? '가입하는 중…' : '가입하기'}
        </button>
      </form>
    </section>
  )
}

export default Signup
