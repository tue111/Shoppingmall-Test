import api from './client.js'

export const getAdminStats = () => api.get('/admin/stats').then((res) => res.data)
// 결제 대기를 뺀 전체 주문 (최근 순). 주문자는 user.username
export const getAdminOrders = () => api.get('/admin/orders').then((res) => res.data)
// 배송 단계 변경 (paid · preparing · shipping · delivered 사이). 바뀐 주문을 돌려줌
export const updateOrderStatus = (id, status) => api.patch(`/admin/orders/${id}/status`, { status }).then((res) => res.data)
