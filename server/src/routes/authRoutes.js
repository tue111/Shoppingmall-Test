import { Router } from 'express';
import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import { login, getMe, logout, normalizeEmail } from '../controllers/authController.js';

const router = Router();

// 무차별 대입 방지: 같은 IP + 같은 이메일로 15분 동안 10번 실패하면 잠시 차단
// 비밀번호 불일치(401)만 횟수에 포함하고, 입력 누락(400)이나 성공은 세지 않음
// 없는 이메일도 똑같이 401로 세어 가입 여부가 드러나지 않게 함
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  requestWasSuccessful: (req, res) => res.statusCode !== 401,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => `${ipKeyGenerator(req.ip)}:${normalizeEmail(req.body?.email)}`,
  message: { message: '로그인 시도가 너무 많아요. 15분 후 다시 시도해 주세요.' },
});

router.post('/login', loginLimiter, login);
router.get('/me', getMe);
router.post('/logout', logout);

export default router;
