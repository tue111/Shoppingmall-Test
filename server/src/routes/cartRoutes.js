import { Router } from 'express';
import { getCart, addItem, updateItem, removeItem, clearCart } from '../controllers/cartController.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

// 모두 로그인한 회원 본인의 장바구니만 다룸 (URL에 회원 ID를 받지 않음)
router.use(requireAuth);

router.route('/').get(getCart).delete(clearCart);
router.post('/items', addItem);
router.route('/items/:itemId').patch(updateItem).delete(removeItem);

export default router;
