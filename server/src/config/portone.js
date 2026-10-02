import { PaymentClient } from '@portone/server-sdk';

// 포트원 V2 결제 조회·취소용 클라이언트. PORTONE_API_SECRET이 없으면 null (포트원 미사용 → 테스트용 가짜 결제만 가능)
// PORTONE_API_URL은 자동 테스트에서 가짜 포트원 서버를 가리킬 때만 사용 (기본값: https://api.portone.io)
const secret = process.env.PORTONE_API_SECRET;

export const portone = secret
  ? PaymentClient({ secret, ...(process.env.PORTONE_API_URL && { baseUrl: process.env.PORTONE_API_URL }) })
  : null;

export const isPortOneEnabled = () => portone !== null;
