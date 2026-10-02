# Shopping Mall Client

React + Vite 기반 쇼핑몰 프론트엔드입니다.

## 시작하기

```bash
npm install
npm run dev      # http://localhost:5173
```

API 요청(`/api/*`)은 Vite proxy를 통해 `http://localhost:5000`(server)으로 전달됩니다.
서버를 먼저 실행해 주세요: `cd ../server && npm run dev`

## 스크립트

| 명령어 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 실행 |
| `npm run build` | 프로덕션 빌드 (`dist/`) |
| `npm run preview` | 빌드 결과 미리보기 |
| `npm run lint` | oxlint 검사 |

## 폴더 구조

```
src/
├── api/          # axios 인스턴스, API 함수
├── components/   # 공통 컴포넌트 (Layout, Header 등)
├── hooks/        # 커스텀 훅
├── pages/        # 라우트 페이지
├── utils/        # 유틸 함수
├── App.jsx       # 라우팅
└── main.jsx      # 엔트리
```

`@/` 경로 별칭은 `src/`를 가리킵니다. (예: `import api from '@/api/client.js'`)
