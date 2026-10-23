import { AuditEvent } from '../models/AuditEvent.js';
import { Listing } from '../models/Listing.js';
import { Review } from '../models/Review.js';

export const getListingAuditHistory = async (req, res, next) => {
  try {
    const listingId = req.params.id;
    const events = await AuditEvent.find({ listingId })
      .sort({ timestamp: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: events,
    });
  } catch (error) {
    next(error);
  }
};

export const getGlobalAuditTrail = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, action } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const query = {};
    if (action) {
      query.action = action;
    }

    const [events, total] = await Promise.all([
      AuditEvent.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('listingId', 'title seller category status')
        .lean(),
      AuditEvent.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: events,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getDashboardStats = async (req, res, next) => {
  try {
    const [
      totalListings,
      pendingReviews,
      approvedListings,
      rejectedListings,
      changesSuggestedListings,
      recentReviews,
      recentAuditEvents,
    ] = await Promise.all([
      Listing.countDocuments(),
      Listing.countDocuments({ status: { $in: ['Pending Review', 'Reviewing', 'Draft'] } }),
      Listing.countDocuments({ status: 'Approved' }),
      Listing.countDocuments({ status: 'Rejected' }),
      Listing.countDocuments({ status: 'Changes Suggested' }),
      Review.find()
        .populate('listingId', 'title category seller price currency status')
        .populate('createdBy', 'name')
        .sort({ createdAt: -1 })
        .limit(6)
        .lean(),
      AuditEvent.find()
        .sort({ timestamp: -1 })
        .limit(8)
        .lean(),
    ]);

    // Count listings with critical or high severity issues
    const highRiskReviews = await Review.aggregate([
      {
        $match: {
          'findings.severity': { $in: ['Critical', 'High'] },
        },
      },
      {
        $group: {
          _id: '$listingId',
        },
      },
      {
        $count: 'count',
      },
    ]);

    const criticalHighCount = highRiskReviews.length > 0 ? highRiskReviews[0].count : 0;

    return res.status(200).json({
      success: true,
      data: {
        totalListings,
        pendingReviews,
        approvedListings,
        rejectedListings,
        changesSuggestedListings,
        criticalOrHighIssues: criticalHighCount,
        recentReviews,
        recentAuditEvents,
      },
    });
  } catch (error) {
    next(error);
  }
};
