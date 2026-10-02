import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;
export const USER_TYPES = ['customer', 'admin', 'seller'];
// bcrypt는 72바이트 이후를 무시하므로, 그보다 긴 비밀번호는 아예 받지 않음
export const PASSWORD_MAX_BYTES = 72;

// 같은 글자라도 입력 환경(macOS 등)에 따라 NFC/NFD로 달리 들어오므로 NFC로 통일
export const normalizePassword = (password) => password.normalize('NFC');
const passwordBytes = (password) => Buffer.byteLength(normalizePassword(password), 'utf8');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    },
    username: { type: String, required: true, trim: true },
    password: {
      type: String,
      required: true,
      select: false,
      validate: {
        // 해시되기 전(평문)일 때만 검사. 해시는 60바이트라 항상 통과
        validator: (value) => passwordBytes(value) <= PASSWORD_MAX_BYTES,
        message: `비밀번호가 너무 길어요. (최대 ${PASSWORD_MAX_BYTES}바이트)`,
      },
    },
    user_type: {
      type: String,
      required: true,
      enum: USER_TYPES,
      default: 'customer',
    },
    address: { type: String, trim: true },
    // 비밀번호가 바뀌면 1 증가 → 이전에 발급된 토큰(ver가 다른 토큰)은 모두 무효
    tokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// 저장 전 비밀번호가 변경된 경우에만 해시
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(normalizePassword(this.password), SALT_ROUNDS);
  if (!this.isNew) this.tokenVersion += 1;
});

userSchema.methods.comparePassword = function (plainPassword) {
  if (passwordBytes(plainPassword) > PASSWORD_MAX_BYTES) return Promise.resolve(false);
  return bcrypt.compare(normalizePassword(plainPassword), this.password);
};

// 응답 JSON에서 비밀번호와 내부용 토큰 버전 제거
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.tokenVersion;
    return ret;
  },
});

export default mongoose.model('User', userSchema);
