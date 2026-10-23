import { z } from 'zod';
import { Listing } from '../models/Listing.js';
import { logAuditEvent } from '../services/audit/auditLogger.js';

export const listingSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().min(1, 'Description is required'),
  category: z.string().min(1, 'Category is required'),
  price: z.number().positive('Price must be greater than 0'),
  currency: z.string().default('USD'),
  attributes: z.record(z.string(), z.any()).optional().default({}),
  seller: z.string().min(1, 'Seller name is required'),
  tags: z.array(z.string()).optional().default([]),
  status: z.enum(['Draft', 'Pending Review', 'Reviewing', 'Changes Suggested', 'Approved', 'Rejected', 'Failed']).optional().default('Draft'),
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
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const query = {};

    if (category) {
      query.category = category;
    }

    if (status) {
      query.status = status;
    }

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { title: searchRegex },
        { seller: searchRegex },
        { description: searchRegex },
      ];
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [listings, totalCount] = await Promise.all([
      Listing.find(query)
        .populate('createdBy', 'name email role')
        .populate('latestReviewId')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Listing.countDocuments(query),
    ]);

    // Optional severity filter post-query if severity is requested
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
      .populate('latestReviewId');

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found.',
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
    const { title, description, category, price, currency, attributes, seller, tags, status } = req.body;

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
    if (listing.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'administrator') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to edit this listing.',
      });
    }

    const beforeSnapshot = listing.toJSON();
    const updateData = { ...req.body, updatedBy: req.user._id };

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
