import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { completePortOnePayment, discardOrder, getOrder, ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS } from '@/api/orders.js'
import CheckoutHero from '@/components/CheckoutHero.jsx'
import useCart from '@/hooks/useCart.js'
import useFetch from '@/hooks/useFetch.js'
import { cloudinaryImage } from '@/utils/cloudinary.js'
import { formatPrice } from '@/utils/format.js'

const formatDateTime = (value) =>
  new Date(value).toLocaleString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })

// 모바일 등 결제사 페이지로 이동하는 결제는 끝나면 이 페이지로 돌아옴 (?paymentId=...&code=...)
// 그때는 여기서 서버 확인을 요청해 결제 완료 처리. code가 있으면 결제 실패·취소
// 실패하면 결제 대기 주문을 없애고 주문서로 돌려보내 실패 안내 팝업을 띄움 (장바구니는 그대로)
// 반환: 확인이 끝나 주문을 보여 줘도 되면 true
function useRedirectPaymentResult(orderId) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { refresh } = useCart()
  const returned = searchParams.has('paymentId')
  const failCode = searchParams.get('code')
  const failMessage = searchParams.get('message')
  const [done, setDone] = useState(!returned)

  useEffect(() => {
    if (!returned) return
    let ignore = false
    const fail = async (message) => {
      try {
        await discardOrder(orderId)
      } catch (err) {
        // 결제 대기가 아님 = 이미 결제 완료 처리된 주문 → 실패가 아니므로 주문을 그대로 보여 줌
        if (err.status === 409) return !ignore && setDone(true)
      }
      if (!ignore) navigate('/checkout', { replace: true, state: { paymentError: message } })
    }
    if (failCode) {
      fail(`결제가 완료되지 않았어요. ${failMessage ?? ''}`.trim())
    } else {
      completePortOnePayment(orderId)
        .then(() => refresh().catch(() => {}))
        .then(() => !ignore && setDone(true))
        .catch((err) => fail(err.status ? err.message : '결제를 확인하지 못했어요.'))
    }
    return () => {
      ignore = true
    }
  }, [orderId, returned, failCode, failMessage, refresh, navigate])

  return done
}

// 결제 이후 배송 진행 단계. status는 서버 주문 상태(paid → preparing → shipping → delivered) 순서와 같게 유지
const TRACK_STEPS = [
  { status: 'paid', label: '결제 완료' },
  {
    status: 'preparing',
    label: '배송 준비',
    icon: (
      <>
        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
        <path d="m3.3 7 8.7 5 8.7-5M12 22V12" />
      </>
    ),
  },
  {
    status: 'shipping',
    label: '배송 중',
    icon: (
      <>
        <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2M15 18H9" />
        <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
        <circle cx="17" cy="18" r="2" />
        <circle cx="7" cy="18" r="2" />
      </>
    ),
  },
  {
    status: 'delivered',
    label: '도착',
    icon: (
      <>
        <path d="m16 16 2 2 4-4" />
        <path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14" />
        <path d="m7.5 4.27 9 5.15M3.29 7 12 12l8.71-5M12 22V12" />
      </>
    ),
  },
]

const CHECK_ICON = <path d="M5 12.5l4.5 4.5L19 7.5" />

// 지나온 단계는 체크 표시로 채우고, 남은 단계는 아이콘만 보여 줌
function OrderTrack({ status }) {
  const current = TRACK_STEPS.findIndex((step) => step.status === status)
  return (
    <ol className="order-track" aria-label="배송 진행 단계">
      {TRACK_STEPS.map((step, i) => (
        <li key={step.status} className={`order-track-step${i <= current ? ' is-reached' : ''}`} aria-current={i === current ? 'step' : undefined}>
          <span className="order-track-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {i <= current ? CHECK_ICON : step.icon}
            </svg>
          </span>
          {step.label}
        </li>
      ))}
    </ol>
  )
}

