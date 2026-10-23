import { BatchJob } from '../models/BatchJob.js';
import { Listing } from '../models/Listing.js';
import { orchestrateListingReview } from '../services/reviewOrchestrator.js';
import { config } from '../config/config.js';
import { Readable } from 'stream';
import csvParser from 'csv-parser';

export const createBatchReview = async (req, res, next) => {
  try {
    const { listingIds } = req.body;

    if (!Array.isArray(listingIds) || listingIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'listingIds array is required and must not be empty.',
      });
    }

    if (listingIds.length > config.maxBatchSize) {
      return res.status(400).json({
        success: false,
        message: `Batch size (${listingIds.length}) exceeds maximum limit of ${config.maxBatchSize} items.`,
      });
    }

    const listings = await Listing.find({ _id: { $in: listingIds } });
    if (listings.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No valid listings found matching the provided IDs.',
      });
    }

    const initialResults = listings.map((l) => ({
      listingId: l._id,
      title: l.title,
      status: 'pending',
      findingsCount: 0,
      error: null,
    }));

    const batchJob = await BatchJob.create({
      createdBy: req.user._id,
      status: 'processing',
      totalRecords: listings.length,
      processedRecords: 0,
      failedRecords: 0,
      results: initialResults,
    });

    // Execute review loop
    let processed = 0;
    let failed = 0;

    for (const item of batchJob.results) {
      try {
        const review = await orchestrateListingReview(item.listingId, req.user);
        item.status = 'success';
        item.reviewId = review._id;
        item.findingsCount = review.findings.length;
        processed++;
      } catch (err) {
        item.status = 'failed';
        item.error = err.message;
        failed++;
      }
      batchJob.processedRecords = processed;
      batchJob.failedRecords = failed;
      await batchJob.save();
    }

    batchJob.status = failed === batchJob.totalRecords ? 'failed' : 'completed';
    batchJob.completedAt = new Date();
    await batchJob.save();

    return res.status(201).json({
      success: true,
      data: batchJob,
      message: `Batch review completed. ${processed} succeeded, ${failed} failed.`,
    });
  } catch (error) {
    next(error);
  }
};

export const parseCsvListingData = async (req, res, next) => {
  try {
    if (!req.file && !req.body.csvContent) {
      return res.status(400).json({
        success: false,
        message: 'CSV file or csvContent string is required.',
      });
    }

    const csvData = req.file ? req.file.buffer.toString('utf-8') : req.body.csvContent;
    const rows = [];
    const errors = [];

    const stream = Readable.from(csvData);

    await new Promise((resolve, reject) => {
      stream
        .pipe(csvParser())
        .on('data', (data) => rows.push(data))
        .on('end', resolve)
        .on('error', reject);
    });

    if (rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'CSV file is empty or formatted incorrectly.',
      });
    }

    if (rows.length > config.maxBatchSize) {
      return res.status(400).json({
        success: false,
        message: `CSV contains ${rows.length} rows, which exceeds the max batch limit of ${config.maxBatchSize}.`,
      });
    }

    // Validate columns
    const validatedRows = rows.map((row, index) => {
      const rowNum = index + 1;
      const rowErrors = [];

      const title = (row.title || row.Title || '').trim();
      const description = (row.description || row.Description || '').trim();
      const category = (row.category || row.Category || '').trim();
      const priceRaw = row.price || row.Price;
      const seller = (row.seller || row.Seller || '').trim();
      const currency = (row.currency || row.Currency || 'USD').trim().toUpperCase();
      const tagsRaw = row.tags || row.Tags || '';

      if (!title) rowErrors.push('Missing required column: title');
      if (!description) rowErrors.push('Missing required column: description');
      if (!category) rowErrors.push('Missing required column: category');
      if (!priceRaw || isNaN(Number(priceRaw)) || Number(priceRaw) <= 0) {
        rowErrors.push('Price must be a positive numeric value');
      }
      if (!seller) rowErrors.push('Missing required column: seller');

      const tags = typeof tagsRaw === 'string'
        ? tagsRaw.split(';').map((t) => t.trim()).filter(Boolean)
        : [];

      return {
        rowNumber: rowNum,
        valid: rowErrors.length === 0,
        errors: rowErrors,
        data: {
          title,
          description,
          category,
          price: Number(priceRaw) || 0,
          currency,
          seller,
          tags,
          attributes: {},
        },
      };
    });

    const validCount = validatedRows.filter((r) => r.valid).length;
    const invalidCount = validatedRows.length - validCount;

    return res.status(200).json({
      success: true,
      summary: {
        totalRows: validatedRows.length,
        validCount,
        invalidCount,
      },
      preview: validatedRows,
    });
  } catch (error) {
    next(error);
  }
};

export const importCsvAndReview = async (req, res, next) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'items array is required.',
      });
    }

    if (items.length > config.maxBatchSize) {
      return res.status(400).json({
        success: false,
        message: `Batch exceeds limit of ${config.maxBatchSize} items.`,
      });
    }

    // Create listings
    const createdListings = [];
    for (const item of items) {
      const listing = await Listing.create({
        title: item.title,
        description: item.description,
        category: item.category,
        price: item.price,
        currency: item.currency || 'USD',
        attributes: item.attributes || {},
        seller: item.seller,
        tags: item.tags || [],
        status: 'Pending Review',
        originalSnapshot: {
          title: item.title,
          description: item.description,
          category: item.category,
          price: item.price,
          currency: item.currency || 'USD',
          seller: item.seller,
          tags: item.tags || [],
        },
        createdBy: req.user._id,
      });
      createdListings.push(listing);
    }

    // Initiate batch job
    const initialResults = createdListings.map((l) => ({
      listingId: l._id,
      title: l.title,
      status: 'pending',
      findingsCount: 0,
      error: null,
    }));

    const batchJob = await BatchJob.create({
      createdBy: req.user._id,
      status: 'processing',
      totalRecords: createdListings.length,
      processedRecords: 0,
      failedRecords: 0,
      results: initialResults,
    });

    let processed = 0;
    let failed = 0;

    for (const item of batchJob.results) {
      try {
        const review = await orchestrateListingReview(item.listingId, req.user);
        item.status = 'success';
        item.reviewId = review._id;
        item.findingsCount = review.findings.length;
        processed++;
      } catch (err) {
        item.status = 'failed';
        item.error = err.message;
        failed++;
      }
      batchJob.processedRecords = processed;
      batchJob.failedRecords = failed;
      await batchJob.save();
    }

    batchJob.status = failed === batchJob.totalRecords ? 'failed' : 'completed';
    batchJob.completedAt = new Date();
    await batchJob.save();

    return res.status(201).json({
      success: true,
      data: batchJob,
      message: `Imported and reviewed ${processed} listings (${failed} failed).`,
    });
  } catch (error) {
    next(error);
  }
};

export const getBatches = async (req, res, next) => {
  try {
    const batches = await BatchJob.find()
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(30);

    return res.status(200).json({
      success: true,
      data: batches,
    });
  } catch (error) {
    next(error);
  }
};

export const getBatchById = async (req, res, next) => {
  try {
    const batch = await BatchJob.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('results.listingId')
      .populate('results.reviewId');

    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch job not found.' });
    }

    return res.status(200).json({
      success: true,
      data: batch,
    });
  } catch (error) {
    next(error);
  }
};

export const retryFailedBatchRecords = async (req, res, next) => {
  try {
    const batch = await BatchJob.findById(req.params.id);
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch job not found.' });
    }

    const failedItems = batch.results.filter((r) => r.status === 'failed');
    if (failedItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No failed records found to retry.',
      });
    }

    batch.status = 'processing';
    await batch.save();

    let retrySuccess = 0;
    for (const item of failedItems) {
      try {
        const review = await orchestrateListingReview(item.listingId, req.user);
        item.status = 'success';
        item.reviewId = review._id;
        item.findingsCount = review.findings.length;
        item.error = null;
        retrySuccess++;
      } catch (err) {
        item.error = err.message;
      }
    }

    const stillFailed = batch.results.filter((r) => r.status === 'failed').length;
    batch.processedRecords = batch.results.filter((r) => r.status === 'success').length;
    batch.failedRecords = stillFailed;
    batch.status = stillFailed === 0 ? 'completed' : 'completed';
    await batch.save();

    return res.status(200).json({
      success: true,
      data: batch,
      message: `Retried ${failedItems.length} records: ${retrySuccess} resolved successfully.`,
    });
  } catch (error) {
    next(error);
  }
};
