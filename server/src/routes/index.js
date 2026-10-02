import { Router } from 'express';
import productRoutes from './productRoutes.js';
import userRoutes from './userRoutes.js';
import authRoutes from './authRoutes.js';
import adminRoutes from './adminRoutes.js';
import uploadRoutes from './uploadRoutes.js';
import cartRoutes from './cartRoutes.js';
import orderRoutes from './orderRoutes.js';

const router = Router();

router.get('/health', (req, res) => res.json({ status: 'ok' }));
router.use('/products', productRoutes);
router.use('/users', userRoutes);
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/uploads', uploadRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);

export default router;
