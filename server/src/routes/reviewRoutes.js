import express from 'express';
import {
  getReviewById,
  approveRevision,
  rejectRevision,
  editAndApproveRevision,
  approveAllEligibleRevisions,
  updateOverallReviewStatus,
} from '../controllers/reviewController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/:id', getReviewById);
router.post('/:id/approve', updateOverallReviewStatus);
router.post('/:id/reject', updateOverallReviewStatus);
router.post('/:id/approve-all', approveAllEligibleRevisions);

router.post('/:id/revisions/:findingId/approve', approveRevision);
router.post('/:id/revisions/:findingId/reject', rejectRevision);
router.patch('/:id/revisions/:findingId', editAndApproveRevision);

export default router;
