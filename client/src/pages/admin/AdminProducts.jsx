import { useEffect, useMemo, useState } from 'react'
import { getProducts, PRODUCT_CATEGORIES } from '@/api/products.js'
import Pagination from '@/components/Pagination.jsx'
import ProductFormModal from '@/components/ProductFormModal.jsx'
import useFetch from '@/hooks/useFetch.js'
import usePagination from '@/hooks/usePagination.js'
import { cloudinaryImage } from '@/utils/cloudinary.js'
import { formatPrice } from '@/utils/format.js'

// 서버 대시보드의 '재고 부족' 기준(adminController.js LOW_STOCK_THRESHOLD)과 같게 유지
const LOW_STOCK_THRESHOLD = 5
const PAGE_SIZE = 10
const ALL = '전체'

function PencilIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
    </svg>
  )
}

function AdminProducts() {
  // 등록·수정·삭제 후 version을 올려 목록을 다시 불러옴
  const [version, setVersion] = useState(0)
  const { data: products, loading, error } = useFetch(getProducts, [version], { keepPrevious: true })
  const [category, setCategory] = useState(ALL)
  const [query, setQuery] = useState('')
  // null: 닫힘 / { product: null }: 등록 / { product }: 수정
  const [modal, setModal] = useState(null)
  const [notice, setNotice] = useState(null)

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), 4000)
    return () => clearTimeout(timer)
  }, [notice])

  // 상품명 또는 SKU로 검색 (대소문자 무시)
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (products ?? []).filter(
      (p) =>
        (category === ALL || p.category === category) &&
        (!q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)),
    )
  }, [products, category, query])
  const { page, pageCount, setPage, pageItems } = usePagination(visible, PAGE_SIZE)

  // 필터·검색어가 바뀌면 첫 페이지부터 보여줌
  const changeCategory = (c) => {
    setCategory(c)
    setPage(1)
  }
  const changeQuery = (value) => {
    setQuery(value)
    setPage(1)
  }

  const handleSaved = (message) => {
    setModal(null)
    setNotice(message)
    setVersion((v) => v + 1)
  }

  return (
    <section className="admin-page">
      <div className="admin-page-head">
        <div>
          <h1 className="admin-page-title">상품 관리</h1>
          <p className="admin-page-subtitle">등록된 상품 {products ? products.length : '–'}개</p>
        </div>
        <button type="button" className="admin-primary-button" onClick={() => setModal({ product: null })}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          상품 등록
        </button>
      </div>

      <p className="admin-notice" role="status">
        {notice}
      </p>

      <div className="admin-panel">
        <div className="admin-toolbar">
          <div className="chip-group" role="group" aria-label="카테고리 필터">
            {[ALL, ...PRODUCT_CATEGORIES].map((c) => (
              <button key={c} type="button" className="chip" aria-pressed={category === c} onClick={() => changeCategory(c)}>
                {c}
              </button>
            ))}
          </div>
          <label className="search-input">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input type="search" value={query} onChange={(e) => changeQuery(e.target.value)} placeholder="상품명, SKU로 검색" aria-label="상품 검색" />
          </label>
        </div>

        {loading && !products && <p className="status">불러오는 중...</p>}
        {error && (
          <p className="status error" role="alert">
            상품 목록을 불러오지 못했어요. ({error.message})
          </p>
        )}
        {products && products.length === 0 && <p className="status">아직 등록된 상품이 없어요. 첫 상품을 등록해 보세요.</p>}
        {products && products.length > 0 && visible.length === 0 && <p className="status">조건에 맞는 상품이 없어요.</p>}

        {visible.length > 0 && (
          <div className="table-scroll">
            <table className="product-table">
              <thead>
                <tr>
                  <th scope="col">상품</th>
                  <th scope="col">카테고리</th>
                  <th scope="col" className="num">
                    가격
                  </th>
                  <th scope="col" className="num">
                    재고
                  </th>
                  <th scope="col">상태</th>
                  <th scope="col">
                    <span className="visually-hidden">수정</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((p) => (
                  <tr key={p._id}>
                    <td>
                      <div className="product-cell">
                        <img className="product-thumb" src={cloudinaryImage(p.image, { width: 116 })} alt="" loading="lazy" />
                        <div className="product-cell-text">
                          <p className="product-name">{p.name}</p>
                          <p className="product-sub">
                            <span className="product-sku">{p.sku}</span>
                            {p.description && ` · ${p.description}`}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td>{p.category}</td>
                    <td className="num">{formatPrice(p.price)}</td>
                    <td className={`num${p.stock <= LOW_STOCK_THRESHOLD ? ' is-low' : ''}`}>{p.stock}</td>
                    <td>
                      <span className={`status-chip${p.stock === 0 ? ' is-soldout' : ''}`}>{p.stock === 0 ? '품절' : '판매중'}</span>
                    </td>
                    <td className="actions">
                      <button type="button" className="icon-action" onClick={() => setModal({ product: p })} aria-label={`${p.name} 수정`}>
                        <PencilIcon />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} pageCount={pageCount} onChange={setPage} label="상품 목록 페이지" />
      </div>

      {modal && <ProductFormModal product={modal.product} onClose={() => setModal(null)} onSaved={handleSaved} />}
    </section>
  )
}

export default AdminProducts
