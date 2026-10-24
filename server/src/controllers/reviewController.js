import { Review } from '../models/Review.js';
import { Listing } from '../models/Listing.js';
import { Setting } from '../models/Setting.js';
import { orchestrateListingReview } from '../services/reviewOrchestrator.js';
import { logAuditEvent } from '../services/audit/auditLogger.js';

export const triggerListingReview = async (req, res, next) => {
  try {
    const listingId = req.params.id;
    const review = await orchestrateListingReview(listingId, req.user);

    return res.status(201).json({
      success: true,
      data: review,
      message: 'Listing review completed successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const getListingReviews = async (req, res, next) => {
  try {
    const listingId = req.params.id;
    const reviews = await Review.find({ listingId })
      .populate('createdBy', 'name email role')
      .populate('reviewedBy', 'name email role')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: reviews,
    });
  } catch (error) {
    next(error);
  }
};

export const getReviewById = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id)
      .populate('listingId')
      .populate('createdBy', 'name email role')
      .populate('reviewedBy', 'name email role');

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review record not found.',
      });
    }

    return res.status(200).json({
      success: true,
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

export const approveRevision = async (req, res, next) => {
  try {
    if (req.user.role === 'seller') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Sellers cannot approve review suggestions.',
      });
    }

    const { id: reviewId, findingId } = req.params;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found.' });
    }

    const finding = review.findings.id(findingId);
    if (!finding) {
      return res.status(404).json({ success: false, message: 'Finding not found on this review.' });
    }

    if (!finding.suggestedRevision) {
      return res.status(400).json({
        success: false,
        message: 'This finding does not contain a suggested replacement revision.',
      });
    }

    const listing = await Listing.findById(review.listingId);
    if (!listing) {
      return res.status(404).json({ success: false, message: 'Associated listing not found.' });
    }

    const fieldName = finding.field;
    const previousFieldValue = listing[fieldName];
    const newFieldValue = finding.suggestedRevision;

    // Apply revision to listing field
    listing[fieldName] = newFieldValue;
    listing.updatedBy = req.user._id;
    await listing.save();

    // Update finding status
    finding.status = 'approved';
    finding.reviewerDecision = {
      action: 'approved',
      appliedValue: newFieldValue,
      decidedAt: new Date(),
      decidedBy: req.user._id,
    };
    await review.save();

    // Log Audit Event
    await logAuditEvent({
      listingId: listing._id,
      reviewId: review._id,
      actorId: req.user._id,
      actorName: req.user.name,
      actorRole: req.user.role,
      action: 'REVISION_APPROVED',
      before: { field: fieldName, value: previousFieldValue },
      after: { field: fieldName, value: newFieldValue },
      metadata: { findingId: finding._id, policySectionId: finding.policySectionId },
    });

    return res.status(200).json({
      success: true,
      message: `Revision for '${fieldName}' approved and applied to listing.`,
      data: { review, listing },
    });
  } catch (error) {
    next(error);
  }
};

export const rejectRevision = async (req, res, next) => {
  try {
    if (req.user.role === 'seller') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Sellers cannot reject review suggestions.',
      });
    }

    const { id: reviewId, findingId } = req.params;
    const { reason } = req.body;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found.' });
    }

    const finding = review.findings.id(findingId);
    if (!finding) {
      return res.status(404).json({ success: false, message: 'Finding not found on this review.' });
    }

    const actionStatus = (req.path.includes('dismiss') || req.body.status === 'dismissed') ? 'dismissed' : 'rejected';
    finding.status = actionStatus;
    finding.reviewerDecision = {
      action: actionStatus,
      appliedValue: null,
      rejectionReason: reason || (actionStatus === 'dismissed' ? 'Dismissed by reviewer' : 'Rejected by human reviewer'),
      decidedAt: new Date(),
      decidedBy: req.user._id,
    };
    await review.save();

    // Log Audit Event - Listing unchanged!
    await logAuditEvent({
      listingId: review.listingId,
      reviewId: review._id,
      actorId: req.user._id,
      actorName: req.user.name,
      actorRole: req.user.role,
      action: 'REVISION_REJECTED',
      before: null,
      after: null,
      metadata: {
        findingId: finding._id,
        field: finding.field,
        rejectionReason: reason || 'Rejected by reviewer',
      },
    });

    return res.status(200).json({
      success: true,
      message: `Suggestion for '${finding.field}' rejected. Listing remains unchanged.`,
      data: { review },
    });
  } catch (error) {
    next(error);
  }
};

