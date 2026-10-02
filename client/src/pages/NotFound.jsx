import { Link } from 'react-router-dom'

function NotFound() {
  return (
    <section className="hero">
      <h1>404</h1>
      <p>페이지를 찾을 수 없습니다.</p>
      <Link to="/" className="button">
        홈으로
      </Link>
    </section>
  )
}

export default NotFound
