import { useEffect, useMemo, useState } from 'react'
import { getAdminOrders, updateOrderStatus } from '@/api/admin.js'
import Pagination from '@/components/Pagination.jsx'
import useFetch from '@/hooks/useFetch.js'
import usePagination from '@/hooks/usePagination.js'
import { formatPrice } from '@/utils/format.js'

const PAGE_SIZE = 10
const ALL = 'all'
// 관리자 화면용 짧은 상태 이름. 결제 대기(pending)는 서버가 목록에서 제외
const STATUSES = [
  { status: 'paid', label: '결제완료' },
  { status: 'preparing', label: '배송준비' },
  { status: 'shipping', label: '배송중' },
  { status: 'delivered', label: '배송완료' },
  { status: 'cancelled', label: '취소' },
]
const STATUS_LABELS = Object.fromEntries(STATUSES.map(({ status, label }) => [status, label]))
// 관리자가 바꿀 수 있는 배송 단계. 서버 adminController.js의 FULFILMENT_STATUSES와 같게 유지
const FULFILMENT_STATUSES = ['paid', 'preparing', 'shipping', 'delivered']

const pad = (n) => String(n).padStart(2, '0')
// 2026.09.27 14:22
const formatDateTime = (value) => {
  const d = new Date(value)
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// 탈퇴 등으로 회원 정보가 없으면 받는 분 이름으로 대신 표시
const ordererOf = (order) => order.user?.username ?? order.shipping?.recipient ?? '–'
const itemsLabel = ({ items }) => (items.length > 1 ? `${items[0].name} 외 ${items.length - 1}건` : (items[0]?.name ?? '–'))

// 상태 칸. 배송 단계에 있는 주문은 선택 상자로 바로 바꿀 수 있고, 취소된 주문은 표시만 함
function StatusCell({ order, pending, onChange }) {
  if (!FULFILMENT_STATUSES.includes(order.status)) {
    return <span className={`status-chip is-${order.status}`}>{STATUS_LABELS[order.status] ?? order.status}</span>
  }
  return (
    <span className={`status-chip status-select is-${order.status}`}>
      <select value={order.status} disabled={pending} onChange={(e) => onChange(order, e.target.value)} aria-label={`주문 ${order.orderNumber} 상태`}>
        {FULFILMENT_STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABELS[s]}
          </option>
        ))}
      </select>
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
        <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

function AdminOrders() {
  // 상태 변경 후 version을 올려 목록을 다시 불러옴
  const [version, setVersion] = useState(0)
  const { data: orders, loading, error } = useFetch(getAdminOrders, [version], { keepPrevious: true })
  const [status, setStatus] = useState(ALL)
  const [query, setQuery] = useState('')
  // 상태를 바꾸는 중인 주문 ID (그 줄의 선택 상자를 잠금)
  const [pendingId, setPendingId] = useState(null)
  // { error: boolean, message }
  const [notice, setNotice] = useState(null)

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), 4000)
    return () => clearTimeout(timer)
  }, [notice])

  const changeOrderStatus = async (order, next) => {
    setNotice(null)
    setPendingId(order._id)
    try {
      await updateOrderStatus(order._id, next)
      setNotice({ error: false, message: `주문 ${order.orderNumber}: '${STATUS_LABELS[next]}' 상태로 바꿨어요.` })
    } catch (err) {
      setNotice({ error: true, message: `주문 ${order.orderNumber}의 상태를 바꾸지 못했어요. (${err.message})` })
    } finally {
      // 실패했을 때도 그사이 바뀐 실제 상태(고객 취소 등)를 보여 주도록 다시 불러옴
      setVersion((v) => v + 1)
      setPendingId(null)
    }
  }

  const counts = useMemo(() => {
    const result = { [ALL]: orders?.length ?? 0 }
    for (const order of orders ?? []) result[order.status] = (result[order.status] ?? 0) + 1
    return result
  }, [orders])

  // 주문번호 또는 주문자로 검색 (대소문자 무시)
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (orders ?? []).filter(
      (order) =>
        (status === ALL || order.status === status) &&
        (!q || order.orderNumber.toLowerCase().includes(q) || ordererOf(order).toLowerCase().includes(q)),
    )
  }, [orders, status, query])
  const { page, pageCount, setPage, pageItems } = usePagination(visible, PAGE_SIZE)

  // 필터·검색어가 바뀌면 첫 페이지부터 보여줌
  const changeStatus = (value) => {
    setStatus(value)
    setPage(1)
  }
  const changeQuery = (value) => {
    setQuery(value)
    setPage(1)
  }

  return (
    <section className="admin-page">
      <div className="admin-page-head">
        <div>
          <h1 className="admin-page-title">주문 관리</h1>
          <p className="admin-page-subtitle">전체 주문 {orders ? orders.length : '–'}건</p>
        </div>
      </div>

      <p className={`admin-notice${notice?.error ? ' is-error' : ''}`} role="status">
        {notice?.message}
      </p>

      <div className="admin-panel">
        <div className="admin-toolbar">
          <div className="chip-group" role="group" aria-label="주문 상태 필터">
            {[{ status: ALL, label: '전체' }, ...STATUSES].map((s) => (
              <button key={s.status} type="button" className="chip" aria-pressed={status === s.status} onClick={() => changeStatus(s.status)}>
                {s.label}
                <span className="chip-count">{counts[s.status] ?? 0}</span>
              </button>
            ))}
          </div>
          <label className="search-input">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input type="search" value={query} onChange={(e) => changeQuery(e.target.value)} placeholder="주문번호 · 주문자 검색" aria-label="주문 검색" />
          </label>
        </div>

        {loading && !orders && <p className="status">불러오는 중...</p>}
        {error && (
          <p className="status error" role="alert">
            주문 목록을 불러오지 못했어요. ({error.message})
          </p>
        )}
        {orders && orders.length === 0 && <p className="status">아직 들어온 주문이 없어요.</p>}
        {orders && orders.length > 0 && visible.length === 0 && <p className="status">조건에 맞는 주문이 없어요.</p>}

        {visible.length > 0 && (
          <div className="table-scroll">
            <table className="product-table">
              <thead>
                <tr>
                  <th scope="col">주문번호</th>
                  <th scope="col">주문일시</th>
                  <th scope="col">주문자</th>
                  <th scope="col">상품</th>
                  <th scope="col" className="num">
                    결제금액
                  </th>
                  <th scope="col">상태</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((order) => (
                  <tr key={order._id}>
                    <td className="order-number-cell">{order.orderNumber}</td>
                    <td className="order-muted-cell">{formatDateTime(order.createdAt)}</td>
                    <td>{ordererOf(order)}</td>
                    <td className="order-muted-cell">{itemsLabel(order)}</td>
                    <td className="num order-amount-cell">{formatPrice(order.totalAmount)}</td>
                    <td>
                      <StatusCell order={order} pending={pendingId === order._id} onChange={changeOrderStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} pageCount={pageCount} onChange={setPage} label="주문 목록 페이지" />
      </div>
    </section>
  )
}

export default AdminOrders
