import mongoose from 'mongoose';

const batchResultSchema = new mongoose.Schema(
  {
    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
    },
    title: String,
    status: {
      type: String,
      enum: ['pending', 'success', 'failed'],
      default: 'pending',
    },
    reviewId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Review',
    },
    error: String,
    findingsCount: {
      type: Number,
      default: 0,
    },
  },
  { _id: true }
);

const batchJobSchema = new mongoose.Schema(
  {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
      index: true,
    },
    totalRecords: {
      type: Number,
      default: 0,
    },
    processedRecords: {
      type: Number,
      default: 0,
    },
    failedRecords: {
      type: Number,
      default: 0,
    },
    results: [batchResultSchema],
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export const BatchJob = mongoose.model('BatchJob', batchJobSchema);
