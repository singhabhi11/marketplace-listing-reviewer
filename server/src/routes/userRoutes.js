import express from 'express';
import {
  getUsers,
  createUser,
  updateUserRole,
  updateUserStatus,
  getReviewers,
} from '../controllers/userController.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';

const router = express.Router();

router.use(authenticate);

// Publicly available to authenticated users to populate reviewer assignment selectors
router.get('/reviewers', getReviewers);

// Admin-only user management
router.get('/', requireRole('administrator'), getUsers);
router.post('/', requireRole('administrator'), createUser);
router.patch('/:id/role', requireRole('administrator'), updateUserRole);
router.patch('/:id/status', requireRole('administrator'), updateUserStatus);

export default router;
