import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
  // 서버와 origin이 달라도(배포 환경) 로그인 쿠키를 주고받도록 허용
  withCredentials: true,
})

// 서버 에러 메시지를 Error.message로, HTTP 상태 코드를 Error.status로,
// 필드별 검증 메시지({ 필드: 메시지 })를 Error.errors로 꺼내서 전달
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const error = new Error(err.response?.data?.message || err.message)
    error.status = err.response?.status
    error.errors = err.response?.data?.errors
    return Promise.reject(error)
  },
)

export default api
