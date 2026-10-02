import mongoose from 'mongoose';

// 로그아웃한 토큰의 jti 목록. 토큰이 원래 만료되는 시각(expiresAt)이 지나면 TTL 인덱스가 자동 삭제
const revokedTokenSchema = new mongoose.Schema({
  jti: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true, expires: 0 },
});

export default mongoose.model('RevokedToken', revokedTokenSchema);
