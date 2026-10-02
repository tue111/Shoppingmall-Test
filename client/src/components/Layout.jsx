import { matchPath, Outlet, useLocation } from 'react-router-dom'
import AnnouncementBar from './AnnouncementBar.jsx'
import Header from './Header.jsx'

// 메인·장바구니·주문·마이페이지는 상단 띠가 화면 끝까지 차야 하므로 container 폭 제한 없이 렌더 (페이지 안에서 container 사용)
const FULL_BLEED_PATHS = ['/', '/cart', '/checkout', '/orders/:id/complete', '/mypage']

function Layout() {
  const { pathname } = useLocation()
  const fullBleed = FULL_BLEED_PATHS.some((path) => matchPath(path, pathname))

  return (
    <>
      <AnnouncementBar />
      <Header />
      <main className={fullBleed ? 'main-full' : 'container'}>
        <Outlet />
      </main>
      <footer className="footer">© {new Date().getFullYear()} 물결상점</footer>
    </>
  )
}

export default Layout
