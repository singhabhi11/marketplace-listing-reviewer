import mongoose from 'mongoose';

const settingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: 'marketplace_config',
      unique: true,
      required: true,
    },
    supportedCategories: {
      type: [String],
      default: [
        'Electronics',
        'Home & Kitchen',
        'Health & Personal Care',
        'Beauty & Grooming',
        'Clothing & Apparel',
        'Sports & Outdoors',
        'Books & Media',
        'Toys & Games',
        'Services & Consulting',
        'Automotive & Industrial',
      ],
    },
    validationThresholds: {
      minTitleLength: { type: Number, default: 10 },
      maxTitleLength: { type: Number, default: 150 },
      minDescLength: { type: Number, default: 30 },
      maxDescLength: { type: Number, default: 5000 },
      minPrice: { type: Number, default: 0.01 },
      maxPrice: { type: Number, default: 100000 },
      duplicateSimilarityThreshold: { type: Number, default: 0.80 },
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

settingSchema.statics.getEffectiveSettings = async function () {
  let settings = await this.findOne({ key: 'marketplace_config' });
  if (!settings) {
    settings = await this.create({ key: 'marketplace_config' });
  }
  return settings;
};

export const Setting = mongoose.model('Setting', settingSchema);
