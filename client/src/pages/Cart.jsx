import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import CheckoutHero from '@/components/CheckoutHero.jsx'
import QuantityStepper from '@/components/QuantityStepper.jsx'
import useCart from '@/hooks/useCart.js'
import { cloudinaryImage } from '@/utils/cloudinary.js'
import { formatPrice } from '@/utils/format.js'

// 상단 공지(AnnouncementBar)·서버 models/Order.js의 무료배송 기준과 같게 유지 (배송비 금액 자체는 서버가 계산)
const FREE_SHIPPING_THRESHOLD = 70000
// 서버 models/Cart.js의 CART_ITEM_MAX_QUANTITY와 같게 유지
const MAX_QUANTITY = 99

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  )
}

// 장바구니 한 줄. 수량 변경·삭제는 서버 응답(바뀐 장바구니)으로 화면이 갱신됨
function CartItem({ item, onUpdate, onRemove }) {
  const { product } = item
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(null)

  const run = async (action) => {
    setError(null)
    setPending(true)
    try {
      await action()
    } catch (err) {
      // 재고 부족(409) 등은 서버 메시지를 그대로 보여줌. 성공하면 이 줄은 새 데이터로 다시 그려짐
      setError(err.status ? err.message : '변경하지 못했어요. 잠시 후 다시 시도해 주세요.')
    } finally {
      setPending(false)
    }
  }

  const soldOut = product.stock === 0
  const sub = [item.size && `사이즈 ${item.size}`, product.description].filter(Boolean).join(' · ')

  return (
    <li className={`cart-item${item.available ? '' : ' is-unavailable'}`}>
      <Link to={`/products/${product._id}`} className="cart-thumb" tabIndex={-1} aria-hidden="true">
        <img src={cloudinaryImage(product.image, { width: 280 })} alt="" loading="lazy" />
      </Link>

      <div className="cart-item-body">
        <div className="cart-item-head">
          <div className="cart-item-text">
            <Link to={`/products/${product._id}`} className="cart-item-name">
              {product.name}
            </Link>
            {sub && <p className="cart-item-sub">{sub}</p>}
          </div>
          <button type="button" className="cart-remove" onClick={() => run(() => onRemove(item._id))} disabled={pending} aria-label={`${product.name} 삭제`}>
            <CloseIcon />
          </button>
        </div>

        {!item.available && (
          <p className="cart-item-warning">
            {soldOut ? '품절된 상품이에요. 주문에서 제외돼요.' : `재고가 ${product.stock}개 남아 있어요. 수량을 줄여 주세요.`}
          </p>
        )}
        {error && (
          <p className="cart-item-warning" role="alert">
            {error}
          </p>
        )}

        <div className="cart-item-foot">
          <QuantityStepper
            value={item.quantity}
            // 재고를 넘겨 담긴 줄도 줄일 수는 있도록 현재 수량보다 작아지지 않게 함
            max={Math.min(Math.max(product.stock, item.quantity), MAX_QUANTITY)}
            onChange={(quantity) => run(() => onUpdate(item._id, quantity))}
            disabled={pending || soldOut}
            label={`${product.name} 수량`}
          />
          <p className="cart-line-price">{formatPrice(product.price * item.quantity)}</p>
        </div>
      </div>
    </li>
  )
}

function CartSummary({ cart }) {
  const navigate = useNavigate()
  const remaining = FREE_SHIPPING_THRESHOLD - cart.totalPrice

  return (
    <aside className="cart-summary" aria-label="결제 예정 금액">
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
      {cart.totalPrice > 0 && remaining > 0 && <p className="cart-shipping-hint">{formatPrice(remaining)} 더 담으면 무료배송이에요.</p>}
      <div className="cart-summary-total">
        <span>결제 예정 금액</span>
        <strong>{formatPrice(cart.totalAmount)}</strong>
      </div>
      <button type="button" className="cart-order-button" disabled={cart.totalQuantity === 0} onClick={() => navigate('/checkout')}>
        {cart.totalQuantity > 0 ? `${cart.totalQuantity}개 주문하기` : '주문할 수 있는 상품이 없어요'}
      </button>
    </aside>
  )
}

function Cart() {
  const { cart, updateItem, removeItem, refresh } = useCart()
  const [loadError, setLoadError] = useState(null)

  // 페이지에 들어올 때마다 최신 재고·가격으로 다시 불러옴 (헤더 숫자용으로 받아 둔 데이터는 오래됐을 수 있음)
  useEffect(() => {
    refresh().catch((err) => setLoadError(err))
  }, [refresh])

  let content
  if (loadError && !cart) {
    content = (
      <p className="status error" role="alert">
        장바구니를 불러오지 못했어요. ({loadError.message})
      </p>
    )
  } else if (!cart) {
    content = <p className="status">불러오는 중...</p>
  } else if (cart.items.length === 0) {
    content = (
      <div className="cart-empty">
        <p>장바구니가 비어 있어요.</p>
        <Link to="/products" className="cart-order-button">
          상품 둘러보기
        </Link>
      </div>
    )
  } else {
    content = (
      <>
        <p className="cart-count">담긴 상품 {cart.items.length}개</p>
        <ul className="cart-list">
          {cart.items.map((item) => (
            <CartItem key={item._id} item={item} onUpdate={updateItem} onRemove={removeItem} />
          ))}
        </ul>
        <Link to="/products" className="cart-continue">
          쇼핑 계속하기
        </Link>
        <CartSummary cart={cart} />
      </>
    )
  }

  return (
    <>
      <CheckoutHero title="장바구니" step={0} />
      <div className="container cart-body">{content}</div>
    </>
  )
}

export default Cart
