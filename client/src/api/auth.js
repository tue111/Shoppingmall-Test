import api from './client.js'

export const login = (data) => api.post('/auth/login', data).then((res) => res.data)
export const getMe = () => api.get('/auth/me').then((res) => res.data)
export const logout = () => api.post('/auth/logout').then((res) => res.data)
