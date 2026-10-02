import { Link, Navigate, NavLink, Outlet } from 'react-router-dom'
import useAuth from '@/hooks/useAuth.js'
import { BoxIcon, DashboardIcon, ReceiptIcon, WavesIcon } from './AdminIcons.jsx'

const TABS = [
  { label: '대시보드', to: '/admin', end: true, Icon: DashboardIcon },
  { label: '상품 관리', to: '/admin/products', Icon: BoxIcon },
  { label: '주문 관리', to: '/admin/orders', Icon: ReceiptIcon },
]

// 관리자 화면은 스토어 헤더 없이 별도 레이아웃으로 렌더
// 헤더에서 버튼을 숨기는 것만으로는 주소를 직접 입력해 들어올 수 있으므로 여기서도 권한 확인 (API는 서버에서 따로 막음)
function AdminLayout() {
  const { user, loading } = useAuth()

  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  if (user.user_type !== 'admin') return <Navigate to="/" replace />

  return (
    <div className="admin-shell">
      <header className="admin-bar">
        <div className="admin-bar-top">
          <Link to="/admin" className="admin-brand">
            <WavesIcon size={24} />
            물결상점
          </Link>
          <div className="admin-bar-right">
            <Link to="/" className="admin-store-link">
              스토어 보기
            </Link>
            <span className="admin-badge">Admin</span>
          </div>
        </div>
        <nav className="admin-tabs" aria-label="관리자 메뉴">
          {TABS.map(({ label, to, end, Icon }) => (
            <NavLink key={to} to={to} end={end} className="admin-tab">
              <Icon />
              {label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  )
}

export default AdminLayout
