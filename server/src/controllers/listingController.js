import { z } from 'zod';
import { Listing } from '../models/Listing.js';
import { logAuditEvent } from '../services/audit/auditLogger.js';
import { calculateListingSimilarity } from '../utils/similarity.js';
import { normalizeAttributes, validateAttributePairs } from '../utils/attributeNormalizer.js';

export const listingSchema = z.object({
  title: z
    .string({ required_error: 'Title is required' })
    .trim()
    .min(5, 'Title must be at least 5 characters')
    .max(150, 'Title cannot exceed 150 characters')
    .refine((v) => v.trim().length >= 5, { message: 'Title cannot be whitespace only' }),
  description: z
    .string({ required_error: 'Description is required' })
    .trim()
    .min(20, 'Description must be at least 20 characters')
    .max(5000, 'Description cannot exceed 5000 characters')
    .refine((v) => v.trim().length >= 20, { message: 'Description cannot be whitespace only' }),
  category: z
    .string({ required_error: 'Category is required' })
    .trim()
    .min(1, 'Category is required')
    .refine((v) => v.toLowerCase() !== 'select category', { message: 'Please select a valid category' }),
  price: z
    .number({ required_error: 'Price is required' })
    .positive('Price must be greater than 0')
    .refine((v) => isFinite(v) && !isNaN(v), { message: 'Price must be a valid number' })
    .refine((v) => Number(v.toFixed(2)) === v || (String(v).split('.')[1] || '').length <= 2, {
      message: 'Price cannot have more than 2 decimal places',
    }),
  currency: z.enum(['USD', 'INR', 'EUR', 'GBP']).default('USD'),
  attributes: z.any().optional().default([]),
  seller: z
    .string({ required_error: 'Seller reference or name is required' })
    .trim()
    .min(1, 'Seller name is required')
    .refine((v) => v.trim().length > 0, { message: 'Seller name cannot be whitespace only' }),
  tags: z.array(z.string()).optional().default([]),
  status: z
    .enum([
      'Draft',
      'Submitted',
      'Pending Review',
      'Under Review',
      'Reviewing',
      'Changes Requested',
      'Changes Suggested',
      'Pending Admin Approval',
      'Approved',
      'Rejected',
      'Failed',
    ])
    .optional()
    .default('Draft'),
  assignedTo: z.string().nullable().optional(),
});

export const updateListingSchema = listingSchema.partial();

export const getListings = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      category,
      status,
      severity,
      assignedTo,
      myAssigned,
      archived,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const query = {};

    // Archival scoping
    if (archived === 'true') {
      query.archived = true;
    } else {
      query.archived = { $ne: true };
    }

    // Role-based scoping: Seller only sees their own listings
    if (req.user.role === 'seller') {
      query.createdBy = req.user._id;
    }

    // Filter by assigned reviewer
    if (myAssigned === 'true') {
      query.assignedTo = req.user._id;
    } else if (assignedTo) {
      query.assignedTo = assignedTo;
    }

    if (category) {
      query.category = category;
    }

    if (status) {
      if (status === 'Pending Review') {
        query.status = { $in: ['Pending Review', 'Submitted'] };
      } else if (status === 'Changes Requested') {
        query.status = { $in: ['Changes Requested', 'Changes Suggested'] };
      } else {
        query.status = status;
      }
    }

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [{ title: searchRegex }, { seller: searchRegex }, { description: searchRegex }];
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [listings, totalCount] = await Promise.all([
      Listing.find(query)
        .populate('createdBy', 'name email role')
        .populate('assignedTo', 'name email role department')
        .populate('latestReviewId')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Listing.countDocuments(query),
    ]);

    // Optional severity filter post-query
    let filteredListings = listings;
    if (severity) {
      filteredListings = listings.filter((l) => {
        if (!l.latestReviewId || !Array.isArray(l.latestReviewId.findings)) return false;
        return l.latestReviewId.findings.some(
          (f) => f.severity?.toLowerCase() === severity.toLowerCase()
        );
      });
    }

    return res.status(200).json({
      success: true,
      data: filteredListings,
      pagination: {
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalCount / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getListingById = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id)
      .populate('createdBy', 'name email role')
      .populate('updatedBy', 'name email')
      .populate('assignedTo', 'name email role department')
      .populate('latestReviewId');

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found.',
      });
    }

    // Seller permissions: only own listings
    if (req.user.role === 'seller' && listing.createdBy._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You only have permission to view your own listings.',
      });
    }

    return res.status(200).json({
      success: true,
      data: listing,
    });
  } catch (error) {
    next(error);
  }
};

