import api from './client.js'

// server/src/models/Product.js의 PRODUCT_CATEGORIES와 같게 유지
export const PRODUCT_CATEGORIES = ['상의', '하의', '신발', '악세사리']

export const getProducts = () => api.get('/products').then((res) => res.data)
export const getProduct = (id) => api.get(`/products/${id}`).then((res) => res.data)
export const createProduct = (data) => api.post('/products', data).then((res) => res.data)
export const updateProduct = (id, data) => api.put(`/products/${id}`, data).then((res) => res.data)
export const deleteProduct = (id) => api.delete(`/products/${id}`)

