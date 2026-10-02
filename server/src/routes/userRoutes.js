import { Router } from 'express';
import {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
} from '../controllers/userController.js';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';

const router = Router();

// 회원가입은 누구나, 회원 조회·수정·삭제는 관리자만
const adminOnly = [requireAuth, requireAdmin];

router.route('/').get(adminOnly, getUsers).post(createUser);
router.route('/:id').get(adminOnly, getUser).put(adminOnly, updateUser).delete(adminOnly, deleteUser);

export default router;
