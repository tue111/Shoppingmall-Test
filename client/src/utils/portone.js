import PortOne from '@portone/browser-sdk/v2'

// 포트원 V2 결제 설정. V2에는 V1의 IMP.init 같은 전역 초기화가 없고, 결제를 요청할 때마다 storeId·channelKey를 함께 넘김
// 두 값은 결제창을 띄우는 데 쓰는 공개 식별자라 브라우저 코드에 들어가도 됨 (비밀 키인 API Secret은 서버 .env에만 둠)
export const PORTONE_CONFIG = {
  // 관리자 콘솔 > 연동 정보 우측 상단의 상점 아이디
  storeId: import.meta.env.VITE_PORTONE_STORE_ID,
  // 관리자 콘솔 > 연동 정보 > 채널 관리에서 PG 채널을 연동한 뒤 발급되는 채널 키
  channelKey: import.meta.env.VITE_PORTONE_CHANNEL_KEY,
}

// .env에 두 값이 모두 있어야 결제창을 띄울 수 있음
export const isPortOneReady = () => Boolean(PORTONE_CONFIG.storeId && PORTONE_CONFIG.channelKey)

// 주문서의 결제 수단 → 포트원 결제수단 코드
const PAY_METHODS = { card: 'CARD', bank_transfer: 'TRANSFER' }

// 주문(서버가 만든 결제 대기 주문)으로 포트원 결제창을 띄움
// paymentId는 주문번호로 사용 → 서버가 결제 결과를 조회할 때 어떤 주문의 결제인지 찾을 수 있음
// 반환: 포트원 응답 { paymentId, txId, code?, message? }. code가 있으면 실패·취소
export function requestPortOnePayment(order, customer) {
  if (!isPortOneReady()) throw new Error('포트원 설정(VITE_PORTONE_STORE_ID, VITE_PORTONE_CHANNEL_KEY)이 없어요.')

  const [first] = order.items
  const orderName = order.items.length > 1 ? `${first.name} 외 ${order.items.length - 1}건` : first.name

  return PortOne.requestPayment({
    storeId: PORTONE_CONFIG.storeId,
    channelKey: PORTONE_CONFIG.channelKey,
    paymentId: order.orderNumber,
    orderName,
    totalAmount: order.totalAmount,
    currency: 'KRW',
    payMethod: PAY_METHODS[order.payment.method] ?? 'CARD',
    customer: {
      fullName: order.shipping.recipient,
      phoneNumber: order.shipping.phone,
      email: customer?.email,
    },
    // 모바일 등 결제사 페이지로 이동하는 방식에서 결제 후 돌아올 주소
    redirectUrl: `${window.location.origin}/orders/${order._id}/complete`,
  })
}
