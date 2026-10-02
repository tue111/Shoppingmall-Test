import { Router } from 'express';
import { getOrders, getStats, updateOrderStatus } from '../controllers/adminController.js';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';

const router = Router();

// 이 라우터의 모든 API는 관리자 전용
router.use(requireAuth, requireAdmin);
router.get('/stats', getStats);
router.get('/orders', getOrders);
router.patch('/orders/:id/status', updateOrderStatus);

export default router;
