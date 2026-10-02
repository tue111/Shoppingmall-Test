import Cart, { CART_ITEM_MAX_QUANTITY } from '../models/Cart.js';
import { shippingFeeFor } from '../models/Order.js';
import Product, { PRODUCT_SIZES_BY_CATEGORY } from '../models/Product.js';

const ITEM_NOT_FOUND = '장바구니에서 해당 상품을 찾을 수 없어요.';
const PRODUCT_NOT_FOUND = '상품을 찾을 수 없어요.';
// 장바구니 화면에 필요한 상품 필드만 함께 내려줌
const PRODUCT_FIELDS = 'sku name price image category stock description';

// 1 ~ CART_ITEM_MAX_QUANTITY 사이 정수만 허용. 아니면 null
function parseQuantity(value) {
  const quantity = Number(value);
  return Number.isInteger(quantity) && quantity >= 1 && quantity <= CART_ITEM_MAX_QUANTITY ? quantity : null;
}
const QUANTITY_MESSAGE = `수량은 1 ~ ${CART_ITEM_MAX_QUANTITY} 사이의 정수로 입력해 주세요.`;

// 사이즈가 있는 카테고리는 목록 중 하나를 꼭 골라야 하고, 없는 카테고리는 사이즈를 무시
// 반환: { size } 또는 { error }
function resolveSize(product, rawSize) {
  const sizes = PRODUCT_SIZES_BY_CATEGORY[product.category];
  if (!sizes) return { size: '' };
  const size = typeof rawSize === 'string' ? rawSize.trim().toUpperCase() : '';
  if (!sizes.includes(size)) return { error: `사이즈를 선택해 주세요. (${sizes.join(', ')})` };
  return { size };
}

// 재고는 상품 단위라서 사이즈가 달라도 같은 상품이면 수량을 합쳐 비교. exceptItem: 수량을 바꾸려는 줄은 제외
function quantityInCart(cart, productId, exceptItem) {
  return cart.items
    .filter((item) => item.product.equals(productId) && item !== exceptItem)
    .reduce((sum, item) => sum + item.quantity, 0);
}

function stockMessage(stock, inCart) {
  if (stock === 0) return '품절된 상품이에요.';
  return `재고가 ${stock}개 남아 있어요.${inCart ? ` (장바구니에 이미 ${inCart}개 담겨 있어요)` : ''}`;
}

// 회원의 장바구니를 가져오고, 없으면 새로 만듦
async function findOrCreateCart(userId) {
  try {
    return await Cart.findOneAndUpdate(
      { user: userId },
      { $setOnInsert: { user: userId } },
      { upsert: true, returnDocument: 'after' }
    );
  } catch (err) {
    // 같은 회원의 첫 담기 요청이 동시에 들어와 둘 다 생성을 시도한 경우 → 먼저 만들어진 것을 사용
    if (err.code === 11000) return Cart.findOne({ user: userId });
    throw err;
  }
}

// 상품 정보를 채우고, 그사이 삭제된 상품의 줄은 정리 (주문 생성에서도 사용)
export async function populateCart(cart) {
  await cart.populate('items.product', PRODUCT_FIELDS);
  const removed = cart.items.filter((item) => !item.product);
  if (removed.length) {
    removed.forEach((item) => item.deleteOne());
    await cart.save();
  }
  return cart;
}

// populateCart를 거친 장바구니를 화면·주문에 쓰는 형태로 정리하고 금액을 계산
// totalPrice: 주문 가능한 상품 금액, shippingFee: 배송비, totalAmount: 결제 예정 금액
export function summarizeCart(cart) {
  const items = cart.items.map((item) => ({
    ...item.toJSON(),
    // 담은 뒤 재고가 줄었거나 품절된 경우 false → 화면에서 안내하고 주문에서 제외
    available: item.quantity <= item.product.stock,
  }));
  const purchasable = items.filter((item) => item.available);
  const totalPrice = purchasable.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const shippingFee = shippingFeeFor(totalPrice);

  return {
    _id: cart._id,
    items,
    totalQuantity: purchasable.reduce((sum, item) => sum + item.quantity, 0),
    totalPrice,
    shippingFee,
    totalAmount: totalPrice + shippingFee,
    updatedAt: cart.updatedAt,
  };
}

const EMPTY_CART = { items: [], totalQuantity: 0, totalPrice: 0, shippingFee: 0, totalAmount: 0 };

async function sendCart(res, cart, status = 200) {
  if (!cart) return res.status(status).json(EMPTY_CART);
  await populateCart(cart);
  res.status(status).json(summarizeCart(cart));
}

// GET /api/cart — 내 장바구니 (아직 없으면 빈 장바구니)
export async function getCart(req, res, next) {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    await sendCart(res, cart);
  } catch (err) {
    next(err);
  }
}

// POST /api/cart/items — { productId, size?, quantity? } 담기. 같은 상품·사이즈가 있으면 수량을 더함
export async function addItem(req, res, next) {
  try {
    const { productId, size: rawSize, quantity: rawQuantity = 1 } = req.body ?? {};
    if (!productId) return res.status(400).json({ message: '담을 상품을 선택해 주세요.' });
    const quantity = parseQuantity(rawQuantity);
    if (!quantity) return res.status(400).json({ message: QUANTITY_MESSAGE });

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: PRODUCT_NOT_FOUND });
    const { size, error } = resolveSize(product, rawSize);
    if (error) return res.status(400).json({ message: error });

    const cart = await findOrCreateCart(req.user._id);
    const inCart = quantityInCart(cart, product._id);
    if (inCart + quantity > product.stock) {
      return res.status(409).json({ message: stockMessage(product.stock, inCart) });
    }

    const existing = cart.items.find((item) => item.product.equals(product._id) && item.size === size);
    if (existing) existing.quantity += quantity;
    else cart.items.push({ product: product._id, size, quantity });
    await cart.save();

    await sendCart(res, cart, existing ? 200 : 201);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/cart/items/:itemId — { quantity } 수량 변경 (더하는 게 아니라 이 값으로 바꿈)
export async function updateItem(req, res, next) {
  try {
    const quantity = parseQuantity(req.body?.quantity);
    if (!quantity) return res.status(400).json({ message: QUANTITY_MESSAGE });

    const cart = await Cart.findOne({ user: req.user._id });
    const item = cart?.items.id(req.params.itemId);
    if (!item) return res.status(404).json({ message: ITEM_NOT_FOUND });

    const product = await Product.findById(item.product);
    if (!product) {
      item.deleteOne();
      await cart.save();
      return res.status(404).json({ message: '판매가 종료된 상품이라 장바구니에서 뺐어요.' });
    }
    // 줄이는 건 항상 허용 (담은 뒤 재고가 줄어 초과된 줄도 한 개씩 줄여 맞출 수 있도록). 늘릴 때만 재고 확인
    const inCart = quantityInCart(cart, product._id, item);
    if (quantity > item.quantity && inCart + quantity > product.stock) {
      return res.status(409).json({ message: stockMessage(product.stock, inCart) });
    }

    item.quantity = quantity;
    await cart.save();
    await sendCart(res, cart);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/cart/items/:itemId — 한 줄 빼기
export async function removeItem(req, res, next) {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    const item = cart?.items.id(req.params.itemId);
    if (!item) return res.status(404).json({ message: ITEM_NOT_FOUND });

    item.deleteOne();
    await cart.save();
    await sendCart(res, cart);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/cart — 전체 비우기
export async function clearCart(req, res, next) {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (cart && cart.items.length) {
      cart.items = [];
      await cart.save();
    }
    await sendCart(res, cart);
  } catch (err) {
    next(err);
  }
}
