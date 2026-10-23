import mongoose from 'mongoose';

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
      default: 'USD',
      uppercase: true,
      trim: true,
    },
    attributes: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
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
    status: {
      type: String,
      enum: ['Draft', 'Pending Review', 'Reviewing', 'Changes Suggested', 'Approved', 'Rejected', 'Failed'],
      default: 'Draft',
      index: true,
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

listingSchema.index({ title: 'text', description: 'text', seller: 'text' });
listingSchema.index({ status: 1, createdAt: -1 });

export const Listing = mongoose.model('Listing', listingSchema);
