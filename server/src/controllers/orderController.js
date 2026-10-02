import crypto from 'node:crypto';
import { isPortOneEnabled, portone } from '../config/portone.js';
import Cart from '../models/Cart.js';
import Order, { generateOrderNumber, shippingFeeFor } from '../models/Order.js';
import Product from '../models/Product.js';
import { populateCart, summarizeCart } from './cartController.js';

const ORDER_NOT_FOUND = '주문을 찾을 수 없어요.';
// 배송이 시작되기 전까지만 고객이 직접 취소 가능
const CANCELLABLE_STATUSES = ['pending', 'paid', 'preparing'];
// 결제 완료 후 취소하면 차감했던 재고를 되돌려야 하는 상태
const STOCK_DEDUCTED_STATUSES = ['paid', 'preparing'];
// 요청 바디에서 받는 배송지 필드 (송장번호 등 관리자용 필드는 받지 않음)
const SHIPPING_FIELDS = ['recipient', 'phone', 'postalCode', 'address', 'addressDetail', 'memo'];

function pickShipping(shipping = {}) {
  return Object.fromEntries(
    SHIPPING_FIELDS.filter((key) => typeof shipping[key] === 'string').map((key) => [key, shipping[key]])
  );
}

// 관리자는 모든 주문, 고객은 자기 주문만 조회
function ownerFilter(req) {
  return req.user.user_type === 'admin' ? {} : { user: req.user._id };
}

// 결제 완료 시 주문 상품 수만큼 재고 차감. 재고가 모자란 상품이 하나라도 있으면
// 이미 차감한 것을 되돌리고 그 상품을 반환 (MongoDB 트랜잭션 없이 조건부 차감 + 되돌리기로 처리)
async function deductStock(items) {
  const done = [];
  for (const item of items) {
    const { modifiedCount } = await Product.updateOne(
      { _id: item.product, stock: { $gte: item.quantity } },
      { $inc: { stock: -item.quantity } }
    );
    if (modifiedCount !== 1) {
      await restoreStock(done);
      return item;
    }
    done.push(item);
  }
  return null;
}

async function restoreStock(items) {
  await Promise.all(items.map((item) => Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } })));
}

// 주문한 상품(같은 상품·사이즈)을 장바구니에서 뺌. 실패해도 주문은 완료된 상태라 오류로 돌려보내지 않음
async function removeOrderedFromCart(order) {
  try {
    const cart = await Cart.findOne({ user: order.user });
    if (!cart) return;
    const ordered = new Set(order.items.map((item) => `${item.product}:${item.size}`));
    cart.items = cart.items.filter((item) => !ordered.has(`${item.product}:${item.size}`));
    await cart.save();
  } catch (err) {
    console.error('주문 후 장바구니 정리 실패:', err);
  }
}

// 결제 완료 처리. 결제 수단과 관계없이 결제가 확인된 뒤 이 함수를 부름
// 반환: { order } 또는 { reason, status, message }
//   reason: 'not_found' | 'not_pending'(이미 결제됐거나 취소됨) | 'out_of_stock'(재고 부족 → 결제 취소 필요)
async function completePayment(orderId, userId, { provider, transactionId }) {
  // 결제 대기 상태인 주문만 결제 완료로 바꿈. 같은 주문에 결제 요청이 두 번 와도 한 번만 처리됨
  const order = await Order.findOneAndUpdate(
    { _id: orderId, user: userId, status: 'pending' },
    {
      $set: {
        status: 'paid',
        'payment.provider': provider,
        'payment.transactionId': transactionId,
        'payment.paidAt': new Date(),
      },
    },
    { returnDocument: 'after' }
  );
  if (!order) {
    const exists = await Order.exists({ _id: orderId, user: userId });
    return exists
      ? { reason: 'not_pending', status: 409, message: '이미 결제됐거나 취소된 주문이에요.' }
      : { reason: 'not_found', status: 404, message: ORDER_NOT_FOUND };
  }

  const shortItem = await deductStock(order.items);
  if (shortItem) {
    // 재고가 모자라면 결제 완료를 되돌리고 주문은 결제 대기로 남겨 둠 (클라이언트가 취소 처리)
    await Order.updateOne(
      { _id: order._id },
      { $set: { status: 'pending', 'payment.transactionId': '' }, $unset: { 'payment.paidAt': 1, 'payment.provider': 1 } }
    );
    return {
      reason: 'out_of_stock',
      status: 409,
      message: `'${shortItem.name}' 상품의 재고가 부족해요. 장바구니에서 수량을 확인해 주세요.`,
    };
  }

  await removeOrderedFromCart(order);
  return { order };
}

