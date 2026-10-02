import User from '../models/User.js';

// 회원가입은 누구나 호출하므로 user_type을 받지 않음 → 항상 스키마 기본값(customer)으로 가입
const SIGNUP_FIELDS = ['email', 'username', 'password', 'address'];
// 관리자가 회원을 수정할 때만 user_type 변경 허용
const WRITABLE_FIELDS = [...SIGNUP_FIELDS, 'user_type'];

function pickFields(body = {}, fields) {
  return Object.fromEntries(
    Object.entries(body).filter(([key]) => fields.includes(key))
  );
}

export async function getUsers(req, res, next) {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    next(err);
  }
}

export async function getUser(req, res, next) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    next(err);
  }
}

export async function createUser(req, res, next) {
  try {
    const user = await User.create(pickFields(req.body, SIGNUP_FIELDS));
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
}

// findByIdAndUpdate는 pre('save') 훅을 거치지 않아 비밀번호가 해시되지 않으므로 save()로 갱신
export async function updateUser(req, res, next) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.set(pickFields(req.body, WRITABLE_FIELDS));
    await user.save();
    res.json(user);
  } catch (err) {
    next(err);
  }
}

export async function deleteUser(req, res, next) {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}
