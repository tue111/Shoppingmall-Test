import api from './client.js'

export const getUsers = () => api.get('/users').then((res) => res.data)
export const getUser = (id) => api.get(`/users/${id}`).then((res) => res.data)
export const createUser = (data) => api.post('/users', data).then((res) => res.data)
export const updateUser = (id, data) => api.put(`/users/${id}`, data).then((res) => res.data)
export const deleteUser = (id) => api.delete(`/users/${id}`)