export const createListing = async (req, res, next) => {
  try {
    let { title, description, category, price, currency, attributes, seller, tags, status, assignedTo } =
      req.body;

    const isDraft = status === 'Draft';

    // Normalize attributes
    attributes = normalizeAttributes(attributes);

    // If seller role, enforce user association & prevent seller impersonation
    if (req.user.role === 'seller') {
      if (!seller || !seller.trim()) {
        seller = req.user.name;
      }
    }

    if (!isDraft) {
      // Validate with schema for submissions
      const parseResult = listingSchema.safeParse({
        title,
        description,
        category,
        price: Number(price),
        currency: currency || 'USD',
        attributes,
        seller,
        tags,
        status: status || 'Pending Review',
        assignedTo,
      });

      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          message: parseResult.error.errors.map((e) => e.message).join(', '),
          errors: parseResult.error.errors,
        });
      }

      // Check attributes completeness
      const { findings: attrFindings } = validateAttributePairs(attributes);
      if (attrFindings.length > 0) {
        return res.status(400).json({
          success: false,
          message: attrFindings.map((f) => f.description).join(', '),
          errors: attrFindings,
        });
      }
    } else {
      // Basic type enforcement for drafts
      if (price !== undefined && price !== null && price !== '') {
        const numPrice = Number(price);
        if (isNaN(numPrice) || numPrice <= 0) {
          return res.status(400).json({
            success: false,
            message: 'Price must be greater than 0.',
          });
        }
      }
    }

    const listing = await Listing.create({
      title: title ? title.trim() : 'Untitled Draft',
      description: description ? description.trim() : '',
      category: category || 'General',
      price: price !== undefined && price !== null && price !== '' ? Number(price) : 0.01,
      currency: currency || 'USD',
      attributes: attributes || [],
      seller: seller ? seller.trim() : req.user.name,
      tags: tags || [],
      revision: 1,
      status: status || 'Draft',
      assignedTo: assignedTo || null,
      originalSnapshot: {
        title: title ? title.trim() : 'Untitled Draft',
        description: description ? description.trim() : '',
        category: category || 'General',
        price: price !== undefined && price !== null && price !== '' ? Number(price) : 0.01,
        currency: currency || 'USD',
        attributes: attributes || [],
        seller: seller ? seller.trim() : req.user.name,
        tags: tags || [],
      },
      createdBy: req.user._id,
      updatedBy: req.user._id,
    });

    await logAuditEvent({
      listingId: listing._id,
      actorId: req.user._id,
      actorName: req.user.name,
      actorRole: req.user.role,
      action: 'LISTING_CREATED',
      before: null,
      after: listing.toJSON(),
      metadata: { initialStatus: listing.status, revision: 1 },
    });

    return res.status(201).json({
      success: true,
      data: listing,
      message: isDraft ? 'Draft saved successfully.' : 'Listing submitted for quality review.',
    });
  } catch (error) {
    next(error);
  }
};

