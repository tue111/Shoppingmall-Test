import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { completePortOnePayment, createOrder, discardOrder, payOrder } from '@/api/orders.js'
import CheckoutHero from '@/components/CheckoutHero.jsx'
import OrderFailModal from '@/components/OrderFailModal.jsx'
import useAuth from '@/hooks/useAuth.js'
import useCart from '@/hooks/useCart.js'
import { cloudinaryImage } from '@/utils/cloudinary.js'
import { formatPrice } from '@/utils/format.js'
import { isPortOneReady, requestPortOnePayment } from '@/utils/portone.js'

const PAYMENT_OPTIONS = [
  { value: 'card', label: '신용카드' },
  { value: 'bank_transfer', label: '계좌이체' },
]

// 입력칸 정의. name은 서버 주문 스키마 shipping.* 필드와 같음 (서버 검증 오류를 칸 옆에 표시하는 데 사용)
const FIELDS = [
  { name: 'recipient', label: '받는 분', autoComplete: 'name', placeholder: '김바다' },
  { name: 'phone', label: '연락처', type: 'tel', autoComplete: 'tel', placeholder: '010-1234-5678' },
  { name: 'postalCode', label: '우편번호', inputMode: 'numeric', autoComplete: 'postal-code', placeholder: '63309', maxLength: 5 },
  { name: 'address', label: '주소', autoComplete: 'address-line1', placeholder: '제주특별자치도 제주시 해안로 1', full: true },
  { name: 'addressDetail', label: '상세 주소', optional: true, autoComplete: 'address-line2', placeholder: '101동 202호', full: true },
  { name: 'memo', label: '배송 메모', optional: true, placeholder: '문 앞에 놓아 주세요', full: true, maxLength: 100 },
]

// 결제: 포트원 설정(.env)이 있으면 포트원 결제창, 없으면 테스트용 가짜 결제
// 포트원은 결제창 결과를 믿지 않고 서버가 포트원 API로 금액·상태를 확인한 뒤 완료 처리함
async function pay(order, user) {
  if (!isPortOneReady()) return payOrder(order._id)

  const response = await requestPortOnePayment(order, user)
  // 모바일 등 결제사 페이지로 이동하는 방식이면 여기로 돌아오지 않음 → 완료 페이지(redirectUrl)가 확인 처리
  if (!response) return new Promise(() => {})
  // code가 있으면 결제 실패 또는 고객이 결제창을 닫음
  if (response.code) {
    const error = new Error(`결제가 완료되지 않았어요. ${response.message ?? ''}`.trim())
    error.status = 400
    throw error
  }
  return completePortOnePayment(order._id)
}

function OrderSummary({ cart, submitting }) {
  const items = cart.items.filter((item) => item.available)

  return (
    <aside className="checkout-summary" aria-label="주문 상품과 결제 금액">
      <h2 className="checkout-section-title">주문 상품 {items.length}개</h2>
      <ul className="checkout-items">
        {items.map((item) => (
          <li key={item._id} className="checkout-item">
            <img src={cloudinaryImage(item.product.image, { width: 128 })} alt="" loading="lazy" />
            <div className="checkout-item-text">
              <p className="checkout-item-name">{item.product.name}</p>
              <p className="checkout-item-sub">
                {[item.size && `사이즈 ${item.size}`, `${item.quantity}개`].filter(Boolean).join(' · ')}
              </p>
            </div>
            <p className="checkout-item-price">{formatPrice(item.product.price * item.quantity)}</p>
          </li>
        ))}
      </ul>
      {cart.items.length > items.length && <p className="checkout-excluded">재고가 부족한 상품 {cart.items.length - items.length}개는 주문에서 제외돼요.</p>}

      <dl className="cart-summary-rows">
        <div>
          <dt>상품 금액</dt>
          <dd>{formatPrice(cart.totalPrice)}</dd>
        </div>
        <div>
          <dt>배송비</dt>
          <dd>{cart.shippingFee === 0 ? '무료' : formatPrice(cart.shippingFee)}</dd>
        </div>
      </dl>
      <div className="cart-summary-total">
        <span>결제 금액</span>
        <strong>{formatPrice(cart.totalAmount)}</strong>
      </div>
      <button type="submit" form="checkout-form" className="cart-order-button" disabled={submitting}>
        {submitting ? '결제하는 중…' : `${formatPrice(cart.totalAmount)} 결제하기`}
      </button>
      {!isPortOneReady() && <p className="checkout-test-notice">테스트 결제예요. 실제로 돈이 나가지 않아요.</p>}
    </aside>
  )
}

