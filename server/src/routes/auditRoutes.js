import express from 'express';
import { getGlobalAuditTrail, getDashboardStats } from '../controllers/auditController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getGlobalAuditTrail);
router.get('/dashboard/stats', getDashboardStats);

export default router;