// 포트원 결제 전액 취소(환불). 이미 취소된 결제면 성공으로 봄
async function cancelPortOnePayment(order, reason) {
  try {
    await portone.cancelPayment({ paymentId: order.orderNumber, reason });
  } catch (err) {
    if (err.data?.type === 'PAYMENT_ALREADY_CANCELLED') return;
    throw err;
  }
}

// 포트원에서 이 주문의 결제를 조회. 결제 시도가 없었으면 null
async function findPortOnePayment(order) {
  try {
    return await portone.getPayment({ paymentId: order.orderNumber });
  } catch (err) {
    if (err.data?.type === 'PAYMENT_NOT_FOUND') return null;
    throw err;
  }
}

// POST /api/orders — { shipping, payment: { method }, expectedAmount } 장바구니의 주문 가능한 상품으로 주문 생성 (결제 대기)
// 상품 정보·금액은 서버가 장바구니와 상품 DB로 계산 (클라이언트가 보낸 금액은 쓰지 않음)
// expectedAmount: 고객이 주문서에서 본 결제 금액. 그사이 가격·재고가 바뀌어 금액이 달라졌으면 주문하지 않음
export async function createOrder(req, res, next) {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) return res.status(400).json({ message: '장바구니가 비어 있어요.' });
    await populateCart(cart);
    const { items } = summarizeCart(cart);
    const orderable = items.filter((item) => item.available);
    if (!orderable.length) return res.status(400).json({ message: '주문할 수 있는 상품이 없어요.' });

    const orderItems = orderable.map(({ product, size, quantity }) => ({
      product: product._id,
      sku: product.sku,
      name: product.name,
      image: product.image,
      size,
      price: product.price,
      quantity,
    }));
    const itemsTotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shippingFee = shippingFeeFor(itemsTotal);
    const expectedAmount = req.body?.expectedAmount;
    if (expectedAmount !== undefined && expectedAmount !== itemsTotal + shippingFee) {
      return res.status(409).json({ message: '그사이 상품 가격이나 재고가 바뀌어 결제 금액이 달라졌어요. 바뀐 금액을 확인하고 다시 결제해 주세요.' });
    }

    const data = {
      user: req.user._id,
      items: orderItems,
      itemsTotal,
      shippingFee,
      totalAmount: itemsTotal + shippingFee,
      shipping: pickShipping(req.body?.shipping),
      payment: { method: req.body?.payment?.method },
    };

    // 주문번호가 드물게 겹치면(unique 위반) 새 번호로 다시 시도
    for (let attempt = 1; ; attempt++) {
      try {
        const order = await Order.create({ ...data, orderNumber: generateOrderNumber() });
        return res.status(201).json(order);
      } catch (err) {
        if (err.code === 11000 && err.keyPattern?.orderNumber && attempt < 3) continue;
        throw err;
      }
    }
  } catch (err) {
    next(err);
  }
}

// POST /api/orders/:id/pay — 테스트용 가짜 결제. 실제 결제 없이 바로 결제 완료 처리
// 포트원이 설정돼 있으면 막음 (열어 두면 결제 없이 주문을 완료하는 통로가 됨)
export async function payOrder(req, res, next) {
  try {
    if (isPortOneEnabled()) {
      return res.status(403).json({ message: '실제 결제가 설정되어 있어 테스트 결제는 사용할 수 없어요.' });
    }
    const result = await completePayment(req.params.id, req.user._id, {
      provider: 'fake',
      transactionId: `FAKE-${crypto.randomUUID()}`,
    });
    if (!result.order) return res.status(result.status).json({ message: result.message });
    res.json(result.order);
  } catch (err) {
    next(err);
  }
}

