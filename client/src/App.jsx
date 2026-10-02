import { Route, Routes } from 'react-router-dom'
import Layout from '@/components/Layout.jsx'
import AdminLayout from '@/components/AdminLayout.jsx'
import RequireAuth from '@/components/RequireAuth.jsx'
import Home from '@/pages/Home.jsx'
import ProductList from '@/pages/ProductList.jsx'
import ProductDetail from '@/pages/ProductDetail.jsx'
import Signup from '@/pages/Signup.jsx'
import Login from '@/pages/Login.jsx'
import Cart from '@/pages/Cart.jsx'
import Checkout from '@/pages/Checkout.jsx'
import OrderComplete from '@/pages/OrderComplete.jsx'
import MyPage from '@/pages/MyPage.jsx'
import AdminDashboard from '@/pages/admin/AdminDashboard.jsx'
import AdminOrders from '@/pages/admin/AdminOrders.jsx'
import AdminProducts from '@/pages/admin/AdminProducts.jsx'
import NotFound from '@/pages/NotFound.jsx'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="products" element={<ProductList />} />
        <Route path="products/:id" element={<ProductDetail />} />
        <Route path="signup" element={<Signup />} />
        <Route path="login" element={<Login />} />
        <Route
          path="cart"
          element={
            <RequireAuth message="장바구니는 로그인 후 이용할 수 있어요.">
              <Cart />
            </RequireAuth>
          }
        />
        <Route
          path="checkout"
          element={
            <RequireAuth message="주문은 로그인 후 이용할 수 있어요.">
              <Checkout />
            </RequireAuth>
          }
        />
        <Route
          path="orders/:id/complete"
          element={
            <RequireAuth message="주문 내역은 로그인 후 확인할 수 있어요.">
              <OrderComplete />
            </RequireAuth>
          }
        />
        <Route
          path="mypage"
          element={
            <RequireAuth message="주문 내역은 로그인 후 확인할 수 있어요.">
              <MyPage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Route>
      {/* 관리자 화면은 스토어 헤더 없이 별도 레이아웃 */}
      <Route path="admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="products" element={<AdminProducts />} />
        <Route path="orders" element={<AdminOrders />} />
      </Route>
    </Routes>
  )
}

export default App
