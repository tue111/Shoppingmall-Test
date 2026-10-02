import { Router } from 'express';
import {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../controllers/productController.js';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';

const router = Router();

// 조회는 스토어에서 누구나, 등록·수정·삭제는 관리자만
const adminOnly = [requireAuth, requireAdmin];

router.route('/').get(getProducts).post(adminOnly, createProduct);
router.route('/:id').get(getProduct).put(adminOnly, updateProduct).delete(adminOnly, deleteProduct);

export default router;