// POST /api/orders/:id/portone — 포트원 결제창이 끝난 뒤 호출. 서버가 포트원에 직접 결제를 조회해 확인한 뒤 결제 완료 처리
// 브라우저가 보낸 '성공' 여부나 금액은 믿지 않음. 결제 ID는 주문번호로 정해져 있어 요청 바디도 받지 않음
// 결제창 응답(프로미스)과 모바일 리디렉션 양쪽에서 호출될 수 있어, 이미 이 결제로 완료된 주문이면 그대로 돌려줌
export async function completePortOnePayment(req, res, next) {
  try {
    if (!isPortOneEnabled()) return res.status(503).json({ message: '결제 설정이 되어 있지 않아요.' });

    const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
    if (!order) return res.status(404).json({ message: ORDER_NOT_FOUND });
    if (order.status !== 'pending') {
      if (order.payment.provider === 'portone' && order.status !== 'cancelled') return res.json(order);
      return res.status(409).json({ message: '이미 결제됐거나 취소된 주문이에요.' });
    }

    const payment = await findPortOnePayment(order);
    if (!payment) return res.status(400).json({ message: '결제 내역을 찾을 수 없어요.' });
    if (payment.status !== 'PAID') {
      return res.status(409).json({ message: '결제가 완료되지 않았어요.', paymentStatus: payment.status });
    }

    // 개발 중 안전장치: 실결제(LIVE) 채널로 결제됐으면 바로 취소 (배포 환경 NODE_ENV=production에서만 실결제 허용)
    if (payment.channel?.type === 'LIVE' && process.env.NODE_ENV !== 'production') {
      await cancelPortOnePayment(order, '개발 환경 실결제 차단');
      return res.status(400).json({ message: '개발 환경에서는 실결제 채널을 쓸 수 없어 결제를 취소했어요. 테스트 채널 키를 사용해 주세요.' });
    }

    // 결제된 금액이 주문 금액과 다르면 (결제창 요청 조작 등) 결제를 취소하고 주문하지 않음
    if (payment.amount.total !== order.totalAmount || payment.currency !== 'KRW') {
      await cancelPortOnePayment(order, '결제 금액 불일치');
      return res.status(400).json({ message: '결제 금액이 주문 금액과 달라 결제를 취소했어요.' });
    }

    const result = await completePayment(order._id, req.user._id, {
      provider: 'portone',
      transactionId: payment.transactionId,
    });
    if (result.order) return res.json(result.order);
    if (result.reason === 'not_pending') {
      // 동시에 들어온 다른 요청(리디렉션 등)이 먼저 완료 처리함
      const done = await Order.findById(order._id);
      if (done.status !== 'cancelled' && done.payment.provider === 'portone') return res.json(done);
    }
    if (result.reason === 'out_of_stock') {
      await cancelPortOnePayment(order, '재고 부족');
      return res.status(409).json({ message: `${result.message} 결제는 자동으로 취소돼요.` });
    }
    res.status(result.status).json({ message: result.message });
  } catch (err) {
    next(err);
  }
}

// GET /api/orders — 내 주문 목록 (최근 순). 관리자도 여기서는 자기 주문만 봄
export async function getMyOrders(req, res, next) {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(100);
    res.json(orders);
  } catch (err) {
    next(err);
  }
}

// GET /api/orders/:id — 주문 상세 (본인 주문, 관리자는 모든 주문)
export async function getOrder(req, res, next) {
  try {
    const order = await Order.findOne({ _id: req.params.id, ...ownerFilter(req) });
    if (!order) return res.status(404).json({ message: ORDER_NOT_FOUND });
    res.json(order);
  } catch (err) {
    next(err);
  }
}

