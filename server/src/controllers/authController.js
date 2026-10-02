import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';
import RevokedToken from '../models/RevokedToken.js';

export const TOKEN_COOKIE = 'token';
const TOKEN_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// 이메일 존재 여부를 노출하지 않도록 두 경우 모두 같은 메시지로 응답
const INVALID_CREDENTIALS = '이메일 또는 비밀번호가 올바르지 않습니다.';

// 없는 이메일일 때도 bcrypt 비교를 한 번 수행해 응답 시간으로 가입 여부를 알 수 없게 함
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', 10);

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
};

export const normalizeEmail = (email) => (typeof email === 'string' ? email.trim().toLowerCase() : '');

function signToken(user) {
  return jwt.sign(
    { sub: user.id, user_type: user.user_type, ver: user.tokenVersion },
    process.env.JWT_SECRET,
    { expiresIn: TOKEN_EXPIRES_IN, jwtid: crypto.randomUUID() }
  );
}

// 쿠키의 토큰을 검증해 유저를 반환. 위조·만료·로그아웃·비밀번호 변경·탈퇴 등으로 무효하면 null
export async function findUserByToken(token) {
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
  if (!mongoose.isValidObjectId(payload.sub) || !payload.jti) return null;
  if (await RevokedToken.exists({ jti: payload.jti })) return null;

  const user = await User.findById(payload.sub);
  if (!user || user.tokenVersion !== payload.ver) return null;
  return user;
}

export async function login(req, res, next) {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!email || !password) {
      return res.status(400).json({ message: '이메일과 비밀번호를 모두 입력해 주세요.' });
    }

    // password는 스키마에서 select: false라 명시적으로 불러와야 비교할 수 있음
    const user = await User.findOne({ email }).select('+password');
    const valid = user
      ? await user.comparePassword(password)
      : await bcrypt.compare(password, DUMMY_HASH).then(() => false);
    if (!valid) {
      return res.status(401).json({ message: INVALID_CREDENTIALS });
    }

    const token = signToken(user);
    // 로그인 상태 유지: 쿠키 만료 시각을 토큰 만료 시각(exp)과 맞춤
    // 아니면 브라우저를 닫을 때 사라지는 세션 쿠키로 발급
    const remember = req.body?.remember === true;
    const { exp } = jwt.decode(token);
    res.cookie(TOKEN_COOKIE, token, {
      ...COOKIE_OPTIONS,
      ...(remember && { expires: new Date(exp * 1000) }),
    });
    res.json({ message: '로그인되었습니다.', user });
  } catch (err) {
    next(err);
  }
}

// 현재 로그인한 유저. 비로그인이면 에러 대신 user: null로 응답해 클라이언트가 상태만 확인하도록 함
export async function getMe(req, res, next) {
  try {
    const token = req.cookies?.[TOKEN_COOKIE];
    if (!token) return res.json({ user: null });

    const user = await findUserByToken(token);
    // 무효한 토큰은 지워서 다음 요청부터 보내지 않게 함
    if (!user) res.clearCookie(TOKEN_COOKIE, COOKIE_OPTIONS);
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

// 쿠키 삭제만으로는 토큰을 복사해 둔 쪽에서 계속 쓸 수 있으므로, 토큰 자체를 만료 시각까지 차단 목록에 등록
export async function logout(req, res, next) {
  try {
    const token = req.cookies?.[TOKEN_COOKIE];
    const payload = token && jwt.decode(token);
    if (payload?.jti && payload.exp) {
      await RevokedToken.updateOne(
        { jti: payload.jti },
        { $setOnInsert: { expiresAt: new Date(payload.exp * 1000) } },
        { upsert: true }
      );
    }
    res.clearCookie(TOKEN_COOKIE, COOKIE_OPTIONS);
    res.json({ message: '로그아웃되었습니다.' });
  } catch (err) {
    next(err);
  }
}
