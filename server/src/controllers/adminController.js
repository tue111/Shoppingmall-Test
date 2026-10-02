import User from '../models/User.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';

const DAY_MS = 24 * 60 * 60 * 1000;
// 재고가 이 수량 이하이면 '재고 부족'으로 집계
export const LOW_STOCK_THRESHOLD = 5;
// 관리자가 바꿀 수 있는 배송 단계 (결제 완료 이후 순서대로)
const FULFILMENT_STATUSES = ['paid', 'preparing', 'shipping', 'delivered'];
// 주문 관리 목록에 내려주는 필드
const ORDER_LIST_FIELDS = 'orderNumber createdAt user items.name totalAmount status shipping.recipient';

// 이번 주 월요일 0시 (서버 로컬 시간 기준)
function startOfWeek(date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const daysSinceMonday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - daysSinceMonday);
  return start;
}

export async function getStats(req, res, next) {
  try {
    const now = new Date();
    const thisWeek = startOfWeek(now);
    const lastWeek = new Date(thisWeek.getTime() - 7 * DAY_MS);

    const [newUsersThisWeek, newUsersLastWeek, totalUsers, totalProducts, lowStock] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: thisWeek } }),
      User.countDocuments({ createdAt: { $gte: lastWeek, $lt: thisWeek } }),
      User.countDocuments(),
      Product.countDocuments(),
      Product.countDocuments({ stock: { $lte: LOW_STOCK_THRESHOLD } }),
    ]);

    res.json({
      generatedAt: now,
      // 주문 모델이 아직 없어 매출·주문 관련 지표는 null로 응답
      orders: null,
      users: { total: totalUsers, newThisWeek: newUsersThisWeek, newLastWeek: newUsersLastWeek },
      products: { total: totalProducts, lowStock, lowStockThreshold: LOW_STOCK_THRESHOLD },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/orders — 주문 관리 목록 (최근 순). 목록에 필요한 필드만 내려줌
// 결제 대기(pending)는 결제창을 닫아 버린 미완료 주문이 대부분이라 제외
export async function getOrders(req, res, next) {
  try {
    const orders = await Order.find({ status: { $ne: 'pending' } })
      .select(ORDER_LIST_FIELDS)
      .populate('user', 'username')
      .sort({ createdAt: -1 })
      .limit(500);
    res.json(orders);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/admin/orders/:id/status — { status } 결제된 주문의 배송 단계 변경
// 단계 사이는 앞뒤로 자유롭게 바꿀 수 있음 (잘못 바꿨을 때 되돌리기 위함)
// 취소는 환불·재고 복구가 따라야 해서 여기서 다루지 않고, 결제 대기·취소된 주문은 바꿀 수 없음
export async function updateOrderStatus(req, res, next) {
  try {
    const status = req.body?.status;
    if (!FULFILMENT_STATUSES.includes(status)) {
      return res.status(400).json({ message: '바꿀 수 없는 주문 상태예요.' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: '주문을 찾을 수 없어요.' });
    if (!FULFILMENT_STATUSES.includes(order.status)) {
      return res.status(409).json({ message: '결제 대기 중이거나 취소된 주문은 상태를 바꿀 수 없어요.' });
    }

    // 배송 시작·완료 시각은 해당 단계에 처음 들어설 때 기록하고, 그 앞 단계로 되돌리면 지움
    const reached = (step) => FULFILMENT_STATUSES.indexOf(status) >= FULFILMENT_STATUSES.indexOf(step);
    const now = new Date();
    const $set = { status };
    const $unset = {};
    for (const [field, step] of [['shippedAt', 'shipping'], ['deliveredAt', 'delivered']]) {
      if (!reached(step)) $unset[`shipping.${field}`] = 1;
      else if (!order.shipping[field]) $set[`shipping.${field}`] = now;
    }

    // 확인한 상태 그대로일 때만 변경 (그사이 고객이 취소했으면 바꾸지 않음)
    const updated = await Order.findOneAndUpdate(
      { _id: order._id, status: order.status },
      { $set, ...(Object.keys($unset).length > 0 && { $unset }) },
      { returnDocument: 'after' }
    )
      .select(ORDER_LIST_FIELDS)
      .populate('user', 'username');
    if (!updated) return res.status(409).json({ message: '주문 상태가 방금 바뀌었어요. 새로고침 후 다시 시도해 주세요.' });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}
