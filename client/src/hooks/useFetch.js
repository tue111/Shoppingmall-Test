import { useEffect, useState } from 'react'

// 마운트 시(또는 deps 변경 시) 비동기 함수를 실행하고 data/loading/error 상태를 관리합니다.
// keepPrevious: 다시 불러오는 동안 이전 data를 유지 (목록 새로고침 시 화면 깜빡임 방지)
export default function useFetch(fetcher, deps = [], { keepPrevious = false } = {}) {
  const key = JSON.stringify(deps)
  const [result, setResult] = useState({ key: null, data: null, error: null })

  useEffect(() => {
    let ignore = false

    fetcher()
      .then((data) => {
        if (!ignore) setResult({ key, data, error: null })
      })
      .catch((error) => {
        if (!ignore) setResult({ key, data: null, error })
      })

    return () => {
      ignore = true
    }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps

  // 현재 deps에 대한 응답이 아직 없으면 로딩 중
  const loading = result.key !== key
  return {
    data: loading && !keepPrevious ? null : result.data,
    error: loading ? null : result.error,
    loading,
  }
}
