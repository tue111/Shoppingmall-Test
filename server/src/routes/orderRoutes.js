import { Router } from 'express';
import {
  createOrder,
  payOrder,
  completePortOnePayment,
  getMyOrders,
  getOrder,
  cancelOrder,
  discardOrder,
} from '../controllers/orderController.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

// 모두 로그인 필요. 주문 생성·결제·취소는 본인 주문만, 상세 조회는 관리자도 가능
router.use(requireAuth);

router.route('/').get(getMyOrders).post(createOrder);
router.route('/:id').get(getOrder).delete(discardOrder);
router.post('/:id/pay', payOrder);
router.post('/:id/portone', completePortOnePayment);
router.post('/:id/cancel', cancelOrder);

export default router;
