import { TOKEN_COOKIE, findUserByToken } from '../controllers/authController.js';

// 로그인 쿠키의 토큰으로 유저를 확인해 req.user에 담음. 없거나 무효하면 401
export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.[TOKEN_COOKIE];
    const user = token && (await findUserByToken(token));
    if (!user) return res.status(401).json({ message: '로그인이 필요합니다.' });
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

// requireAuth 뒤에 두어 관리자만 통과시킴
export function requireAdmin(req, res, next) {
  if (req.user?.user_type !== 'admin') {
    return res.status(403).json({ message: '관리자만 접근할 수 있습니다.' });
  }
  next();
}