function Checkout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { cart, refresh } = useCart()
  const [loadError, setLoadError] = useState(null)
  // 회원가입 때 입력한 이름·주소를 기본값으로 채움
  const [form, setForm] = useState(() => ({
    recipient: user?.username ?? '',
    phone: '',
    postalCode: '',
    address: user?.address ?? '',
    addressDetail: '',
    memo: '',
  }))
  const [payment, setPayment] = useState('card')
  const [fieldErrors, setFieldErrors] = useState({})
  // 주문·결제 실패 이유. 있으면 실패 안내 팝업을 띄움
  // 결제사 페이지로 이동하는 결제가 실패하면 완료 페이지가 state.paymentError에 이유를 담아 여기로 돌려보냄
  const [error, setError] = useState(() => location.state?.paymentError ?? null)
  const [submitting, setSubmitting] = useState(false)

  const closeError = () => {
    setError(null)
    // 새로고침·뒤로 가기로 같은 팝업이 다시 뜨지 않도록 돌려받은 실패 이유를 지움
    if (location.state?.paymentError) navigate(location.pathname, { replace: true, state: null })
  }

  // 최신 재고·가격으로 주문 금액을 보여주기 위해 들어올 때마다 다시 불러옴
  useEffect(() => {
    refresh().catch((err) => setLoadError(err))
  }, [refresh])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setFieldErrors({})
    setSubmitting(true)

    let order
    try {
      // 1) 주문 생성 (결제 대기). 금액은 서버가 장바구니로 계산하고, 화면에 보인 금액과 다르면 서버가 거절(409)
      order = await createOrder({ shipping: form, payment: { method: payment }, expectedAmount: cart.totalAmount })
    } catch (err) {
      // 금액이 바뀐 경우: 새 금액을 보여 주고 다시 결제하게 함
      if (err.status === 409) await refresh().catch(() => {})
      // 'shipping.phone' 같은 서버 검증 오류를 입력칸별로 나눠 표시
      const errors = Object.fromEntries(
        Object.entries(err.errors ?? {})
          .filter(([key]) => key.startsWith('shipping.'))
          .map(([key, message]) => [key.slice('shipping.'.length), message]),
      )
      setFieldErrors(errors)
      setError(Object.keys(errors).length ? '입력한 배송 정보를 확인해 주세요.' : err.status ? err.message : '주문하지 못했어요. 잠시 후 다시 시도해 주세요.')
      setSubmitting(false)
      return
    }

    try {
      // 2) 결제 → 서버 확인까지 끝나면 결제 완료
      await pay(order, user)
    } catch (err) {
      // 결제 실패·취소(재고 부족, 결제창 닫음 등) → 결제 대기 주문을 없애고(주문 내역에 남기지 않음) 다시 시도하게 함
      // 장바구니는 결제 완료 때만 비워지므로 그대로 남음. 서버는 이 주문에 포트원 결제가 남아 있으면 함께 취소(환불)함
      await discardOrder(order._id).catch(() => {})
      await refresh().catch(() => {})
      setError(err.status ? err.message : '결제하지 못했어요. 잠시 후 다시 시도해 주세요.')
      setSubmitting(false)
      return
    }

    // 3) 결제 완료 → 장바구니에서 빠진 상품을 헤더 숫자에 반영하고 완료 페이지로
    await refresh().catch(() => {})
    navigate(`/orders/${order._id}/complete`, { replace: true })
  }

  let content
  if (loadError && !cart) {
    content = (
      <p className="status error" role="alert">
        주문 정보를 불러오지 못했어요. ({loadError.message})
      </p>
    )
  } else if (!cart) {
    content = <p className="status">불러오는 중...</p>
  } else if (cart.totalQuantity === 0 && !submitting) {
    content = (
      <div className="cart-empty">
        <p>주문할 수 있는 상품이 없어요.</p>
        <Link to="/cart" className="cart-order-button">
          장바구니로 가기
        </Link>
      </div>
    )
  } else {
    content = (
      <div className="checkout-layout">
        <form id="checkout-form" className="checkout-form" onSubmit={handleSubmit} noValidate>
          <fieldset className="checkout-section" disabled={submitting}>
            <legend className="checkout-section-title">배송지</legend>
            <div className="checkout-fields">
              {FIELDS.map(({ name, label, optional, full, ...input }) => (
                <div key={name} className={`field${full ? ' field-full' : ''}`}>
                  <label htmlFor={`checkout-${name}`}>
                    {label} {optional && <span className="field-optional">(선택)</span>}
                  </label>
                  <input
                    id={`checkout-${name}`}
                    name={name}
                    type="text"
                    value={form[name]}
                    onChange={handleChange}
                    required={!optional}
                    aria-invalid={fieldErrors[name] ? true : undefined}
                    aria-describedby={fieldErrors[name] ? `checkout-${name}-error` : undefined}
                    {...input}
                  />
                  {fieldErrors[name] && (
                    <p id={`checkout-${name}-error`} className="checkout-field-error">
                      {fieldErrors[name]}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </fieldset>

          <fieldset className="checkout-section" disabled={submitting}>
            <legend className="checkout-section-title">결제 수단</legend>
            <div className="payment-options">
              {PAYMENT_OPTIONS.map((option) => (
                <label key={option.value} className="payment-option">
                  <input type="radio" name="payment" value={option.value} checked={payment === option.value} onChange={() => setPayment(option.value)} />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>

          <Link to="/cart" className="cart-continue">
            장바구니로 돌아가기
          </Link>
        </form>

        <OrderSummary cart={cart} submitting={submitting} />
      </div>
    )
  }

  return (
    <>
      <CheckoutHero title="주문 · 결제" step={1} />
      <div className="container cart-body checkout">{content}</div>
      {error && <OrderFailModal message={error} onClose={closeError} />}
    </>
  )
}

export default Checkout
