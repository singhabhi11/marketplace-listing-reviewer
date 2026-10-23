import mongoose from 'mongoose';

const policyDocumentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Policy document name is required'],
      trim: true,
      maxlength: 200,
    },
    documentType: {
      type: String,
      enum: ['marketplace_policy', 'brand_guideline'],
      default: 'marketplace_policy',
      required: true,
    },
    version: {
      type: String,
      required: [true, 'Document version is required'],
      trim: true,
      default: '1.0.0',
    },
    effectiveDate: {
      type: Date,
      default: Date.now,
      required: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
    source: {
      type: String,
      default: 'Marketplace Operations Standard',
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

policyDocumentSchema.index({ active: 1, documentType: 1 });

export const PolicyDocument = mongoose.model('PolicyDocument', policyDocumentSchema);
