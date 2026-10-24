import { z } from 'zod';
import { Listing } from '../models/Listing.js';
import { logAuditEvent } from '../services/audit/auditLogger.js';
import { calculateListingSimilarity } from '../utils/similarity.js';

export const listingSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().min(1, 'Description is required'),
  category: z.string().min(1, 'Category is required'),
  price: z.number().positive('Price must be greater than 0'),
  currency: z.string().default('USD'),
  attributes: z.record(z.string(), z.any()).optional().default({}),
  seller: z.string().min(1, 'Seller name is required'),
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
    const { title, description, category, price, currency, attributes, seller, tags, status, assignedTo } =
      req.body;

    const listing = await Listing.create({
      title,
      description,
      category,
      price,
      currency: currency || 'USD',
      attributes: attributes || {},
      seller,
      tags: tags || [],
      status: status || 'Draft',
      assignedTo: assignedTo || null,
      originalSnapshot: {
        title,
        description,
        category,
        price,
        currency: currency || 'USD',
        attributes: attributes || {},
        seller,
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
      metadata: { initialStatus: listing.status },
    });

    return res.status(201).json({
      success: true,
      data: listing,
      message: 'Listing created successfully.',
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

    // Seller cannot edit approved or under-review listings unless status is Draft or Changes Requested
    if (req.user.role === 'seller' && !['Draft', 'Changes Requested', 'Changes Suggested'].includes(listing.status)) {
      return res.status(400).json({
        success: false,
        message: `Sellers cannot edit listings while in '${listing.status}' status.`,
      });
    }

    const beforeSnapshot = listing.toJSON();
    const updateData = { ...req.body, updatedBy: req.user._id };

    // Prevent sellers from self-approving or directly setting status to Approved
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

    // Sellers cannot delete listings
    if (req.user.role === 'seller') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Sellers cannot delete listings.',
      });
    }

    // Only creator or administrator can delete
    if (listing.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'administrator') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to delete this listing.',
      });
    }

    const beforeSnapshot = listing.toJSON();
    await Listing.findByIdAndDelete(req.params.id);

    await logAuditEvent({
      listingId: listing._id,
      actorId: req.user._id,
      actorName: req.user.name,
      actorRole: req.user.role,
      action: 'LISTING_DELETED',
      before: beforeSnapshot,
      after: null,
      metadata: { deletedByRole: req.user.role },
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
    const { reason } = req.body;

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
    listing.updatedBy = req.user._id;
    await listing.save();

    await logAuditEvent({
      listingId: listing._id,
      actorId: req.user._id,
      actorName: req.user.name,
      actorRole: req.user.role,
      action: 'CHANGES_REQUESTED',
      before: { status: previousStatus },
      after: { status: 'Changes Requested', reason: reason.trim() },
      metadata: { reason: reason.trim() },
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
    listing.status = 'Pending Review';
    listing.resubmittedAt = new Date();
    listing.updatedBy = req.user._id;
    await listing.save();

    await logAuditEvent({
      listingId: listing._id,
      actorId: req.user._id,
      actorName: req.user.name,
      actorRole: req.user.role,
      action: 'LISTING_RESUBMITTED',
      before: { status: previousStatus },
      after: { status: 'Pending Review' },
      metadata: {},
    });

    return res.status(200).json({
      success: true,
      message: 'Listing resubmitted for quality review.',
      data: listing,
    });
  } catch (error) {
    next(error);
  }
};
