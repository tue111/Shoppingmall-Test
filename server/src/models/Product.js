import mongoose from 'mongoose';

export const PRODUCT_CATEGORIES = ['상의', '하의', '신발', '악세사리'];

// 카테고리별 선택 가능한 사이즈. 목록에 없는 카테고리는 사이즈 없이 판매
// client/src/pages/ProductDetail.jsx의 SIZES_BY_CATEGORY와 같게 유지
export const PRODUCT_SIZES_BY_CATEGORY = {
  상의: ['S', 'M', 'L', 'XL'],
  하의: ['S', 'M', 'L', 'XL'],
  신발: ['240', '250', '260', '270', '280'],
};

// 영문 대문자·숫자·하이픈만 허용 (예: TOP-LINEN-001). 저장 시 대문자로 통일
const SKU_PATTERN = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/;

function isHttpsUrl(value) {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

const productSchema = new mongoose.Schema(
  {
    // 상품ID. unique 인덱스로 DB 차원에서 중복 저장을 막음 (중복 시 errorHandler가 409로 응답)
    // 대소문자만 다른 값(abc-1 / ABC-1)이 따로 저장되지 않도록 uppercase로 정규화
    sku: {
      type: String,
      required: [true, '상품ID(SKU)를 입력해 주세요.'],
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: [40, '상품ID(SKU)는 40자 이하로 입력해 주세요.'],
      match: [SKU_PATTERN, '상품ID(SKU)는 영문, 숫자, 하이픈(-)만 사용할 수 있어요.'],
    },
    name: {
      type: String,
      required: [true, '상품 이름을 입력해 주세요.'],
      trim: true,
      maxlength: [100, '상품 이름은 100자 이하로 입력해 주세요.'],
    },
    price: {
      type: Number,
      required: [true, '상품 가격을 입력해 주세요.'],
      min: [0, '상품 가격은 0원 이상이어야 해요.'],
      validate: { validator: Number.isInteger, message: '상품 가격은 원 단위 정수로 입력해 주세요.' },
    },
    category: {
      type: String,
      required: [true, '카테고리를 선택해 주세요.'],
      enum: { values: PRODUCT_CATEGORIES, message: `카테고리는 ${PRODUCT_CATEGORIES.join(', ')} 중 하나여야 해요.` },
    },
    // 이미지 URL (Cloudinary 업로드 위젯이 돌려준 주소)
    // 화면에서 링크(href)·이미지(src)로 쓰이므로 javascript: 같은 주소가 들어가지 않도록 https URL만 허용
    image: {
      type: String,
      required: [true, '상품 이미지를 등록해 주세요.'],
      trim: true,
      maxlength: [2048, '이미지 주소가 너무 길어요.'],
      validate: {
        validator: isHttpsUrl,
        message: '이미지 주소는 https:// 로 시작하는 올바른 URL이어야 해요.',
      },
    },
    description: { type: String, trim: true, default: '' },
    // 관리자 대시보드의 '재고 부족' 집계에서 사용
    stock: { type: Number, default: 0, min: [0, '재고는 0개 이상이어야 해요.'] },
  },
  { timestamps: true }
);

export default mongoose.model('Product', productSchema);