export const editAndApproveRevision = async (req, res, next) => {
  try {
    if (req.user.role === 'seller') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Sellers cannot edit reviewer suggestions.',
      });
    }

    const { id: reviewId, findingId } = req.params;
    const { customValue } = req.body;

    if (!customValue || typeof customValue !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'customValue string is required to apply an edited revision.',
      });
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found.' });
    }

    const finding = review.findings.id(findingId);
    if (!finding) {
      return res.status(404).json({ success: false, message: 'Finding not found.' });
    }

    const listing = await Listing.findById(review.listingId);
    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found.' });
    }

    const fieldName = finding.field;
    const previousFieldValue = listing[fieldName];

    // Apply custom edited value to listing
    listing[fieldName] = customValue;
    listing.updatedBy = req.user._id;
    await listing.save();

    finding.status = 'edited';
    finding.reviewerDecision = {
      action: 'edited',
      appliedValue: customValue,
      decidedAt: new Date(),
      decidedBy: req.user._id,
    };
    await review.save();

    await logAuditEvent({
      listingId: listing._id,
      reviewId: review._id,
      actorId: req.user._id,
      actorName: req.user.name,
      actorRole: req.user.role,
      action: 'REVISION_EDITED_AND_APPROVED',
      before: { field: fieldName, value: previousFieldValue },
      after: { field: fieldName, value: customValue },
      metadata: {
        findingId: finding._id,
        originalSuggestion: finding.suggestedRevision,
      },
    });

    return res.status(200).json({
      success: true,
      message: `Custom revision for '${fieldName}' applied to listing.`,
      data: { review, listing },
    });
  } catch (error) {
    next(error);
  }
};

export const approveAllEligibleRevisions = async (req, res, next) => {
  try {
    if (req.user.role === 'seller') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Sellers cannot approve review suggestions.',
      });
    }

    const { id: reviewId } = req.params;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found.' });
    }

    const listing = await Listing.findById(review.listingId);
    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found.' });
    }

    const beforeListingSnapshot = listing.toJSON();
    const appliedFields = [];

    // Apply all findings that have a suggested revision and are pending
    for (const finding of review.findings) {
      if (finding.status === 'pending' && finding.suggestedRevision) {
        const fieldName = finding.field;
        listing[fieldName] = finding.suggestedRevision;
        finding.status = 'approved';
        finding.reviewerDecision = {
          action: 'approved',
          appliedValue: finding.suggestedRevision,
          decidedAt: new Date(),
          decidedBy: req.user._id,
        };
        appliedFields.push(fieldName);
      }
    }

    listing.status = 'Approved';
    listing.updatedBy = req.user._id;
    await listing.save();

    review.overallStatus = 'Approved';
    review.reviewedBy = req.user._id;
    review.completedAt = new Date();
    await review.save();

    await logAuditEvent({
      listingId: listing._id,
      reviewId: review._id,
      actorId: req.user._id,
      actorName: req.user.name,
      actorRole: req.user.role,
      action: 'ALL_REVISIONS_APPROVED',
      before: beforeListingSnapshot,
      after: listing.toJSON(),
      metadata: { appliedFields, count: appliedFields.length },
    });

    return res.status(200).json({
      success: true,
      message: `All ${appliedFields.length} eligible revisions approved. Listing status updated to 'Approved'.`,
      data: { review, listing },
    });
  } catch (error) {
    next(error);
  }
};

export const updateOverallReviewStatus = async (req, res, next) => {
  try {
    if (req.user.role === 'seller') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Sellers cannot finalize review decisions.',
      });
    }

    const { id: reviewId } = req.params;
    let { status, notes } = req.body;

    const validStatuses = ['Approved', 'Rejected', 'Changes Suggested', 'Changes Requested', 'Pending Admin Approval'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${validStatuses.join(', ')}.`,
      });
    }

    if (status === 'Rejected' && (!notes || !notes.trim())) {
      return res.status(400).json({
        success: false,
        message: 'A rejection reason is mandatory when rejecting a listing.',
      });
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found.' });
    }

    const listing = await Listing.findById(review.listingId);
    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found.' });
    }

    // Repeated approval check to avoid duplicate state transitions
    if (listing.status === 'Approved' && status === 'Approved') {
      return res.status(200).json({
        success: true,
        message: 'Listing is already approved.',
        data: { review, listing },
      });
    }

    // Workflow check: If reviewer approves and platform policy requires admin sign-off
    const settings = await Setting.getEffectiveSettings();
    if (status === 'Approved' && settings.validationThresholds?.requireAdminApproval && req.user.role !== 'administrator') {
      status = 'Pending Admin Approval';
    }

    const previousReviewStatus = review.overallStatus;
    const previousListingStatus = listing.status;

    review.overallStatus = status;
    review.reviewedBy = req.user._id;
    review.reviewNotes = notes ? notes.trim() : '';
    review.completedAt = new Date();
    await review.save();

    listing.status = status;
    if (notes) {
      listing.reviewDecisionNotes = notes.trim();
      if (status === 'Rejected') {
        listing.rejectionReason = notes.trim();
      }
    }
    listing.updatedBy = req.user._id;
    await listing.save();

    await logAuditEvent({
      listingId: listing._id,
      reviewId: review._id,
      actorId: req.user._id,
      actorName: req.user.name,
      actorRole: req.user.role,
      action:
        status === 'Approved'
          ? 'REVIEW_APPROVED'
          : status === 'Rejected'
          ? 'REVIEW_REJECTED'
          : status === 'Pending Admin Approval'
          ? 'REVIEW_PENDING_ADMIN_APPROVAL'
          : 'CHANGES_REQUESTED',
      before: { reviewStatus: previousReviewStatus, listingStatus: previousListingStatus },
      after: { reviewStatus: status, listingStatus: status },
      metadata: { notes: notes || '' },
    });

    return res.status(200).json({
      success: true,
      message: `Review decision recorded as '${status}'.`,
      data: { review, listing },
    });
  } catch (error) {
    next(error);
  }
};
