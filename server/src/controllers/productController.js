import Product from '../models/Product.js';

const PRODUCT_NOT_FOUND = '상품을 찾을 수 없어요.';

// 요청 바디에서 상품 필드만 골라 저장 (_id, createdAt 등 임의 필드 주입 방지)
const WRITABLE_FIELDS = ['sku', 'name', 'price', 'category', 'image', 'description', 'stock'];

function pickWritable(body = {}) {
  return Object.fromEntries(
    Object.entries(body).filter(([key]) => WRITABLE_FIELDS.includes(key))
  );
}

export async function getProducts(req, res, next) {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    next(err);
  }
}

export async function getProduct(req, res, next) {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: PRODUCT_NOT_FOUND });
    res.json(product);
  } catch (err) {
    next(err);
  }
}

export async function createProduct(req, res, next) {
  try {
    const product = await Product.create(pickWritable(req.body));
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
}

export async function updateProduct(req, res, next) {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, pickWritable(req.body), {
      returnDocument: 'after',
      runValidators: true,
    });
    if (!product) return res.status(404).json({ message: PRODUCT_NOT_FOUND });
    res.json(product);
  } catch (err) {
    next(err);
  }
}

export async function deleteProduct(req, res, next) {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: PRODUCT_NOT_FOUND });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}
