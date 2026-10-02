// 수량 − / + 버튼. 상품 상세와 장바구니에서 함께 사용
function QuantityStepper({ value, max, onChange, disabled = false, label = '수량' }) {
  return (
    <div className="qty-stepper" role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(value - 1)} disabled={disabled || value <= 1} aria-label="수량 줄이기">
        −
      </button>
      <output aria-live="polite">{value}</output>
      <button type="button" onClick={() => onChange(value + 1)} disabled={disabled || value >= max} aria-label="수량 늘리기">
        +
      </button>
    </div>
  )
}

export default QuantityStepper
