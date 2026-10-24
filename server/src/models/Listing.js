import mongoose from 'mongoose';
import { normalizeAttributes } from '../utils/attributeNormalizer.js';

const listingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      index: true,
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0.01, 'Price must be a positive number greater than 0'],
    },
    currency: {
      type: String,
      required: [true, 'Currency is required'],
      enum: ['USD', 'INR', 'EUR', 'GBP'],
      default: 'USD',
      uppercase: true,
      trim: true,
    },
    attributes: {
      type: mongoose.Schema.Types.Mixed,
      default: [],
    },
    seller: {
      type: String,
      required: [true, 'Seller reference or name is required'],
      trim: true,
      index: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    revision: {
      type: Number,
      default: 1,
      min: 1,
    },
    revisionHistory: [
      {
        revision: Number,
        title: String,
        description: String,
        category: String,
        price: Number,
        currency: String,
        attributes: mongoose.Schema.Types.Mixed,
        seller: String,
        status: String,
        changeRequestReason: String,
        changeRequestFields: [String],
        submittedAt: { type: Date, default: Date.now },
      },
    ],
    changeRequestFields: {
      type: [String],
      default: [],
    },
    changeRequestReason: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: [
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
      ],
      default: 'Draft',
      index: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    archived: {
      type: Boolean,
      default: false,
      index: true,
    },
    reviewDecisionNotes: {
      type: String,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: null,
    },
    resubmittedAt: {
      type: Date,
      default: null,
    },
    duplicateOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      default: null,
    },
    latestReviewId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Review',
    },
    originalSnapshot: {
      title: String,
      description: String,
      category: String,
      price: Number,
      currency: String,
      attributes: mongoose.Schema.Types.Mixed,
      seller: String,
      tags: [String],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

listingSchema.pre('save', function (next) {
  if (this.attributes) {
    this.attributes = normalizeAttributes(this.attributes);
  }
  next();
});

listingSchema.index({ title: 'text', description: 'text', seller: 'text' });
listingSchema.index({ status: 1, createdAt: -1 });
listingSchema.index({ assignedTo: 1, status: 1 });
listingSchema.index({ archived: 1, createdAt: -1 });

export const Listing = mongoose.model('Listing', listingSchema);
