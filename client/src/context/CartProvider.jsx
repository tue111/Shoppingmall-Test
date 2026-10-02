import { useCallback, useEffect, useMemo, useState } from 'react'
import * as cartApi from '@/api/cart.js'
import useAuth from '@/hooks/useAuth.js'
import { CartContext } from './CartContext.js'

// 로그인한 회원의 장바구니를 앱 전체(헤더 숫자, 상세 페이지 담기 등)에서 함께 사용
// AuthProvider 안에 두어야 함
function CartProvider({ children }) {
  const { user } = useAuth()
  const userId = user?._id ?? null
  // 어떤 회원의 장바구니인지 함께 저장 → 로그아웃하거나 다른 계정으로 바뀌면 이전 장바구니를 쓰지 않음
  const [state, setState] = useState({ userId: null, cart: null })

  const refresh = useCallback(async () => {
    if (!userId) return
    const cart = await cartApi.getCart()
    setState({ userId, cart })
  }, [userId])

  // 로그인하면(또는 계정이 바뀌면) 장바구니를 불러옴. 실패해도 헤더 숫자만 안 보일 뿐이라 조용히 넘김
  useEffect(() => {
    if (!userId) return
    let ignore = false
    cartApi
      .getCart()
      .then((cart) => {
        if (!ignore) setState({ userId, cart })
      })
      .catch(() => {})
    return () => {
      ignore = true
    }
  }, [userId])

  // API가 바뀐 장바구니 전체를 돌려주므로 그대로 상태에 반영
  const apply = useCallback(
    async (request) => {
      const cart = await request()
      setState({ userId, cart })
      return cart
    },
    [userId],
  )

  const addItem = useCallback((item) => apply(() => cartApi.addCartItem(item)), [apply])
  const updateItem = useCallback((itemId, quantity) => apply(() => cartApi.updateCartItem(itemId, quantity)), [apply])
  const removeItem = useCallback((itemId) => apply(() => cartApi.removeCartItem(itemId)), [apply])
  const clear = useCallback(() => apply(cartApi.clearCart), [apply])

  const cart = userId && state.userId === userId ? state.cart : null
  // 헤더에 표시할 숫자: 담긴 상품 종류(줄) 수. 같은 상품이라도 사이즈가 다르면 따로 셈
  const count = cart?.items.length ?? 0

  const value = useMemo(
    () => ({ cart, count, addItem, updateItem, removeItem, clear, refresh }),
    [cart, count, addItem, updateItem, removeItem, clear, refresh],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export default CartProvider
