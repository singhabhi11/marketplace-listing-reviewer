import express from 'express';
import {
  getListings,
  getListingById,
  createListing,
  updateListing,
  deleteListing,
  assignReviewer,
  requestChanges,
  duplicateListing,
  toggleArchive,
  resubmitListing,
  listingSchema,
  updateListingSchema,
} from '../controllers/listingController.js';
import { triggerListingReview, getListingReviews } from '../controllers/reviewController.js';
import { getListingAuditHistory } from '../controllers/auditController.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getListings);
router.post('/', validate(listingSchema), createListing);
router.get('/:id', getListingById);
router.patch('/:id', validate(updateListingSchema), updateListing);
router.delete('/:id', deleteListing);

// Actions
router.patch('/:id/assign', requireRole('administrator', 'reviewer'), assignReviewer);
router.post('/:id/request-changes', requireRole('administrator', 'reviewer'), requestChanges);
router.post('/:id/duplicate', duplicateListing);
router.patch('/:id/archive', toggleArchive);
router.patch('/:id/resubmit', resubmitListing);
router.post('/:id/resubmit', resubmitListing);

// Nested reviews and audit for listings
router.post('/:id/reviews', requireRole('administrator', 'reviewer'), triggerListingReview);
router.get('/:id/reviews', getListingReviews);
router.get('/:id/audit', getListingAuditHistory);

export default router;
