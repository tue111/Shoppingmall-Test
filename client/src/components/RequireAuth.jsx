import { Navigate, useLocation } from 'react-router-dom'
import useAuth from '@/hooks/useAuth.js'

// 로그인한 회원만 볼 수 있는 페이지를 감쌈. 비로그인이면 로그인 페이지로 보내고, 로그인 후 이 페이지로 돌아오게 함
function RequireAuth({ message = '로그인이 필요한 페이지예요.', children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return null
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search, message }} />
  return children
}

export default RequireAuth
