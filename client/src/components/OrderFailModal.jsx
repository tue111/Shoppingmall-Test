import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'

/**
 * 주문·결제 실패 안내 팝업. message: 실패 이유
 * 실패한 주문은 만들어지지 않고 장바구니는 그대로라는 점을 함께 알려 줌
 */
function OrderFailModal({ message, onClose }) {
  const dialogRef = useRef(null)

  // <dialog>.showModal(): 배경 비활성화, 포커스 가두기, Esc 처리를 브라우저가 담당
  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  return (
    <dialog
      ref={dialogRef}
      className="modal modal-alert"
      role="alertdialog"
      aria-labelledby="order-fail-title"
      aria-describedby="order-fail-message"
      onCancel={(e) => {
        // Esc: 닫을 때는 부모 상태로 언마운트
        e.preventDefault()
        onClose()
      }}
      // dialog 자체(= 바깥 어두운 영역)를 누른 경우에만 닫기
      onClick={(e) => e.target === dialogRef.current && onClose()}
    >
      <div className="modal-alert-body">
        <span className="modal-alert-icon" aria-hidden="true">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7.5v5.5M12 16.5v.01" />
          </svg>
        </span>
        <h2 id="order-fail-title" className="modal-title">
          주문하지 못했어요
        </h2>
        <p id="order-fail-message" className="modal-alert-message">
          {message}
        </p>
        <p className="modal-alert-note">주문은 접수되지 않았고, 장바구니에 담은 상품은 그대로 있어요.</p>
      </div>
      <div className="modal-alert-actions">
        <Link to="/cart" className="modal-button modal-button-ghost">
          장바구니로 가기
        </Link>
        <button type="button" className="modal-button modal-button-primary" onClick={onClose} autoFocus>
          다시 시도하기
        </button>
      </div>
    </dialog>
  )
}

export default OrderFailModal