// 포트원에서 실제로 돈이 빠져나간 적이 있는 결제 상태 (지금 결제돼 있거나, 결제 후 취소·환불됨)
const CHARGED_PAYMENT_STATUSES = ['PAID', 'CANCELLED', 'PARTIAL_CANCELLED'];

// DELETE /api/orders/:id — 결제에 실패한 결제 대기 주문을 없앰 (주문 내역에 남기지 않음)
// 재고·장바구니는 결제 완료 때만 바뀌므로 여기서는 손대지 않음 → 장바구니는 그대로 남음
// 예외: 포트원에서 실제 결제가 됐던 주문은 환불하고, 환불 기록을 남기기 위해 지우지 않고 취소 상태로 둠
export async function discardOrder(req, res, next) {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
    if (!order) return res.status(404).json({ message: ORDER_NOT_FOUND });
    if (order.status !== 'pending') {
      return res.status(409).json({ message: '결제 대기 중인 주문만 없앨 수 있어요.' });
    }

    if (isPortOneEnabled()) {
      let payment;
      try {
        payment = await findPortOnePayment(order);
        if (payment?.status === 'PAID') await cancelPortOnePayment(order, '결제 실패');
      } catch (err) {
        console.error('포트원 결제 취소 실패:', err);
        return res.status(502).json({ message: '결제 취소(환불)에 실패했어요. 잠시 후 다시 시도해 주세요.' });
      }
      if (CHARGED_PAYMENT_STATUSES.includes(payment?.status)) {
        await Order.updateOne(
          { _id: order._id, status: 'pending' },
          { $set: { status: 'cancelled', cancelledAt: new Date(), cancelReason: '결제 실패 (환불)' } }
        );
        return res.status(204).end();
      }
    }

    // 확인한 뒤 그사이 결제 완료된 주문은 지우지 않도록 결제 대기 상태일 때만 삭제
    await Order.deleteOne({ _id: order._id, status: 'pending' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

// POST /api/orders/:id/cancel — { reason? } 배송 시작 전 주문 취소. 결제 완료 후 취소면 재고를 되돌림
// 포트원으로 결제한 주문은 포트원 환불이 성공해야 주문을 취소함 (환불 실패 시 주문은 그대로)
export async function cancelOrder(req, res, next) {
  try {
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.slice(0, 200) : '';
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
    if (!order) return res.status(404).json({ message: ORDER_NOT_FOUND });
    if (!CANCELLABLE_STATUSES.includes(order.status)) {
      return res.status(409).json({ message: '배송이 시작됐거나 이미 취소된 주문이라 취소할 수 없어요.' });
    }

    if (isPortOneEnabled()) {
      try {
        if (order.payment.provider === 'portone') {
          await cancelPortOnePayment(order, reason || '고객 요청 취소');
        } else if (order.status === 'pending') {
          // 결제창에서 결제는 됐는데 완료 처리 전에 브라우저가 닫힌 경우를 대비해, 포트원에 결제가 있으면 함께 취소
          const payment = await findPortOnePayment(order);
          if (payment?.status === 'PAID') await cancelPortOnePayment(order, reason || '결제 대기 주문 취소');
        }
      } catch (err) {
        console.error('포트원 결제 취소 실패:', err);
        return res.status(502).json({ message: '결제 취소(환불)에 실패했어요. 잠시 후 다시 시도해 주세요.' });
      }
    }

    // 확인한 상태 그대로일 때만 취소 (그사이 배송 시작 등으로 바뀌었으면 취소하지 않음)
    const cancelled = await Order.findOneAndUpdate(
      { _id: order._id, status: order.status },
      { $set: { status: 'cancelled', cancelledAt: new Date(), cancelReason: reason } },
      { returnDocument: 'after' }
    );
    if (!cancelled) return res.status(409).json({ message: '주문 상태가 방금 바뀌었어요. 새로고침 후 다시 시도해 주세요.' });

    if (STOCK_DEDUCTED_STATUSES.includes(order.status)) await restoreStock(order.items);
    res.json(cancelled);
  } catch (err) {
    next(err);
  }
}
