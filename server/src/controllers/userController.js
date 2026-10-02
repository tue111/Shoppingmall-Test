import User from '../models/User.js';

const WRITABLE_FIELDS = ['email', 'username', 'password', 'user_type', 'address'];

function pickWritable(body = {}) {
  return Object.fromEntries(
    Object.entries(body).filter(([key]) => WRITABLE_FIELDS.includes(key))
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
    const user = await User.create(pickWritable(req.body));
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
    user.set(pickWritable(req.body));
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
