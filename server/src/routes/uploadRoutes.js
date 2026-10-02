import { Router } from 'express';
import { getCloudinaryConfig, signCloudinaryUpload } from '../controllers/cloudinaryController.js';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';

const router = Router();

// 상품 이미지는 Cloudinary 업로드 위젯으로 올림. 관리자에게만 설정값과 업로드 서명을 발급
router.use(requireAuth, requireAdmin);
router.get('/cloudinary/config', getCloudinaryConfig);
router.post('/cloudinary/signature', signCloudinaryUpload);

export default router;
