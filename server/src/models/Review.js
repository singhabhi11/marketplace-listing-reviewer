import mongoose from 'mongoose';

const findingSchema = new mongoose.Schema(
  {
    field: {
      type: String,
      required: true,
      trim: true,
    },
    affectedField: {
      type: String,
      trim: true,
    },
    issueTitle: {
      type: String,
      default: null,
      trim: true,
    },
    originalExcerpt: {
      type: String,
      default: null,
    },
    issueCategory: {
      type: String,
      required: true,
      trim: true,
    },
    ruleId: {
      type: String,
      default: null,
      trim: true,
    },
    severity: {
      type: String,
      enum: ['Critical', 'High', 'Medium', 'Low'],
      required: true,
      default: 'Medium',
    },
    description: {
      type: String,
      required: true,
    },
    policySectionId: {
      type: String,
      default: null,
      trim: true,
    },
    policyTitle: {
      type: String,
      default: null,
      trim: true,
    },
    policyExcerpt: {
      type: String,
      default: null,
    },
    explanation: {
      type: String,
      required: true,
    },
    suggestedRevision: {
      type: String,
      default: null,
    },
    source: {
      type: String,
      enum: ['ai', 'rule'],
      required: true,
      default: 'ai',
    },
    confidence: {
      type: String,
      enum: ['High', 'Medium', 'Low', 'Uncertain'],
      default: 'High',
    },
    confidenceScore: {
      type: Number,
      default: 0.92,
    },
    isUnverified: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'edited'],
      default: 'pending',
    },
    reviewerDecision: {
      action: {
        type: String,
        enum: ['approved', 'rejected', 'edited', null],
        default: null,
      },
      appliedValue: {
        type: String,
        default: null,
      },
      rejectionReason: {
        type: String,
        default: null,
      },
      decidedAt: {
        type: Date,
        default: null,
      },
      decidedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
      },
    },
  },
  { _id: true }
);

// Pre-save to synchronize field / affectedField & issueTitle
findingSchema.pre('save', function (next) {
  if (!this.affectedField) {
    this.affectedField = this.field;
  }
  if (!this.issueTitle) {
    this.issueTitle = `${this.issueCategory.replace(/_/g, ' ')} on ${this.field}`;
  }
  next();
});

const reviewSchema = new mongoose.Schema(
  {
    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      required: true,
      index: true,
    },
    originalSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    findings: [findingSchema],
    suggestedRevisions: {
      type: Map,
      of: String,
      default: {},
    },
    overallStatus: {
      type: String,
      enum: ['Changes Suggested', 'Changes Requested', 'Approved', 'Rejected', 'Pending Review', 'Failed'],
      default: 'Changes Suggested',
      index: true,
    },
    reviewNotes: {
      type: String,
      default: '',
    },
    providerMetadata: {
      provider: { type: String, default: 'fallback' },
      model: { type: String, default: 'rule-engine' },
      fallbackUsed: { type: Boolean, default: false },
      executionTimeMs: { type: Number, default: 0 },
      promptTokens: { type: Number, default: 0 },
      responseTokens: { type: Number, default: 0 },
      error: { type: String, default: null },
    },
    policyVersionSnapshot: [
      {
        sectionId: String,
        title: String,
        category: String,
        version: String,
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
    },
    turnaroundSeconds: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

reviewSchema.index({ listingId: 1, createdAt: -1 });

export const Review = mongoose.model('Review', reviewSchema);
