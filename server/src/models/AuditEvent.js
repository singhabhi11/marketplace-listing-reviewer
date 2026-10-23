import mongoose from 'mongoose';

const auditEventSchema = new mongoose.Schema(
  {
    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      required: true,
      index: true,
    },
    reviewId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Review',
      default: null,
      index: true,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    actorName: {
      type: String,
      default: 'Unknown User',
    },
    actorRole: {
      type: String,
      default: 'reviewer',
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    before: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    after: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
      immutable: true,
    },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

// Prevent updating audit records (append-only)
auditEventSchema.pre('updateOne', function () {
  throw new Error('Audit records are append-only and cannot be updated.');
});
auditEventSchema.pre('updateMany', function () {
  throw new Error('Audit records are append-only and cannot be updated.');
});
auditEventSchema.pre('findOneAndUpdate', function () {
  throw new Error('Audit records are append-only and cannot be updated.');
});

export const AuditEvent = mongoose.model('AuditEvent', auditEventSchema);
