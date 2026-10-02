// 짙은 상단 띠(.cart-hero)의 아래 경계를 물결 모양으로. 뒤쪽 옅은 물결 + 앞쪽 페이지 배경색 물결
function HeroWave() {
  return (
    <svg className="cart-wave" viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden="true">
      <path className="cart-wave-back" d="M0 30 C 360 10 720 60 1080 20 S 1440 30 1440 30 V80 H0Z" />
      <path className="cart-wave-front" d="M0 50 C 320 20 640 20 900 30 S 1300 60 1440 50 V80 H0Z" />
    </svg>
  )
}

export default HeroWave
