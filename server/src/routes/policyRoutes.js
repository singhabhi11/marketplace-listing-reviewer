import express from 'express';
import {
  getPolicies,
  getPolicyById,
  createPolicy,
  updatePolicy,
  addPolicySection,
  updatePolicySection,
  getSettings,
  updateSettings,
  createPolicyDocSchema,
  createSectionSchema,
} from '../controllers/policyController.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

router.use(authenticate);

// Settings
router.get('/settings', getSettings);
router.patch('/settings', requireRole('administrator'), updateSettings);

// Policies
router.get('/', getPolicies);
router.post('/', requireRole('administrator'), validate(createPolicyDocSchema), createPolicy);
router.get('/:id', getPolicyById);
router.patch('/:id', requireRole('administrator'), updatePolicy);

// Policy Sections
router.post('/:id/sections', requireRole('administrator'), validate(createSectionSchema), addPolicySection);
router.patch('/sections/:sectionId', requireRole('administrator'), updatePolicySection);

export default router;
