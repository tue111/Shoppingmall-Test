import { getProducts } from '@/api/products.js'
import Pagination from '@/components/Pagination.jsx'
import ProductCard from '@/components/ProductCard.jsx'
import useFetch from '@/hooks/useFetch.js'
import usePagination from '@/hooks/usePagination.js'

const PAGE_SIZE = 12

function ProductList() {
  const { data: products, loading, error } = useFetch(getProducts)
  const { page, pageCount, setPage, pageItems } = usePagination(products, PAGE_SIZE)

  // 페이지를 넘기면 목록 맨 위부터 보이도록
  const changePage = (p) => {
    setPage(p)
    window.scrollTo({ top: 0 })
  }

  if (loading) return <p className="status">불러오는 중...</p>
  if (error) return <p className="status error">에러: {error.message}</p>
  if (!products?.length) return <p className="status">등록된 상품이 없습니다.</p>

  return (
    <>
      <h1>상품 목록</h1>
      <div className="grid">
        {pageItems.map((product) => (
          <ProductCard key={product._id} product={product} />
        ))}
      </div>
      <Pagination page={page} pageCount={pageCount} onChange={changePage} label="상품 목록 페이지" />
    </>
  )
}

export default ProductList
