import HeroWave from './HeroWave.jsx'

const STEPS = ['장바구니', '주문 · 결제', '완료']

// 장바구니 → 주문·결제 → 완료 페이지 상단의 제목·단계 표시 띠. step: 현재 단계(0부터), lead: 제목 아래 한 줄 안내(선택)
function CheckoutHero({ title, step, lead }) {
  return (
    <section className="cart-hero">
      <div className="container cart-hero-inner">
        <div>
          <h1 className="cart-title">{title}</h1>
          {lead && <p className="cart-lead">{lead}</p>}
        </div>
        <ol className="cart-steps" aria-label="주문 단계">
          {STEPS.map((label, i) => (
            <li key={label} className="cart-step" aria-current={i === step ? 'step' : undefined}>
              {/* 단계 사이 연결선(::before)이 강조 배경 안에 들어가지 않도록 글자만 따로 감쌈 */}
              <span className="cart-step-label">
                {String(i + 1).padStart(2, '0')} {label}
              </span>
            </li>
          ))}
        </ol>
      </div>
      <HeroWave />
    </section>
  )
}

export default CheckoutHero
