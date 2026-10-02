import api from './client.js'

// server/src/models/Order.js의 ORDER_STATUS_LABELS와 같게 유지
export const ORDER_STATUS_LABELS = {
  pending: '결제 대기',
  paid: '결제 완료',
  preparing: '상품 준비 중',
  shipping: '배송 중',
  delivered: '배송 완료',
  cancelled: '주문 취소',
}
// bank_transfer는 포트원 TRANSFER(실시간 계좌이체)로 결제
export const PAYMENT_METHOD_LABELS = { card: '신용카드', bank_transfer: '계좌이체' }

export const getMyOrders = () => api.get('/orders').then((res) => res.data)
export const getOrder = (id) => api.get(`/orders/${id}`).then((res) => res.data)
// 장바구니의 주문 가능한 상품으로 주문 생성 (결제 대기). 금액은 서버가 계산
export const createOrder = (data) => api.post('/orders', data).then((res) => res.data)
// 테스트용 가짜 결제 → 결제 완료 + 재고 차감 + 장바구니에서 제외 (서버에 포트원이 설정돼 있으면 403)
export const payOrder = (id) => api.post(`/orders/${id}/pay`).then((res) => res.data)
// 포트원 결제창이 끝난 뒤 호출 → 서버가 포트원에 결제를 직접 조회·확인하고 결제 완료 처리
export const completePortOnePayment = (id) => api.post(`/orders/${id}/portone`).then((res) => res.data)
// 결제에 실패한 결제 대기 주문을 없앰 (주문 내역에 남지 않음, 장바구니는 그대로). 실제 결제가 됐던 주문은 서버가 환불 후 취소로 남김
export const discardOrder = (id) => api.delete(`/orders/${id}`).then((res) => res.data)
export const cancelOrder =(id, reason = '') => api.post(`/orders/${id}/cancel`, { reason }).then((res) => res.data)
