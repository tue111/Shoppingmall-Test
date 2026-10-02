import { getAdminStats } from '@/api/admin.js'
import { AlertIcon, BoxIcon, ReceiptIcon, TrendIcon, UsersIcon } from '@/components/AdminIcons.jsx'
import useFetch from '@/hooks/useFetch.js'

const ORDERS_PENDING = '주문 기능 준비 중'

const formatDate = (value) =>
  new Date(value).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })

function StatCard({ label, value, note, Icon, muted }) {
  return (
    <article className="stat-card">
      <div className="stat-card-head">
        <h2 className="stat-label">{label}</h2>
        <span className="stat-icon">
          <Icon />
        </span>
      </div>
      <p className={`stat-value${muted ? ' stat-value-muted' : ''}`}>{value}</p>
      <p className="stat-note">{note}</p>
    </article>
  )
}

// 지난주 대비 증감을 "+3명" 형태로
function diffText(current, previous, unit) {
  const diff = current - previous
  if (diff === 0) return `지난주와 같아요`
  return `지난주 대비 ${diff > 0 ? '+' : ''}${diff}${unit}`
}

function buildCards(stats) {
  const { users, products } = stats
  return [
    // 주문 모델이 아직 없어 서버가 orders: null로 응답 → 매출·주문 카드는 자리만 표시
    { label: '이번 주 매출', value: '—', note: ORDERS_PENDING, Icon: TrendIcon, muted: true },
    { label: '주문 수', value: '—', note: ORDERS_PENDING, Icon: ReceiptIcon, muted: true },
    { label: '처리 대기', value: '—', note: ORDERS_PENDING, Icon: BoxIcon, muted: true },
    {
      label: '신규 회원',
      value: `${users.newThisWeek}명`,
      note: `${diffText(users.newThisWeek, users.newLastWeek, '명')} · 전체 ${users.total}명`,
      Icon: UsersIcon,
    },
    { label: '등록 상품', value: `${products.total}개`, note: '스토어에 노출 중인 상품', Icon: BoxIcon },
    {
      label: '재고 부족',
      value: `${products.lowStock}개`,
      note: `재고 ${products.lowStockThreshold}개 이하`,
      Icon: AlertIcon,
    },
  ]
}

function AdminDashboard() {
  const { data: stats, loading, error } = useFetch(getAdminStats)

  return (
    <section className="admin-page">
      <h1 className="admin-page-title">대시보드</h1>
      <p className="admin-page-subtitle">
        {stats ? `${formatDate(stats.generatedAt)} 기준, 오늘의 바다 상황이에요.` : '오늘의 바다 상황을 불러오고 있어요.'}
      </p>

      {loading && <p className="status">불러오는 중...</p>}
      {error && (
        <p className="status error" role="alert">
          통계를 불러오지 못했어요. ({error.message})
        </p>
      )}
      {stats && (
        <div className="stat-grid">
          {buildCards(stats).map((card) => (
            <StatCard key={card.label} {...card} />
          ))}
        </div>
      )}
    </section>
  )
}

export default AdminDashboard