export const updateListing = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found.' });
    }

    // Role or ownership check
    const isOwner = listing.createdBy.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== 'administrator' && req.user.role !== 'reviewer') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to edit this listing.',
      });
    }

    // Seller cannot edit approved listings
    if (req.user.role === 'seller' && ['Approved'].includes(listing.status)) {
      return res.status(400).json({
        success: false,
        message: `Sellers cannot edit listings while in '${listing.status}' status.`,
      });
    }

    const beforeSnapshot = listing.toJSON();
    const updateData = { ...req.body, updatedBy: req.user._id };

    if (updateData.attributes) {
      updateData.attributes = normalizeAttributes(updateData.attributes);
    }

    if (updateData.title) updateData.title = updateData.title.trim();
    if (updateData.description) updateData.description = updateData.description.trim();
    if (updateData.price !== undefined) updateData.price = Number(updateData.price);

    // Prevent sellers from self-approving or setting status to Approved
    if (req.user.role === 'seller' && updateData.status === 'Approved') {
      updateData.status = 'Pending Review';
    }

    const updatedListing = await Listing.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    await logAuditEvent({
      listingId: listing._id,
      actorId: req.user._id,
      actorName: req.user.name,
      actorRole: req.user.role,
      action: 'LISTING_UPDATED',
      before: beforeSnapshot,
      after: updatedListing.toJSON(),
      metadata: { updatedFields: Object.keys(req.body) },
    });

    return res.status(200).json({
      success: true,
      data: updatedListing,
      message: 'Listing updated successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const deleteListing = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found.' });
    }

    const isOwner = listing.createdBy.toString() === req.user._id.toString();

    // Sellers can delete their OWN drafts!
    if (req.user.role === 'seller') {
      if (!isOwner || listing.status !== 'Draft') {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Sellers can only delete their own Draft listings.',
        });
      }
    } else if (!isOwner && req.user.role !== 'administrator') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to delete this listing.',
      });
    }

    await Listing.findByIdAndDelete(req.params.id);

    await logAuditEvent({
      listingId: listing._id,
      actorId: req.user._id,
      actorName: req.user.name,
      actorRole: req.user.role,
      action: 'LISTING_DELETED',
      before: listing.toJSON(),
      after: null,
      metadata: { deletedStatus: listing.status },
    });

    return res.status(200).json({
      success: true,
      message: 'Listing deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const assignReviewer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { assignedTo } = req.body;

    const listing = await Listing.findById(id);
    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found.' });
    }

    const previousAssignee = listing.assignedTo;
    listing.assignedTo = assignedTo || null;
    listing.updatedBy = req.user._id;
    await listing.save();

    await logAuditEvent({
      listingId: listing._id,
      actorId: req.user._id,
      actorName: req.user.name,
      actorRole: req.user.role,
      action: 'LISTING_ASSIGNED',
      before: { assignedTo: previousAssignee },
      after: { assignedTo: listing.assignedTo },
      metadata: { assignedBy: req.user.name },
    });

    const populated = await Listing.findById(id).populate('assignedTo', 'name email role');

    return res.status(200).json({
      success: true,
      message: 'Review task assigned successfully.',
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

export const requestChanges = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason, fields } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'A mandatory reason is required when requesting changes.',
      });
    }

    const listing = await Listing.findById(id);
    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found.' });
    }

    const previousStatus = listing.status;
    listing.status = 'Changes Requested';
    listing.reviewDecisionNotes = reason.trim();
    listing.changeRequestReason = reason.trim();
    listing.changeRequestFields = Array.isArray(fields) ? fields : [];
    listing.updatedBy = req.user._id;
    await listing.save();

    await logAuditEvent({
      listingId: listing._id,
      actorId: req.user._id,
      actorName: req.user.name,
      actorRole: req.user.role,
      action: 'CHANGES_REQUESTED',
      before: { status: previousStatus },
      after: {
        status: 'Changes Requested',
        reason: reason.trim(),
        fields: listing.changeRequestFields,
      },
      metadata: {
        reason: reason.trim(),
        fields: listing.changeRequestFields,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Changes requested from seller/creator.',
      data: listing,
    });
  } catch (error) {
    next(error);
  }
};

