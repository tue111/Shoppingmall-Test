import api from './client.js'

// 모든 요청은 로그인 쿠키 기준으로 내 장바구니를 다루고, 바뀐 장바구니 전체를 돌려받음
export const getCart = () => api.get('/cart').then((res) => res.data)
export const addCartItem = (data) => api.post('/cart/items', data).then((res) => res.data)
export const updateCartItem = (itemId, quantity) => api.patch(`/cart/items/${itemId}`, { quantity }).then((res) => res.data)
export const removeCartItem = (itemId) => api.delete(`/cart/items/${itemId}`).then((res) => res.data)
export const clearCart = () => api.delete('/cart').then((res) => res.data)
