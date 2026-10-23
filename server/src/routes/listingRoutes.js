import express from 'express';
import {
  getListings,
  getListingById,
  createListing,
  updateListing,
  deleteListing,
  listingSchema,
  updateListingSchema,
} from '../controllers/listingController.js';
import { triggerListingReview, getListingReviews } from '../controllers/reviewController.js';
import { getListingAuditHistory } from '../controllers/auditController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getListings);
router.post('/', validate(listingSchema), createListing);
router.get('/:id', getListingById);
router.patch('/:id', validate(updateListingSchema), updateListing);
router.delete('/:id', deleteListing);

// Nested reviews and audit for listings
router.post('/:id/reviews', triggerListingReview);
router.get('/:id/reviews', getListingReviews);
router.get('/:id/audit', getListingAuditHistory);

export default router;
