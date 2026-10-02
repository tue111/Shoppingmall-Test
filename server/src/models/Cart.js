import mongoose from 'mongoose';

export const CART_MAX_ITEMS = 50;
export const CART_ITEM_MAX_QUANTITY = 99;

// 장바구니에 담긴 상품 한 줄. 같은 상품이라도 사이즈가 다르면 별도 줄로 담김
// 가격·이름은 저장하지 않고 조회 시 populate로 현재 상품 정보를 사용 (가격 변경·품절이 바로 반영되도록)
// 주문 시점의 가격은 주문(Order) 쪽에 따로 기록해야 함
const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, '담을 상품을 선택해 주세요.'],
    },
    // 사이즈가 없는 상품(예: 악세사리)은 빈 문자열
    size: { type: String, trim: true, default: '', maxlength: [20, '사이즈 값이 너무 길어요.'] },
    quantity: {
      type: Number,
      required: true,
      default: 1,
      min: [1, '수량은 1개 이상이어야 해요.'],
      max: [CART_ITEM_MAX_QUANTITY, `수량은 ${CART_ITEM_MAX_QUANTITY}개까지 담을 수 있어요.`],
      validate: { validator: Number.isInteger, message: '수량은 정수로 입력해 주세요.' },
    },
  },
  // 줄마다 _id를 두어 수량 변경·삭제 API에서 특정 줄을 가리킬 수 있게 함
  { timestamps: { createdAt: 'addedAt', updatedAt: false } }
);

// 회원 1명당 장바구니 1개. 로그인한 회원만 사용 (비회원 장바구니는 브라우저 저장소에서 처리)
const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    items: {
      type: [cartItemSchema],
      default: [],
      validate: [
        {
          validator: (items) => items.length <= CART_MAX_ITEMS,
          message: `장바구니에는 최대 ${CART_MAX_ITEMS}개 상품까지 담을 수 있어요.`,
        },
        {
          // 같은 상품·사이즈가 두 줄로 나뉘지 않도록 (다시 담으면 기존 줄의 수량을 늘려야 함)
          validator: (items) => new Set(items.map((i) => `${i.product}:${i.size}`)).size === items.length,
          message: '같은 상품·사이즈가 장바구니에 중복으로 담겨 있어요.',
        },
      ],
    },
  },
  // optimisticConcurrency: 두 요청이 같은 장바구니를 동시에 고치면 나중 저장을 VersionError로 막음 (변경이 조용히 덮이지 않도록)
  { timestamps: true, optimisticConcurrency: true }
);

export default mongoose.model('Cart', cartSchema);
