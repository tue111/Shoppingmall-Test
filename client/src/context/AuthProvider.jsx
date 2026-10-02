import { useCallback, useEffect, useMemo, useState } from 'react'
import * as authApi from '@/api/auth.js'
import { AuthContext } from './AuthContext.js'

function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // 새로고침해도 로그인 상태가 유지되도록, 앱 시작 시 쿠키 기준으로 현재 유저를 조회
  useEffect(() => {
    let ignore = false
    authApi
      .getMe()
      .then((data) => {
        if (!ignore) setUser(data.user)
      })
      .catch(() => {
        if (!ignore) setUser(null)
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [])

  const login = useCallback(async (credentials) => {
    const data = await authApi.login(credentials)
    setUser(data.user)
    return data.user
  }, [])

  const logout = useCallback(async () => {
    await authApi.logout()
    setUser(null)
  }, [])

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthProvider
