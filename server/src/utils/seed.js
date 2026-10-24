import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { PolicyDocument } from '../models/PolicyDocument.js';
import { PolicySection } from '../models/PolicySection.js';
import { Listing } from '../models/Listing.js';
import { Setting } from '../models/Setting.js';
import { connectDB, disconnectDB } from '../config/db.js';

export async function seedInitialData() {
  await Setting.getEffectiveSettings();

  // 1. Admin
  let admin = await User.findOne({ email: 'admin@marketplace.local' });
  if (!admin) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('AdminPass123!', salt);
    admin = await User.create({
      name: 'System Administrator',
      email: 'admin@marketplace.local',
      passwordHash,
      role: 'administrator',
      status: 'active',
      department: 'Platform Governance & Trust',
      lastLoginAt: new Date(),
    });
    console.log('[Seed] Created default Administrator: admin@marketplace.local / AdminPass123!');
  }

  // 2. Reviewer
  let reviewer = await User.findOne({ email: 'reviewer@marketplace.local' });
  if (!reviewer) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('ReviewerPass123!', salt);
    reviewer = await User.create({
      name: 'Lead Reviewer',
      email: 'reviewer@marketplace.local',
      passwordHash,
      role: 'reviewer',
      status: 'active',
      department: 'Content Policy Enforcement',
      lastLoginAt: new Date(),
    });
    console.log('[Seed] Created default Reviewer: reviewer@marketplace.local / ReviewerPass123!');
  }

  // 3. Seller
  let seller = await User.findOne({ email: 'seller@marketplace.local' });
  if (!seller) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('SellerPass123!', salt);
    seller = await User.create({
      name: 'Apex Seller Store',
      email: 'seller@marketplace.local',
      passwordHash,
      role: 'seller',
      status: 'active',
      department: 'External Merchant Partner',
      lastLoginAt: new Date(),
    });
    console.log('[Seed] Created default Seller: seller@marketplace.local / SellerPass123!');
  }

  // Seed Sample Policies if none exist
  const existingDocCount = await PolicyDocument.countDocuments();
  if (existingDocCount === 0) {
    console.log('[Seed] Seeding sample policies and guidelines...');

    const safetyDoc = await PolicyDocument.create({
      name: 'Sample Marketplace Content & Safety Policy (Sample Rules Only)',
      documentType: 'marketplace_policy',
      version: '1.2.0',
      effectiveDate: new Date('2025-01-01'),
      active: true,
      source: 'Sample Standard for Marketplace Quality Assessment (Not Legal Marketplace Policy)',
      createdBy: admin._id,
    });

    const brandDoc = await PolicyDocument.create({
      name: 'Sample Brand Tone & Catalog Content Guide (Sample Rules Only)',
      documentType: 'brand_guideline',
      version: '2.0.0',
      effectiveDate: new Date('2025-01-01'),
      active: true,
      source: 'Sample Brand Editorial Standard (Not Legal Marketplace Policy)',
      createdBy: admin._id,
    });

    const sections = [
      {
        documentId: safetyDoc._id,
        sectionId: 'SAMPLE-POL-PROH-001',
        title: 'Prohibited and Restricted Items',
        category: 'Prohibited Items',
        version: '1.2.0',
        content:
          'Sellers are strictly forbidden from listing counterfeit goods, replicas, unauthorized brand reproductions, prescription-only pharmaceuticals, weapons, firearms or ammunition components, and hazardous industrial chemicals. Any listing referencing "replica", "knockoff", "1:1 copy", or "unauthorized OEM reproduction" violates this section.',
        active: true,
      },
      {
        documentId: safetyDoc._id,
        sectionId: 'SAMPLE-POL-SAFE-002',
        title: 'Consumer Product Safety and Regulatory Standards',
        category: 'Safety & Compliance',
        version: '1.2.0',
        content:
          'All electrical equipment, battery-powered devices, toys, and protective equipment must comply with mandatory regional consumer safety standards. Sellers must clearly disclose voltage, battery chemistry, age recommendations for children, and hazard warnings. Products claiming formal safety certifications (e.g., FDA, UL, CE) must provide authentic certification identifiers in the attributes.',
        active: true,
      },
      {
        documentId: safetyDoc._id,
        sectionId: 'SAMPLE-POL-PRICE-003',
        title: 'Accurate and Transparent Pricing',
        category: 'Pricing & Warranties',
        version: '1.2.0',
        content:
          'The listed price must reflect the total purchase amount excluding applicable statutory taxes and published delivery fees. Bait-and-switch pricing, placeholder non-numeric fees, zero or negative amounts, and artificially inflated reference prices are prohibited. Mandatory accessories cannot be unbundled to simulate a lower product price.',
        active: true,
      },
      {
        documentId: brandDoc._id,
        sectionId: 'SAMPLE-BRAND-TONE-001',
        title: 'Objective Brand Voice, Capitalization and Typography',
        category: 'Brand Voice & Style',
        version: '2.0.0',
        content:
          'Listing titles and descriptions must employ professional, objective language. Excessive capitalization (ALL CAPS shouting), repeated punctuation (e.g., "!!!", "???"), and promotional emoji stuffing (e.g., "🔥🔥🔥 BEST DEAL") are strictly disallowed. Titles must follow standard title-casing and lead with the brand and specific product name.',
        active: true,
      },
      {
        documentId: brandDoc._id,
        sectionId: 'SAMPLE-BRAND-SPEC-002',
        title: 'Complete and Verifiable Technical Specifications',
        category: 'Product Specifications',
        version: '2.0.0',
        content:
          'Product descriptions must include verified physical dimensions, material composition, package contents, manufacturer part numbers, and compatibility requirements. Vague descriptions consisting solely of promotional praise without measurable specifications degrade catalog search ranking and buyer confidence.',
        active: true,
      },
      {
        documentId: brandDoc._id,
        sectionId: 'SAMPLE-BRAND-CLAIM-003',
        title: 'Health, Wellness, and Performance Guarantees',
        category: 'Marketing Claims',
        version: '2.0.0',
        content:
          'Listings must not make unsubstantiated health claims, medical treatment assertions (such as "cures cancer", "100% miracle remedy", or "eliminates all disease"), or guaranteed financial return promises ("get rich quick", "100% risk-free wealth"). All performance claims must be backed by verifiable test methodology or cited third-party certifications.',
        active: true,
      },
    ];

    for (const sec of sections) {
      await PolicySection.create(sec);
    }
    console.log(`[Seed] Seeded ${sections.length} sample policy sections.`);
  }

  // Seed Sample Listings if none exist
  const existingListingCount = await Listing.countDocuments();
  if (existingListingCount === 0) {
    console.log('[Seed] Seeding sample product listings...');

    const sampleListings = [
      {
        title: 'Anker Soundcore Space One Noise Cancelling Headphones - Midnight Black',
        description:
          'Over-ear wireless Bluetooth 5.3 headphones featuring adaptive active noise cancellation, 40mm dynamic drivers with LDAC Hi-Res audio support, and up to 55 hours of battery playtime. Includes USB-C charging cable, 3.5mm AUX audio cable, and travel storage pouch.',
        category: 'Electronics',
        price: 99.99,
        currency: 'USD',
        attributes: {
          Brand: 'Anker Soundcore',
          Color: 'Midnight Black',
          Connectivity: 'Bluetooth 5.3 / 3.5mm AUX',
          BatteryLife: '55 Hours',
          ModelNumber: 'A3035',
        },
        seller: 'Anker Direct Store',
        tags: ['audio', 'wireless', 'noise-cancelling', 'headphones'],
        status: 'Approved',
        createdBy: admin._id,
      },
      {
        title: '!!! LUXURY REPLICA WATCH 1:1 ROLEX SUBMARINER BEST DEAL EVER 🔥🔥🔥',
        description:
          'AMAZING 100% MIRACLE AUTOMATIC WATCH!! Exact 1:1 luxury replica knockoff indistinguishable from genuine swiss timepieces! Best in the world, cures your status anxiety instantly. Zero risk guarantee, buy now before stock runs out!!!',
        category: 'Clothing & Apparel',
        price: 150.0,
        currency: 'USD',
        attributes: {
          Movement: 'Automatic',
          Grade: '1:1 Replica Clone',
        },
        seller: 'Discount Luxury Imports',
        tags: ['rolex', 'replica', 'luxury', 'bargain', 'miracle'],
        status: 'Pending Review',
        assignedTo: reviewer._id,
        createdBy: seller._id,
      },
      {
        title: 'Pure Herbal Drops - 100% Miracle Cure for All Ailments',
        description:
          'Guaranteed to cure chronic pain, stress, and fatigue in 24 hours! Completely clinically proven to reverse aging with zero risk. FDA certified wonder formula made from secret ancient Himalayan herbs.',
        category: 'Health & Personal Care',
        price: 49.95,
        currency: 'USD',
        attributes: {
          Volume: '60ml',
        },
        seller: 'Himalayan Miracle Remedies LLC',
        tags: ['cure', 'health', 'herbal', 'wellness'],
        status: 'Pending Review',
        assignedTo: reviewer._id,
        createdBy: seller._id,
      },
      {
        title: 'Ultra Slim Silicone Case for iPhone 15 Pro Max',
        description: 'Translucent matte liquid silicone phone case with raised camera bevel protection and MagSafe wireless charging compatibility.',
        category: 'Electronics',
        price: 14.99,
        currency: 'USD',
        attributes: {
          Material: 'Liquid Silicone',
          Compatibility: 'iPhone 15 Pro Max',
        },
        seller: 'CaseVendor99',
        tags: ['phone', 'accessories', 'magsafe'],
        status: 'Draft',
        createdBy: seller._id,
      },
    ];

    for (const item of sampleListings) {
      await Listing.create({
        ...item,
        originalSnapshot: { ...item },
      });
    }
    console.log(`[Seed] Seeded ${sampleListings.length} sample listings.`);
  }

  console.log('[Seed] Database seeding check complete.');
}

if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  (async () => {
    try {
      await connectDB();
      await seedInitialData();
      await disconnectDB();
      process.exit(0);
    } catch (err) {
      console.error(`[Seed Script Error] ${err.message}`);
      process.exit(1);
    }
  })();
}
