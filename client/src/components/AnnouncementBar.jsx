const MESSAGES = ['7만원 이상 무료배송', '여름 컬렉션 입고 완료', '모든 포장은 재생지로', '제주 공방 도자기 한정 수량']

// 목록을 짝수 번 이어 붙이고 절반만큼 흘린 뒤 처음으로 돌아가 끊김 없이 반복
// 넓은 화면에서도 절반 길이가 화면 폭보다 길도록 6번 반복
const REPEAT = 6
const ITEMS = Array.from({ length: REPEAT }, () => MESSAGES).flat()

function AnnouncementBar() {
  return (
    <div className="announce" role="region" aria-label="공지">
      <ul className="announce-track">
        {ITEMS.map((message, i) => (
          // 스크린 리더에는 첫 묶음만 읽히도록 반복분은 숨김
          <li key={i} aria-hidden={i >= MESSAGES.length || undefined}>
            {message}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default AnnouncementBar
