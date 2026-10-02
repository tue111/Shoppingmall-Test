import { createContext } from 'react'

// { cart, count, addItem, updateItem, removeItem, clear, refresh } — CartProvider가 값을 채움
export const CartContext = createContext(null)
