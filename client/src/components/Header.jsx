import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useAuth from '@/hooks/useAuth.js'
import useCart from '@/hooks/useCart.js'

const NAV_ITEMS = [
  { label: '신상품', to: '/products' },
  { label: '의류', to: '/products' },
  { label: '리빙', to: '/products' },
  { label: '이야기', to: '/#story' },
]

function Icon({ children }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  )
}

const SearchIcon = () => (
  <Icon>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Icon>
)

const UserIcon = () => (
  <Icon>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </Icon>
)

const BagIcon = () => (
  <Icon>
    <path d="M5 8h14l-1 12H6L5 8Z" />
    <path d="M9 8V6a3 3 0 0 1 6 0v2" />
  </Icon>
)

function UserMenu({ user }) {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(null)
  const menuRef = useRef(null)
  const buttonRef = useRef(null)

  // 메뉴 밖을 클릭하거나 Esc를 누르면 닫기
  useEffect(() => {
    if (!open) return
    const handlePointerDown = (e) => {
      if (!menuRef.current?.contains(e.target)) setOpen(false)
    }
    const handleKeyDown = (e) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      buttonRef.current?.focus()
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const handleLogout = async () => {
    setError(null)
    setPending(true)
    try {
      await logout()
      navigate('/', { replace: true })
    } catch {
      // 서버가 토큰을 폐기하지 못했으면 로그인 상태를 유지하고 다시 시도하게 함
      setError('로그아웃에 실패했어요. 다시 시도해 주세요.')
      setPending(false)
    }
  }

  return (
    <div className="user-menu" ref={menuRef}>
      <button
        type="button"
        ref={buttonRef}
        className="user-menu-button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="user-menu-list"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="user-menu-label">
          <strong>{user.username}</strong>님 반갑습니다.
        </span>
        <svg className="user-menu-caret" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div id="user-menu-list" className="user-menu-list" role="menu">
          <Link to="/mypage" role="menuitem" className="user-menu-item" onClick={() => setOpen(false)}>
            주문 내역
          </Link>
          <button type="button" role="menuitem" className="user-menu-item" onClick={handleLogout} disabled={pending}>
            {pending ? '로그아웃하는 중…' : '로그아웃'}
          </button>
          {error && (
            <p className="user-menu-error" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// 로그인한 회원에게만 표시. 담긴 상품 종류 수를 배지로 보여줌 (99개 초과는 99+)
function CartLink() {
  const { count } = useCart()
  const label = count > 0 ? `장바구니, 상품 ${count}개` : '장바구니'

  return (
    <Link to="/cart" className="icon-button cart-link" aria-label={label}>
      <BagIcon />
      {count > 0 && (
        <span className="cart-badge" aria-hidden="true">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )
}

function Header() {
  // AuthProvider가 앱 시작 시 토큰(쿠키)으로 /auth/me를 호출해 채워 둔 유저 정보
  const { user, loading } = useAuth()
  const isAdmin = user?.user_type === 'admin'

  return (
    <header className="header">
      <div className="container header-inner">
        <Link to="/" className="logo">
          물결상점
        </Link>

        <nav className="nav" aria-label="주요 메뉴">
          {NAV_ITEMS.map((item) => (
            <Link key={item.label} to={item.to}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="header-actions">
          {/* 로그인 상태 확인이 끝나기 전에는 비로그인 UI가 깜빡이지 않도록 계정 영역을 비워 둠 */}
          {!loading && isAdmin && (
            <Link to="/admin" className="admin-link">
              {/* 좁은 화면에서는 인사말 자리를 확보하도록 짧은 문구로 표시 */}
              <span className="admin-link-full">관리자 페이지</span>
              <span className="admin-link-short">관리자</span>
            </Link>
          )}
          {!loading && user && <UserMenu user={user} />}
          <Link to="/products" className="icon-button icon-search" aria-label="상품 둘러보기">
            <SearchIcon />
          </Link>
          {!loading && !user && (
            <Link to="/login" className="icon-button" aria-label="로그인">
              <UserIcon />
            </Link>
          )}
          {!loading && user && <CartLink />}
        </div>
      </div>
    </header>
  )
}

export default Header
