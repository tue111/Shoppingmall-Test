import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getMyOrders, ORDER_STATUS_LABELS } from '@/api/orders.js'
import HeroWave from '@/components/HeroWave.jsx'
import useAuth from '@/hooks/useAuth.js'
import useFetch from '@/hooks/useFetch.js'
import { cloudinaryImage } from '@/utils/cloudinary.js'
import { formatPrice } from '@/utils/format.js'

// 결제는 끝났고 아직 도착 전인 주문
const IN_PROGRESS_STATUSES = ['paid', 'preparing', 'shipping']

const formatDate = (value) => new Date(value).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })

function Icon({ size = 24, children }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  )
}

const STATS = [
  {
    label: '진행 중 주문',
    count: (orders) => orders.filter((order) => IN_PROGRESS_STATUSES.includes(order.status)).length,
    icon: (
      <>
        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
        <path d="m3.3 7 8.7 5 8.7-5M12 22V12" />
      </>
    ),
  },
  {
    label: '배송 완료',
    count: (orders) => orders.filter((order) => order.status === 'delivered').length,
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m8.5 12.5 2.5 2.5 4.5-5" />
      </>
    ),
  },
  {
    label: '전체 주문',
    count: (orders) => orders.length,
    icon: (
      <>
        <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
        <path d="M9 8h6M9 12h6" />
      </>
    ),
  },
]

function OrderCard({ order }) {
  const [first, ...rest] = order.items
  const quantity = order.items.reduce((sum, item) => sum + item.quantity, 0)
  const statusClass = order.status === 'cancelled' ? ' is-cancelled' : IN_PROGRESS_STATUSES.includes(order.status) ? ' is-active' : ''

  return (
    <li className="mypage-order">
      <div className="mypage-order-head">
        <p className="mypage-order-meta">
          <strong>{formatDate(order.createdAt)}</strong>
          <span>주문 번호 {order.orderNumber}</span>
        </p>
        <span className={`order-status${statusClass}`}>{ORDER_STATUS_LABELS[order.status]}</span>
      </div>
      <div className="checkout-item">
        <img src={cloudinaryImage(first.image, { width: 128 })} alt="" loading="lazy" />
        <div className="checkout-item-text">
          <p className="checkout-item-name">{rest.length ? `${first.name} 외 ${rest.length}건` : first.name}</p>
          <p className="checkout-item-sub">총 {quantity}개</p>
        </div>
        <p className="checkout-item-price">{formatPrice(order.totalAmount)}</p>
      </div>
      {/* 주문 완료 페이지를 상세 보기로 함께 씀. state로 상세 내역을 펼친 채 열도록 알림 */}
      <Link to={`/orders/${order._id}/complete`} state={{ detail: true }} className="mypage-order-link">
        주문 상세 보기
      </Link>
    </li>
  )
}

function MyPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { data: orders, loading, error } = useFetch(getMyOrders)
  const [loggingOut, setLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState(null)

  const handleLogout = async () => {
    setLogoutError(null)
    setLoggingOut(true)
    try {
      await logout()
      navigate('/', { replace: true })
    } catch {
      setLogoutError('로그아웃에 실패했어요. 다시 시도해 주세요.')
      setLoggingOut(false)
    }
  }

  let list
  if (loading) list = <p className="status">불러오는 중...</p>
  else if (error) {
    list = (
      <p className="status error" role="alert">
        주문 내역을 불러오지 못했어요. ({error.message})
      </p>
    )
  } else if (!orders.length) {
    list = (
      <div className="cart-empty">
        <p>아직 주문 내역이 없어요.</p>
        <Link to="/products" className="cart-order-button">
          쇼핑하러 가기
        </Link>
      </div>
    )
  } else {
    list = (
      <ul className="mypage-orders">
        {orders.map((order) => (
          <OrderCard key={order._id} order={order} />
        ))}
      </ul>
    )
  }

  return (
    <>
      <section className="cart-hero">
        <div className="container cart-hero-inner">
          <div className="mypage-profile">
            <span className="mypage-avatar" aria-hidden="true">
              {user.username.slice(0, 1)}
            </span>
            <div className="mypage-profile-text">
              <p className="mypage-eyebrow">
                <Icon size={18}>
                  <path d="M2 7c2-2 4-2 6 0s4 2 6 0 4-2 6 0M2 12c2-2 4-2 6 0s4 2 6 0 4-2 6 0M2 17c2-2 4-2 6 0s4 2 6 0 4-2 6 0" />
                </Icon>
                물결상점 회원
              </p>
              <h1 className="mypage-title">{user.username}님, 안녕하세요</h1>
              {user.email && <p className="cart-lead">{user.email}</p>}
            </div>
          </div>
          <div className="mypage-logout">
            <button type="button" className="mypage-logout-button" onClick={handleLogout} disabled={loggingOut}>
              <Icon size={18}>
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
              </Icon>
              {loggingOut ? '로그아웃하는 중…' : '로그아웃'}
            </button>
            {logoutError && (
              <p className="mypage-logout-error" role="alert">
                {logoutError}
              </p>
            )}
          </div>
        </div>
        <HeroWave />
      </section>

      <div className="container cart-body">
        <dl className="mypage-stats">
          {STATS.map((stat) => (
            <div key={stat.label} className="mypage-stat">
              <dt>
                <Icon>{stat.icon}</Icon>
                {stat.label}
              </dt>
              <dd>{orders ? stat.count(orders) : '–'}</dd>
            </div>
          ))}
        </dl>

        <section className="mypage-section" aria-labelledby="mypage-orders-title">
          <h2 id="mypage-orders-title" className="mypage-section-title">
            주문 내역
          </h2>
          {list}
        </section>
      </div>
    </>
  )
}

export default MyPage
