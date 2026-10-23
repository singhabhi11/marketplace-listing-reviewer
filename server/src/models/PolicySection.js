import mongoose from 'mongoose';

const policySectionSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PolicyDocument',
      required: true,
      index: true,
    },
    sectionId: {
      type: String,
      required: [true, 'Section ID is required (e.g. POL-PROH-001)'],
      trim: true,
      uppercase: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Section title is required'],
      trim: true,
      maxlength: 300,
    },
    content: {
      type: String,
      required: [true, 'Section content / policy text is required'],
    },
    category: {
      type: String,
      required: true,
      trim: true,
      default: 'General',
    },
    version: {
      type: String,
      required: true,
      default: '1.0.0',
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

policySectionSchema.index({ sectionId: 1, version: 1 }, { unique: true });
policySectionSchema.index({ title: 'text', content: 'text', category: 'text' });

export const PolicySection = mongoose.model('PolicySection', policySectionSchema);
