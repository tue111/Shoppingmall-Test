const GAP = 'gap'

// 표시할 페이지 번호 목록. 처음·끝과 현재 주변(siblings)만 보이고 나머지는 '…'로 줄임
// 예) 현재 6 / 전체 12 → 1 … 5 6 7 … 12
function pageRange(page, pageCount, siblings = 1) {
  const start = Math.max(2, page - siblings)
  const end = Math.min(pageCount - 1, page + siblings)
  const pages = [1]
  // 한 페이지만 가려질 때는 '…' 대신 그 번호를 그대로 보여줌
  if (start > 3) pages.push(GAP)
  else if (start === 3) pages.push(2)
  for (let p = start; p <= end; p++) pages.push(p)
  if (end < pageCount - 2) pages.push(GAP)
  else if (end === pageCount - 2) pages.push(pageCount - 1)
  if (pageCount > 1) pages.push(pageCount)
  return pages
}

function Chevron({ direction }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={direction === 'left' ? 'm15 18-6-6 6-6' : 'm9 18 6-6-6-6'} />
    </svg>
  )
}

// 페이지 이동 버튼. 한 페이지뿐이면 렌더하지 않음
// usePagination 훅과 함께 쓰면 됨: <Pagination page={page} pageCount={pageCount} onChange={setPage} />
function Pagination({ page, pageCount, onChange, label = '페이지 이동' }) {
  if (pageCount <= 1) return null

  return (
    <nav className="pagination" aria-label={label}>
      <button type="button" className="pagination-button" onClick={() => onChange(page - 1)} disabled={page === 1} aria-label="이전 페이지">
        <Chevron direction="left" />
      </button>
      {pageRange(page, pageCount).map((p, i) =>
        p === GAP ? (
          <span key={`gap-${i}`} className="pagination-gap" aria-hidden="true">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            className="pagination-button"
            onClick={() => onChange(p)}
            aria-current={p === page ? 'page' : undefined}
            aria-label={`${p}페이지`}
          >
            {p}
          </button>
        ),
      )}
      <button type="button" className="pagination-button" onClick={() => onChange(page + 1)} disabled={page === pageCount} aria-label="다음 페이지">
        <Chevron direction="right" />
      </button>
    </nav>
  )
}

export default Pagination
