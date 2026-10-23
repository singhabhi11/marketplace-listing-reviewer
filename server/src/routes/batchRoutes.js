import express from 'express';
import multer from 'multer';
import {
  createBatchReview,
  parseCsvListingData,
  importCsvAndReview,
  getBatches,
  getBatchById,
  retryFailedBatchRecords,
} from '../controllers/batchController.js';
import { authenticate } from '../middleware/auth.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
});

const router = express.Router();

router.use(authenticate);

router.post('/', createBatchReview);
router.post('/upload', upload.single('file'), parseCsvListingData);
router.post('/import', importCsvAndReview);
router.get('/', getBatches);
router.get('/:id', getBatchById);
router.post('/:id/retry', retryFailedBatchRecords);

export default router;