function OrderComplete() {
  const { id } = useParams()
  const confirmed = useRedirectPaymentResult(id)
  // 리디렉션 결제 확인이 끝난 뒤에 최신 주문 상태를 불러옴
  const { data: order, loading, error } = useFetch(() => (confirmed ? getOrder(id) : new Promise(() => {})), [id, confirmed])
  // 주문 내역(마이페이지)에서 들어오면 상세 보기로 쓰이므로 상세 내역을 펼친 채 시작
  const detailView = Boolean(useLocation().state?.detail)
  const [showDetails, setShowDetails] = useState(detailView)

  let content
  let paid = false
  if (!confirmed) content =<p className="status">결제를 확인하는 중...</p>
  else if (loading) content = <p className="status">불러오는 중...</p>
  else if (error) {
    content = (
      <p className="status error" role="alert">
        {error.status === 404 ? '주문을 찾을 수 없어요.' : `주문 정보를 불러오지 못했어요. (${error.message})`}
      </p>
    )
  } else {
    const { shipping, payment } = order
    paid = order.status !== 'pending' && order.status !== 'cancelled'
    content = (
      <div className="order-complete">
        <div className="order-card">
          <dl className="order-summary">
            <div>
              <dt>주문 번호</dt>
              <dd>{order.orderNumber}</dd>
            </div>
            <div>
              <dt>결제 수단</dt>
              <dd>{PAYMENT_METHOD_LABELS[payment.method] ?? payment.method}</dd>
            </div>
            <div>
              <dt>결제 금액</dt>
              <dd className="order-summary-amount">{formatPrice(order.totalAmount)}</dd>
            </div>
          </dl>
          {paid ? (
            <OrderTrack status={order.status} />
          ) : (
            <div className="order-unpaid">
              <p className="order-unpaid-title">{ORDER_STATUS_LABELS[order.status]}</p>
              <p className="order-unpaid-lead">이 주문은 결제가 완료되지 않았어요.</p>
            </div>
          )}
        </div>

        <div className="order-complete-actions">
          <Link to="/mypage" className="cart-order-button order-outline-button">
            주문 내역 보기
          </Link>
          <Link to="/products" className="cart-order-button">
            쇼핑 계속하기
          </Link>
        </div>

        <button
          type="button"
          className="order-detail-toggle"
          aria-expanded={showDetails}
          aria-controls="order-details"
          onClick={() => setShowDetails((shown) => !shown)}
        >
          {showDetails ? '주문 상세 접기' : '주문 상세 펼치기'}
        </button>

        <div id="order-details" className="order-details" hidden={!showDetails}>
          <section className="order-section" aria-labelledby="order-items-title">
            <h2 id="order-items-title" className="checkout-section-title">
              주문 상품
            </h2>
            <ul className="checkout-items">
              {order.items.map((item) => (
                <li key={`${item.product}:${item.size}`} className="checkout-item">
                  <img src={cloudinaryImage(item.image, { width: 128 })} alt="" loading="lazy" />
                  <div className="checkout-item-text">
                    <Link to={`/products/${item.product}`} className="checkout-item-name">
                      {item.name}
                    </Link>
                    <p className="checkout-item-sub">
                      {[item.size && `사이즈 ${item.size}`, `${item.quantity}개`].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <p className="checkout-item-price">{formatPrice(item.price * item.quantity)}</p>
                </li>
              ))}
            </ul>
          </section>

          <div className="order-info-grid">
            <section className="order-section" aria-labelledby="order-shipping-title">
              <h2 id="order-shipping-title" className="checkout-section-title">
                배송지
              </h2>
              <dl className="order-info">
                <div>
                  <dt>받는 분</dt>
                  <dd>{shipping.recipient}</dd>
                </div>
                <div>
                  <dt>연락처</dt>
                  <dd>{shipping.phone}</dd>
                </div>
                <div>
                  <dt>주소</dt>
                  <dd>
                    ({shipping.postalCode}) {shipping.address} {shipping.addressDetail}
                  </dd>
                </div>
                {shipping.memo && (
                  <div>
                    <dt>배송 메모</dt>
                    <dd>{shipping.memo}</dd>
                  </div>
                )}
              </dl>
            </section>

            <section className="order-section" aria-labelledby="order-payment-title">
              <h2 id="order-payment-title" className="checkout-section-title">
                결제 정보
              </h2>
              <dl className="order-info">
                {payment.paidAt && (
                  <div>
                    <dt>결제 일시</dt>
                    <dd>{formatDateTime(payment.paidAt)}</dd>
                  </div>
                )}
                <div>
                  <dt>상품 금액</dt>
                  <dd>{formatPrice(order.itemsTotal)}</dd>
                </div>
                <div>
                  <dt>배송비</dt>
                  <dd>{order.shippingFee === 0 ? '무료' : formatPrice(order.shippingFee)}</dd>
                </div>
                <div className="order-info-total">
                  <dt>결제 금액</dt>
                  <dd>{formatPrice(order.totalAmount)}</dd>
                </div>
              </dl>
            </section>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <CheckoutHero
        title={detailView ? '주문 상세' : '주문 완료'}
        step={2}
        lead={paid && !detailView ? '바다 내음 가득 담아 정성껏 보내 드릴게요.' : undefined}
      />
      <div className="container cart-body">{content}</div>
    </>
  )
}

export default OrderComplete
