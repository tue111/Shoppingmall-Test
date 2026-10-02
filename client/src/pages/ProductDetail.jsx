import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { getProduct } from '@/api/products.js'
import QuantityStepper from '@/components/QuantityStepper.jsx'
import useAuth from '@/hooks/useAuth.js'
import useCart from '@/hooks/useCart.js'
import useFetch from '@/hooks/useFetch.js'
import { cloudinaryImage } from '@/utils/cloudinary.js'
import { formatPrice } from '@/utils/format.js'

// 카테고리별 사이즈. 없는 카테고리는 사이즈 선택 생략
// server/src/models/Product.js의 PRODUCT_SIZES_BY_CATEGORY와 같게 유지 (장바구니 API가 이 목록으로 검증)
const SIZES_BY_CATEGORY = {
  상의: ['S', 'M', 'L', 'XL'],
  하의: ['S', 'M', 'L', 'XL'],
  신발: ['240', '250', '260', '270', '280'],
}
// 서버 대시보드의 '재고 부족' 기준(adminController.js LOW_STOCK_THRESHOLD)과 같게 유지
const LOW_STOCK_THRESHOLD = 5

function HeartIcon({ filled }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />
    </svg>
  )
}

// 상품을 받은 뒤에만 렌더되므로 선택 상태의 초기값을 상품 기준으로 잡을 수 있음
function ProductInfo({ product }) {
  const sizes = SIZES_BY_CATEGORY[product.category] ?? []
  const soldOut = product.stock === 0
  const [size, setSize] = useState(sizes[1] ?? sizes[0] ?? null)
  const [quantity, setQuantity] = useState(1)
  const [liked, setLiked] = useState(false)
  // { text, error?, cartLink? }
  const [notice, setNotice] = useState(null)
  const [adding, setAdding] = useState(false)
  const [buying, setBuying] = useState(false)
  const { user } = useAuth()
  const { cart, addItem, updateItem } = useCart()
  const navigate = useNavigate()
  const location = useLocation()

  // 비로그인이면 로그인 페이지로 보내고, 로그인 후 이 상품 페이지로 돌아오게 함
  const goLogin = (message) => navigate('/login', { state: { from: location.pathname, message } })

  const handleAddToCart = async () => {
    if (!user) return goLogin('장바구니는 로그인 후 이용할 수 있어요.')
    setNotice(null)
    setAdding(true)
    try {
      await addItem({ productId: product._id, size, quantity })
      setNotice({ text: '장바구니에 담았어요.', cartLink: true })
    } catch (err) {
      // 로그인이 만료된 경우 다시 로그인하도록 안내. 재고 부족(409) 등은 서버 메시지를 그대로 보여줌
      if (err.status === 401) return goLogin('로그인이 만료됐어요. 다시 로그인해 주세요.')
      setNotice({ text: err.status ? err.message : '장바구니에 담지 못했어요. 잠시 후 다시 시도해 주세요.', error: true })
    } finally {
      setAdding(false)
    }
  }

  // 바로 구매: 고른 상품을 장바구니에 넣고 곧바로 주문서로 이동 (주문은 장바구니 기준으로 만들어짐)
  // 같은 상품·사이즈가 이미 담겨 있으면 더하지 않고 지금 고른 수량으로 맞춤 → 여러 번 눌러도 수량이 불어나지 않음
  const handleBuyNow = async () => {
    if (!user) return goLogin('구매는 로그인 후 이용할 수 있어요.')
    setNotice(null)
    setBuying(true)
    try {
      const existing = cart?.items.find((item) => item.product._id === product._id && item.size === (size ?? ''))
      if (!existing) await addItem({ productId: product._id, size, quantity })
      else if (existing.quantity !== quantity) await updateItem(existing._id, quantity)
      navigate('/checkout')
    } catch (err) {
      if (err.status === 401) return goLogin('로그인이 만료됐어요. 다시 로그인해 주세요.')
      setNotice({ text: err.status ? err.message : '주문 페이지로 이동하지 못했어요. 잠시 후 다시 시도해 주세요.', error: true })
      setBuying(false)
    }
  }

  return (
    <div className="detail-info">
      <Link to="/products" className="detail-back">
        ← 전체 상품
      </Link>
      <p className="detail-category">{product.category}</p>
      <h1 className="detail-name">{product.name}</h1>
      <p className="detail-price">{formatPrice(product.price)}</p>
      {product.description && <p className="detail-description">{product.description}</p>}

      {sizes.length > 0 && (
        <fieldset className="detail-options" disabled={soldOut}>
          <legend>사이즈</legend>
          <div className="size-group">
            {sizes.map((s) => (
              <button key={s} type="button" className="size-chip" aria-pressed={size === s} onClick={() => setSize(s)}>
                {s}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {soldOut ? (
        <p className="detail-soldout">지금은 품절이에요. 곧 다시 입고될 예정이에요.</p>
      ) : (
        <div className="detail-summary">
          <QuantityStepper value={quantity} max={product.stock} onChange={setQuantity} />
          <p className="detail-total">
            합계 <strong>{formatPrice(product.price * quantity)}</strong>
          </p>
        </div>
      )}
      {!soldOut && product.stock <= LOW_STOCK_THRESHOLD && <p className="detail-stock-hint">남은 수량 {product.stock}개</p>}

      <div className="detail-actions">
        <button type="button" className="detail-like" aria-pressed={liked} aria-label="찜하기" onClick={() => setLiked((v) => !v)}>
          <HeartIcon filled={liked} />
        </button>
        <button type="button" className="detail-button" disabled={soldOut || adding || buying} onClick={handleAddToCart}>
          {adding ? '담는 중…' : '장바구니'}
        </button>
        <button type="button" className="detail-button detail-button-primary" disabled={soldOut || adding || buying} onClick={handleBuyNow}>
          {buying ? '이동하는 중…' : '바로 구매'}
        </button>
      </div>
      <p className={`detail-notice${notice?.error ? ' is-error' : ''}`} role="status">
        {notice?.text}
        {notice?.cartLink && (
          <Link to="/cart" className="detail-notice-link">
            장바구니 보기
          </Link>
        )}
      </p>
    </div>
  )
}

function ProductDetail() {
  const { id } = useParams()
  const { data: product, loading, error } = useFetch(() => getProduct(id), [id])

  if (loading) return <p className="status">불러오는 중...</p>
  if (error) {
    return (
      <p className="status error" role="alert">
        {error.status === 404 ? '찾으시는 상품이 없어요.' : `상품을 불러오지 못했어요. (${error.message})`}
      </p>
    )
  }

  return (
    <article className="detail">
      <div className="detail-image">
        <img src={cloudinaryImage(product.image, { width: 1000 })} alt={product.name} />
      </div>
      {/* key: 다른 상품으로 이동하면 사이즈·수량 선택을 초기화 */}
      <ProductInfo key={product._id} product={product} />
    </article>
  )
}

export default ProductDetail