export const duplicateListing = async (req, res, next) => {
  try {
    const { id } = req.params;
    const source = await Listing.findById(id);
    if (!source) {
      return res.status(404).json({ success: false, message: 'Source listing not found.' });
    }

    const newTitle = `${source.title} (Copy)`;

    // Check duplicate similarity
    const similarity = calculateListingSimilarity(
      newTitle,
      source.description,
      source.title,
      source.description
    );

    const clone = await Listing.create({
      title: newTitle,
      description: source.description,
      category: source.category,
      price: source.price,
      currency: source.currency,
      attributes: source.attributes,
      seller: source.seller,
      tags: source.tags,
      status: 'Draft',
      duplicateOf: source._id,
      createdBy: req.user._id,
      updatedBy: req.user._id,
      originalSnapshot: {
        title: newTitle,
        description: source.description,
        category: source.category,
        price: source.price,
        currency: source.currency,
        seller: source.seller,
        tags: source.tags,
      },
    });

    await logAuditEvent({
      listingId: clone._id,
      actorId: req.user._id,
      actorName: req.user.name,
      actorRole: req.user.role,
      action: 'LISTING_DUPLICATED',
      before: { originalListingId: source._id },
      after: { clonedListingId: clone._id, similarityScore: similarity },
      metadata: { similarityScore: similarity },
    });

    return res.status(201).json({
      success: true,
      message: 'Listing duplicated as Draft.',
      data: clone,
    });
  } catch (error) {
    next(error);
  }
};

export const toggleArchive = async (req, res, next) => {
  try {
    const { id } = req.params;
    const listing = await Listing.findById(id);
    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found.' });
    }

    const isArchived = !listing.archived;
    listing.archived = isArchived;
    listing.updatedBy = req.user._id;
    await listing.save();

    await logAuditEvent({
      listingId: listing._id,
      actorId: req.user._id,
      actorName: req.user.name,
      actorRole: req.user.role,
      action: isArchived ? 'LISTING_ARCHIVED' : 'LISTING_UNARCHIVED',
      before: { archived: !isArchived },
      after: { archived: isArchived },
      metadata: {},
    });

    return res.status(200).json({
      success: true,
      message: isArchived ? 'Listing archived.' : 'Listing restored from archive.',
      data: listing,
    });
  } catch (error) {
    next(error);
  }
};

export const resubmitListing = async (req, res, next) => {
  try {
    const { id } = req.params;
    const listing = await Listing.findById(id);
    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found.' });
    }

    const previousStatus = listing.status;
    const currentRevision = listing.revision || 1;

    // Archive current snapshot into revisionHistory
    if (!listing.revisionHistory) listing.revisionHistory = [];
    listing.revisionHistory.push({
      revision: currentRevision,
      title: listing.title,
      description: listing.description,
      category: listing.category,
      price: listing.price,
      currency: listing.currency,
      attributes: listing.attributes,
      seller: listing.seller,
      status: previousStatus,
      changeRequestReason: listing.changeRequestReason || listing.reviewDecisionNotes,
      changeRequestFields: listing.changeRequestFields || [],
      submittedAt: listing.resubmittedAt || listing.createdAt,
    });

    listing.revision = currentRevision + 1;
    listing.status = 'Pending Review';
    listing.resubmittedAt = new Date();
    listing.updatedBy = req.user._id;

    // Apply any newly provided fields on resubmission
    if (req.body.title) listing.title = String(req.body.title).trim();
    if (req.body.description) listing.description = String(req.body.description).trim();
    if (req.body.category) listing.category = String(req.body.category).trim();
    if (req.body.price !== undefined) listing.price = Number(req.body.price);
    if (req.body.currency) listing.currency = req.body.currency;
    if (req.body.attributes !== undefined) listing.attributes = req.body.attributes;

    await listing.save();

    await logAuditEvent({
      listingId: listing._id,
      actorId: req.user._id,
      actorName: req.user.name,
      actorRole: req.user.role,
      action: 'LISTING_RESUBMITTED',
      before: { status: previousStatus, revision: currentRevision },
      after: { status: 'Pending Review', revision: listing.revision },
      metadata: { revision: listing.revision },
    });

    return res.status(200).json({
      success: true,
      message: `Listing resubmitted for quality review (Revision ${listing.revision}).`,
      data: listing,
    });
  } catch (error) {
    next(error);
  }
};
