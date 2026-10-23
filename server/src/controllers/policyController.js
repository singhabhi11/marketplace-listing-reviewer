import { z } from 'zod';
import { PolicyDocument } from '../models/PolicyDocument.js';
import { PolicySection } from '../models/PolicySection.js';
import { Setting } from '../models/Setting.js';

export const createPolicyDocSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  documentType: z.enum(['marketplace_policy', 'brand_guideline']),
  version: z.string().default('1.0.0'),
  effectiveDate: z.string().or(z.date()).optional(),
  source: z.string().optional().default('Marketplace Standard'),
});

export const createSectionSchema = z.object({
  sectionId: z.string().min(2, 'Section ID is required').toUpperCase(),
  title: z.string().min(3, 'Title is required'),
  content: z.string().min(10, 'Content must be descriptive'),
  category: z.string().min(1, 'Category is required'),
  version: z.string().optional().default('1.0.0'),
});

export const getPolicies = async (req, res, next) => {
  try {
    const documents = await PolicyDocument.find().sort({ createdAt: -1 }).lean();
    
    // Attach sections to each document
    const docsWithSections = await Promise.all(
      documents.map(async (doc) => {
        const sections = await PolicySection.find({ documentId: doc._id }).sort({ sectionId: 1 }).lean();
        return { ...doc, sections };
      })
    );

    return res.status(200).json({
      success: true,
      data: docsWithSections,
    });
  } catch (error) {
    next(error);
  }
};

export const getPolicyById = async (req, res, next) => {
  try {
    const doc = await PolicyDocument.findById(req.params.id).lean();
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Policy document not found.' });
    }
    const sections = await PolicySection.find({ documentId: doc._id }).sort({ sectionId: 1 }).lean();
    return res.status(200).json({
      success: true,
      data: { ...doc, sections },
    });
  } catch (error) {
    next(error);
  }
};

export const createPolicy = async (req, res, next) => {
  try {
    const doc = await PolicyDocument.create({
      ...req.body,
      createdBy: req.user._id,
    });

    return res.status(201).json({
      success: true,
      data: doc,
      message: 'Policy document created successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const updatePolicy = async (req, res, next) => {
  try {
    const doc = await PolicyDocument.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Policy document not found.' });
    }
    return res.status(200).json({
      success: true,
      data: doc,
      message: 'Policy document updated.',
    });
  } catch (error) {
    next(error);
  }
};

export const addPolicySection = async (req, res, next) => {
  try {
    const documentId = req.params.id;
    const doc = await PolicyDocument.findById(documentId);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Policy document not found.' });
    }

    const { sectionId, title, content, category, version } = req.body;

    const existingSection = await PolicySection.findOne({ sectionId: sectionId.toUpperCase() });
    if (existingSection) {
      return res.status(409).json({
        success: false,
        message: `Policy Section ID '${sectionId}' already exists. Section IDs must be globally unique.`,
      });
    }

    const section = await PolicySection.create({
      documentId,
      sectionId: sectionId.toUpperCase(),
      title,
      content,
      category,
      version: version || doc.version || '1.0.0',
      active: true,
    });

    return res.status(201).json({
      success: true,
      data: section,
      message: 'Policy section added successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const updatePolicySection = async (req, res, next) => {
  try {
    const { sectionId } = req.params;
    const section = await PolicySection.findOneAndUpdate(
      { sectionId: sectionId.toUpperCase() },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!section) {
      return res.status(404).json({ success: false, message: 'Policy section not found.' });
    }

    return res.status(200).json({
      success: true,
      data: section,
      message: 'Policy section updated successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const getSettings = async (req, res, next) => {
  try {
    const settings = await Setting.getEffectiveSettings();
    return res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};

export const updateSettings = async (req, res, next) => {
  try {
    let settings = await Setting.findOne({ key: 'marketplace_config' });
    if (!settings) {
      settings = new Setting({ key: 'marketplace_config' });
    }

    if (req.body.supportedCategories) {
      settings.supportedCategories = req.body.supportedCategories;
    }
    if (req.body.validationThresholds) {
      settings.validationThresholds = {
        ...settings.validationThresholds,
        ...req.body.validationThresholds,
      };
    }
    settings.updatedBy = req.user._id;
    await settings.save();

    return res.status(200).json({
      success: true,
      data: settings,
      message: 'Marketplace settings and validation thresholds updated.',
    });
  } catch (error) {
    next(error);
  }
};
