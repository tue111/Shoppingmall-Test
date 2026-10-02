import { useState } from 'react'

// 배열을 페이지 단위로 나눠 현재 페이지의 항목만 돌려줍니다.
// 목록이 줄어 현재 페이지가 범위를 벗어나면(예: 필터 적용, 삭제) 마지막 페이지로 맞춤
export default function usePagination(items, pageSize) {
  const [page, setPage] = useState(1)
  const total = items?.length ?? 0
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const current = Math.min(page, pageCount)
  const start = (current - 1) * pageSize

  return {
    page: current,
    pageCount,
    setPage,
    pageItems: (items ?? []).slice(start, start + pageSize),
  }
}
