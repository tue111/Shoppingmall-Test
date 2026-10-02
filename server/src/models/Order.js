import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { CART_ITEM_MAX_QUANTITY, CART_MAX_ITEMS } from './Cart.js';

// 주문 상태 흐름: 결제 대기 → 결제 완료 → 상품 준비 중 → 배송 중 → 배송 완료
// 취소는 배송 전(결제 대기·결제 완료·상품 준비 중)에만 가능하도록 API에서 제한
export const ORDER_STATUSES = ['pending', 'paid', 'preparing', 'shipping', 'delivered', 'cancelled'];
export const ORDER_STATUS_LABELS = {
  pending: '결제 대기',
  paid: '결제 완료',
  preparing: '상품 준비 중',
  shipping: '배송 중',
  delivered: '배송 완료',
  cancelled: '주문 취소',
};
export const PAYMENT_METHODS = ['card', 'bank_transfer'];

// 배송비: 상품 금액 7만원 이상 무료, 미만 3,000원 (상단 공지 '7만원 이상 무료배송'과 같게 유지)
export const SHIPPING_FEE = 3000;
export const FREE_SHIPPING_THRESHOLD = 70000;
export const shippingFeeFor = (itemsTotal) =>
  itemsTotal === 0 || itemsTotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;

// 주문번호: 날짜 + 무작위 6자리 (예: 20260930-4F7K2Q). 추측하기 어렵고 고객이 읽기 쉬운 형태
// 헷갈리는 글자(0/O, 1/I)는 제외. 중복은 unique 인덱스가 막고, 생성 API에서 한 번 더 시도
const ORDER_NUMBER_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
export function generateOrderNumber(date = new Date()) {
  // 날짜는 한국 시간 기준 (UTC로 하면 새벽 0~9시 주문에 전날 날짜가 붙음)
  const ymd = new Date(date.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10).replaceAll('-', '');
  const suffix = Array.from(crypto.randomBytes(6), (b) => ORDER_NUMBER_CHARS[b % ORDER_NUMBER_CHARS.length]).join('');
  return `${ymd}-${suffix}`;
}

const isWon = { validator: Number.isInteger, message: '금액은 원 단위 정수여야 해요.' };

// 주문한 순간의 상품 정보를 복사해 저장 (스냅샷)
// 이후 상품 가격이 바뀌거나 상품이 삭제돼도 주문 내역·금액은 그대로 유지됨
// product는 상품 페이지 링크·재고 복구용 참조로만 사용
const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    sku: { type: String, required: true },
    name: { type: String, required: true },
    image: { type: String, required: true },
    size: { type: String, default: '' },
    price: { type: Number, required: true, min: 0, validate: isWon },
    quantity: {
      type: Number,
      required: true,
      min: [1, '수량은 1개 이상이어야 해요.'],
      max: [CART_ITEM_MAX_QUANTITY, `수량은 ${CART_ITEM_MAX_QUANTITY}개까지 주문할 수 있어요.`],
      validate: { validator: Number.isInteger, message: '수량은 정수여야 해요.' },
    },
  },
  { _id: false }
);

// 받는 사람·배송지. 회원 정보와 별개로 주문마다 저장 (회원 주소를 바꿔도 지난 주문의 배송지는 유지)
const shippingSchema = new mongoose.Schema(
  {
    recipient: {
      type: String,
      required: [true, '받는 분 이름을 입력해 주세요.'],
      trim: true,
      maxlength: [30, '받는 분 이름은 30자 이하로 입력해 주세요.'],
    },
    phone: {
      type: String,
      required: [true, '연락처를 입력해 주세요.'],
      trim: true,
      // 휴대폰·지역번호 모두 허용 (하이픈 있어도 없어도 됨). 예: 010-1234-5678, 064-123-4567
      match: [/^0\d{1,2}-?\d{3,4}-?\d{4}$/, '연락처 형식이 올바르지 않아요. (예: 010-1234-5678)'],
    },
    postalCode: {
      type: String,
      required: [true, '우편번호를 입력해 주세요.'],
      trim: true,
      match: [/^\d{5}$/, '우편번호는 숫자 5자리예요.'],
    },
    address: {
      type: String,
      required: [true, '주소를 입력해 주세요.'],
      trim: true,
      maxlength: [200, '주소가 너무 길어요.'],
    },
    addressDetail: { type: String, trim: true, default: '', maxlength: [100, '상세 주소가 너무 길어요.'] },
    memo: { type: String, trim: true, default: '', maxlength: [100, '배송 메모는 100자 이하로 입력해 주세요.'] },
    // 배송 시작 시 관리자가 입력
    trackingNumber: { type: String, trim: true, default: '' },
    shippedAt: Date,
    deliveredAt: Date,
  },
  { _id: false }
);

// 결제 정보. 실제 결제(PG) 연동 전이라 거래 ID는 비어 있을 수 있음
const paymentSchema = new mongoose.Schema(
  {
    method: {
      type: String,
      required: [true, '결제 수단을 선택해 주세요.'],
      enum: { values: PAYMENT_METHODS, message: '지원하지 않는 결제 수단이에요.' },
    },
    // 결제를 처리한 곳. fake: 테스트용 가짜 결제, portone: 포트원 (취소 시 포트원 환불 필요)
    provider: { type: String, enum: ['fake', 'portone'] },
    // 결제 거래 ID (포트원 거래 ID 또는 가짜 결제 ID). 포트원 결제 조회·취소는 주문번호(paymentId)로 함
    transactionId: { type: String, default: '' },
    paidAt: Date,
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true, default: () => generateOrderNumber() },
    // 회원별 조회는 아래 { user, createdAt } 복합 인덱스를 사용
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: {
      type: [orderItemSchema],
      validate: [
        { validator: (items) => items.length > 0, message: '주문할 상품이 없어요.' },
        { validator: (items) => items.length <= CART_MAX_ITEMS, message: `한 번에 ${CART_MAX_ITEMS}개 상품까지 주문할 수 있어요.` },
      ],
    },
    // 금액은 주문 시점에 서버가 계산해 저장 (클라이언트가 보낸 금액은 쓰지 않음)
    itemsTotal: { type: Number, required: true, min: 0, validate: isWon },
    shippingFee: { type: Number, required: true, min: 0, default: 0, validate: isWon },
    totalAmount: { type: Number, required: true, min: 0, validate: isWon },
    status: {
      type: String,
      enum: { values: ORDER_STATUSES, message: '올바르지 않은 주문 상태예요.' },
      default: 'pending',
      index: true,
    },
    shipping: { type: shippingSchema, required: true },
    payment: { type: paymentSchema, required: true },
    cancelledAt: Date,
    cancelReason: { type: String, trim: true, default: '', maxlength: [200, '취소 사유는 200자 이하로 입력해 주세요.'] },
  },
  { timestamps: true }
);

// 금액이 상품 목록과 맞지 않게 저장되는 것을 막음 (계산 실수·조작 방지)
orderSchema.pre('validate', function () {
  const itemsTotal = (this.items ?? []).reduce((sum, item) => sum + item.price * item.quantity, 0);
  if (this.itemsTotal !== itemsTotal) {
    this.invalidate('itemsTotal', '상품 금액 합계가 주문 상품과 맞지 않아요.');
  }
  if (this.totalAmount !== this.itemsTotal + this.shippingFee) {
    this.invalidate('totalAmount', '결제 금액이 상품 금액 + 배송비와 맞지 않아요.');
  }
});

// 최근 주문부터 보는 회원 주문 내역 조회용
orderSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model('Order', orderSchema);
