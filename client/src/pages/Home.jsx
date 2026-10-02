import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { getProducts } from '@/api/products.js'
import ProductCard from '@/components/ProductCard.jsx'
import useFetch from '@/hooks/useFetch.js'

const NEW_ARRIVALS_COUNT = 4

function NewArrivals() {
  const { data: products, loading, error } = useFetch(getProducts)

  if (loading) return <p className="status">불러오는 중...</p>
  if (error) return <p className="status error">상품을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p>
  if (!products?.length) return <p className="status">곧 새로운 물건이 들어올 예정이에요.</p>

  return (
    <div className="grid">
      {products.slice(0, NEW_ARRIVALS_COUNT).map((product) => (
        <ProductCard key={product._id} product={product} />
      ))}
    </div>
  )
}

function Home() {
  const { hash } = useLocation()

  // 다른 페이지에서 헤더의 '이야기'(/#story)로 들어온 경우 해당 섹션으로 스크롤
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' })
  }, [hash])

  return (
    <>
      <section className="home-hero">
        <div className="container home-hero-inner">
          <p className="home-eyebrow">2026 SUMMER · 바다 컬렉션</p>
          <h1 className="home-title">
            파도 소리가
            <br />
            들리는 물건들
          </h1>
          <p className="home-lead">
            짠 바람에 말린 린넨, 모래를 닮은 밀짚, 바닷물빛 유약. 여름 한가운데로 데려다줄 생활의 조각을 모았습니다.
          </p>
          <div className="home-actions">
            <Link to="/products" className="pill-button pill-button-light">
              컬렉션 둘러보기
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
            <a href="#story" className="pill-button pill-button-ghost">
              브랜드 이야기
            </a>
          </div>
        </div>
      </section>

      <section className="container home-section" aria-labelledby="new-arrivals-title">
        <div className="home-section-head">
          <h2 id="new-arrivals-title" className="home-section-title">
            새로 들어온 물건
          </h2>
          <Link to="/products" className="home-section-link">
            전체 보기
          </Link>
        </div>
        <NewArrivals />
      </section>

      <section id="story" className="home-story">
        <div className="container home-story-inner">
          <p className="home-eyebrow">OUR STORY</p>
          <h2 className="home-story-title">바다 곁에서 천천히 만든 것들</h2>
          <p className="home-story-text">
            물결상점은 제주의 작은 공방들과 함께 바다의 결을 닮은 생활용품을 소개합니다. 오래 쓰고, 다시 쓰고, 자연으로
            돌아갈 수 있는 물건만 고릅니다.
          </p>
        </div>
      </section>
    </>
  )
}

export default Home
