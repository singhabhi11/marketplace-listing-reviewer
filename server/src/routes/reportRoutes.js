import express from 'express';
import {
  getAnalytics,
  exportListingsCsv,
  exportReviewsCsv,
  getSystemHealth,
} from '../controllers/reportController.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';

const router = express.Router();

router.use(authenticate);

router.get('/analytics', getAnalytics);
router.get('/export-listings', exportListingsCsv);
router.get('/export-reviews', exportReviewsCsv);
router.get('/system', requireRole('administrator'), getSystemHealth);

export default router;
