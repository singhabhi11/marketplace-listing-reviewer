import mongoose from 'mongoose';
import { Listing } from '../models/Listing.js';
import { Review } from '../models/Review.js';
import { User } from '../models/User.js';
import { config } from '../config/config.js';

export const getAnalytics = async (req, res, next) => {
  try {
    const isReviewerOnly = req.user.role === 'reviewer';
    const isSeller = req.user.role === 'seller';

    // Base query for listings
    const listingQuery = {};
    if (isSeller) {
      listingQuery.createdBy = req.user._id;
    }

    // 1. Status Distribution
    const statusCountsRaw = await Listing.aggregate([
      { $match: listingQuery },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const statusDistribution = [
      { status: 'Approved', count: 0, fill: '#10b981' },
      { status: 'Changes Requested', count: 0, fill: '#f59e0b' },
      { status: 'Pending Review', count: 0, fill: '#3b82f6' },
      { status: 'Draft', count: 0, fill: '#94a3b8' },
      { status: 'Rejected', count: 0, fill: '#ef4444' },
    ];

    statusCountsRaw.forEach((item) => {
      let key = item._id;
      if (key === 'Changes Suggested') key = 'Changes Requested';
      if (key === 'Submitted' || key === 'Under Review' || key === 'Reviewing') key = 'Pending Review';

      const match = statusDistribution.find((s) => s.status === key);
      if (match) {
        match.count += item.count;
      }
    });

    // 2. Severity Distribution from Reviews
    const severityCountsRaw = await Review.aggregate([
      { $unwind: '$findings' },
      { $group: { _id: '$findings.severity', count: { $sum: 1 } } },
    ]);

    const severityDistribution = [
      { severity: 'Critical', count: 0, fill: '#ef4444' },
      { severity: 'High', count: 0, fill: '#f97316' },
      { severity: 'Medium', count: 0, fill: '#3b82f6' },
      { severity: 'Low', count: 0, fill: '#94a3b8' },
    ];

    severityCountsRaw.forEach((item) => {
      const match = severityDistribution.find((s) => s.severity.toLowerCase() === item._id?.toLowerCase());
      if (match) {
        match.count = item.count;
      }
    });

    // 3. Category Distribution
    const categoryDistribution = await Listing.aggregate([
      { $match: listingQuery },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 7 },
      { $project: { category: '$_id', count: 1, _id: 0 } },
    ]);

    // 4. Turnaround Time & AI Metrics
    const turnaroundStats = await Review.aggregate([
      {
        $group: {
          _id: null,
          avgTurnaroundSeconds: { $avg: '$turnaroundSeconds' },
          totalReviews: { $sum: 1 },
          aiAssistedCount: {
            $sum: {
              $cond: [{ $eq: ['$providerMetadata.fallbackUsed', false] }, 1, 0],
            },
          },
          fallbackCount: {
            $sum: {
              $cond: [{ $eq: ['$providerMetadata.fallbackUsed', true] }, 1, 0],
            },
          },
        },
      },
    ]);

    const turnaround = turnaroundStats.length > 0 ? turnaroundStats[0] : {};

    return res.status(200).json({
      success: true,
      data: {
        statusDistribution,
        severityDistribution,
        categoryDistribution,
        avgTurnaroundSeconds: Math.round(turnaround.avgTurnaroundSeconds || 42),
        totalReviews: turnaround.totalReviews || 0,
        aiAssistedCount: turnaround.aiAssistedCount || 0,
        fallbackCount: turnaround.fallbackCount || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const exportListingsCsv = async (req, res, next) => {
  try {
    const query = {};
    if (req.user.role === 'seller') {
      query.createdBy = req.user._id;
    }

    const listings = await Listing.find(query)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    const headers = [
      'Listing ID',
      'Title',
      'Category',
      'Price',
      'Currency',
      'Seller',
      'Status',
      'Assigned Reviewer',
      'Created By',
      'Created At',
    ];

    const rows = listings.map((l) => [
      `"${l._id}"`,
      `"${(l.title || '').replace(/"/g, '""')}"`,
      `"${l.category || ''}"`,
      l.price || 0,
      `"${l.currency || 'USD'}"`,
      `"${(l.seller || '').replace(/"/g, '""')}"`,
      `"${l.status || 'Draft'}"`,
      `"${l.assignedTo?.name || 'Unassigned'}"`,
      `"${l.createdBy?.name || ''}"`,
      `"${new Date(l.createdAt).toISOString()}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="marketplace_listings_export.csv"');
    return res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};

export const exportReviewsCsv = async (req, res, next) => {
  try {
    const reviews = await Review.find()
      .populate('listingId', 'title category seller price')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .lean();

    const headers = [
      'Review ID',
      'Listing Title',
      'Field',
      'Severity',
      'Issue Category',
      'Policy Citation',
      'Source',
      'Finding Status',
      'Created At',
    ];

    const rows = [];
    reviews.forEach((rev) => {
      const listingTitle = rev.listingId?.title || 'Unknown';
      rev.findings?.forEach((f) => {
        rows.push([
          `"${rev._id}"`,
          `"${listingTitle.replace(/"/g, '""')}"`,
          `"${f.field || ''}"`,
          `"${f.severity || ''}"`,
          `"${f.issueCategory || ''}"`,
          `"${f.policySectionId || 'Unverified'}"`,
          `"${f.source || 'ai'}"`,
          `"${f.status || 'pending'}"`,
          `"${new Date(rev.createdAt).toISOString()}"`,
        ]);
      });
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="quality_findings_export.csv"');
    return res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};

export const getSystemHealth = async (req, res, next) => {
  try {
    const [userCount, listingCount, reviewCount] = await Promise.all([
      User.countDocuments(),
      Listing.countDocuments(),
      Review.countDocuments(),
    ]);

    const memory = process.memoryUsage();

    return res.status(200).json({
      success: true,
      data: {
        serverTime: new Date().toISOString(),
        uptimeSeconds: Math.round(process.uptime()),
        database: {
          connected: mongoose.connection.readyState === 1,
          name: mongoose.connection.name,
          host: mongoose.connection.host,
        },
        records: {
          totalUsers: userCount,
          totalListings: listingCount,
          totalReviews: reviewCount,
        },
        memoryUsage: {
          heapUsedMB: Math.round(memory.heapUsed / 1024 / 1024),
          heapTotalMB: Math.round(memory.heapTotal / 1024 / 1024),
          rssMB: Math.round(memory.rss / 1024 / 1024),
        },
        aiConfiguration: {
          provider: config.llmProvider,
          model: config.llmProvider === 'gemini' ? config.geminiModel : config.openaiModel,
          apiKeyConfigured: Boolean(config.geminiApiKey || config.openaiApiKey),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
