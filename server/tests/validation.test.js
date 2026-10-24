import { describe, it, expect } from 'vitest';
import { runDeterministicValidation } from '../src/services/validation/deterministicValidator.js';
import { Listing } from '../src/models/Listing.js';
import { User } from '../src/models/User.js';

describe('Deterministic Validation Service', () => {
  it('should identify all missing required fields', async () => {
    const emptyListing = {
      title: '',
      description: '',
      category: '',
      price: null,
      seller: '',
    };

    const findings = await runDeterministicValidation(emptyListing);
    const ruleIds = findings.map((f) => f.ruleId);

    expect(ruleIds).toContain('RULE_REQ_TITLE');
    expect(ruleIds).toContain('RULE_REQ_DESC');
    expect(ruleIds).toContain('RULE_REQ_CATEGORY');
    expect(ruleIds).toContain('RULE_REQ_PRICE');
    expect(ruleIds).toContain('RULE_MISSING_SELLER');
  });

  it('should flag negative or zero price as Critical issue', async () => {
    const negativePriceListing = {
      title: 'Valid Product Title For Testing',
      description: 'Valid product description that contains enough characters to pass length tests.',
      category: 'Electronics',
      price: -15.5,
      seller: 'GoodSeller',
    };

    const findings = await runDeterministicValidation(negativePriceListing);
    const priceFinding = findings.find((f) => f.ruleId === 'RULE_PRICE_POSITIVE');

    expect(priceFinding).toBeDefined();
    expect(priceFinding.severity).toBe('Critical');
    expect(priceFinding.field).toBe('price');
  });

  it('should flag title and description length violations', async () => {
    const shortListing = {
      title: 'Short', // < 10 chars
      description: 'Too short', // < 30 chars
      category: 'Electronics',
      price: 25.0,
      seller: 'GoodSeller',
    };

    const findings = await runDeterministicValidation(shortListing);
    const ruleIds = findings.map((f) => f.ruleId);

    expect(ruleIds).toContain('RULE_TITLE_TOO_SHORT');
    expect(ruleIds).toContain('RULE_DESC_TOO_SHORT');
  });

  it('should flag unsupported category', async () => {
    const invalidCatListing = {
      title: 'Quality Noise Cancelling Headphones Model 5',
      description: 'High performance noise cancelling over-ear headphones with superior audio clarity.',
      category: 'Weapons & Illegal Contraband', // Not in supported categories
      price: 49.99,
      seller: 'GoodSeller',
    };

    const findings = await runDeterministicValidation(invalidCatListing);
    const catFinding = findings.find((f) => f.ruleId === 'RULE_UNSUPPORTED_CATEGORY');

    expect(catFinding).toBeDefined();
    expect(catFinding.severity).toBe('High');
  });

  it('should detect duplicate or near-duplicate listings from the database', async () => {
    const testUser = await User.create({
      name: 'Seller A',
      email: 'sellera@test.local',
      passwordHash: 'dummy',
    });

    // Create an existing listing in DB
    const existing = await Listing.create({
      title: 'Sony WH-1000XM5 Wireless Noise Canceling Headphones',
      description: 'Industry leading noise canceling with two processors and 8 microphones for unprecedented noise reduction.',
      category: 'Electronics',
      price: 398.0,
      seller: 'Authorized Sony Dealer',
      status: 'Approved',
      createdBy: testUser._id,
    });

    // Near-duplicate listing to test
    const duplicateListing = {
      title: 'Sony WH-1000XM5 Wireless Noise Canceling Headphones',
      description: 'Industry leading noise canceling with two processors and 8 microphones for unprecedented noise reduction.',
      category: 'Electronics',
      price: 395.0,
      seller: 'Second Store',
    };

    const findings = await runDeterministicValidation(duplicateListing);
    const dupFinding = findings.find((f) => f.ruleId === 'RULE_DUPLICATE_LISTING');

    expect(dupFinding).toBeDefined();
    expect(dupFinding.explanation).toContain('Similarity-based detection may produce false positives');
  });

  it('should flag malformed attributes with empty values', async () => {
    const listingWithMalformedAttrs = {
      title: 'Samsung Galaxy Smartphone 128GB Black',
      description: 'Reliable unlocked smartphone in excellent renewed condition with charging adapter included.',
      category: 'Electronics',
      price: 299.0,
      seller: 'TechStore',
      attributes: {
        Color: '', // Empty value
        Storage: null, // Null value
      },
    };

    const findings = await runDeterministicValidation(listingWithMalformedAttrs);
    const attrFindings = findings.filter((f) => f.ruleId === 'RULE_ATTRS_EMPTY_VAL');
    expect(attrFindings.length).toBe(2);
  });

  it('should correctly normalize colon-separated attributes like "Dimensions: 65 x 65 x 110 cm" without false empty value error', async () => {
    const listing = {
      title: 'Ergonomic Mesh Office Chair with Lumbar Support',
      description: 'Fully adjustable mesh high-back chair designed for maximum comfort during long workdays.',
      category: 'Furniture',
      price: 189.99,
      seller: 'ComfortFurnishings',
      attributes: [
        { key: 'Dimensions: 65 x 65 x 110 cm', value: '' }, // Pasted key-value with colon
        { key: 'Color', value: 'Grey' },
      ],
    };

    const findings = await runDeterministicValidation(listing);
    const attrFindings = findings.filter((f) => f.field === 'attributes');
    expect(attrFindings.length).toBe(0);
  });

  it('should reject placeholder category "Select Category"', async () => {
    const listing = {
      title: 'Ergonomic Mesh Office Chair with Lumbar Support',
      description: 'Fully adjustable mesh high-back chair designed for maximum comfort during long workdays.',
      category: 'Select Category',
      price: 189.99,
      seller: 'ComfortFurnishings',
    };

    const findings = await runDeterministicValidation(listing);
    const catFinding = findings.find((f) => f.ruleId === 'RULE_REQ_CATEGORY');
    expect(catFinding).toBeDefined();
    expect(catFinding.severity).toBe('Critical');
  });

  it('should flag price with more than 2 decimal places or zero price', async () => {
    const zeroPriceListing = {
      title: 'Valid Product Title For Testing',
      description: 'Valid product description that contains enough characters to pass length tests.',
      category: 'Electronics',
      price: 0,
      seller: 'GoodSeller',
    };

    const findingsZero = await runDeterministicValidation(zeroPriceListing);
    expect(findingsZero.some((f) => f.ruleId === 'RULE_PRICE_POSITIVE')).toBe(true);

    const manyDecimalsListing = {
      title: 'Valid Product Title For Testing',
      description: 'Valid product description that contains enough characters to pass length tests.',
      category: 'Electronics',
      price: 19.999,
      seller: 'GoodSeller',
    };

    const findingsDecimals = await runDeterministicValidation(manyDecimalsListing);
    expect(findingsDecimals.some((f) => f.ruleId === 'RULE_PRICE_DECIMALS')).toBe(true);
  });

  it('should detect duplicate attribute keys regardless of case or whitespace', async () => {
    const listing = {
      title: 'Ergonomic Mesh Office Chair with Lumbar Support',
      description: 'Fully adjustable mesh high-back chair designed for maximum comfort during long workdays.',
      category: 'Furniture',
      price: 189.99,
      seller: 'ComfortFurnishings',
      attributes: [
        { key: 'Color', value: 'Black' },
        { key: ' color ', value: 'White' },
      ],
    };

    const findings = await runDeterministicValidation(listing);
    const dupAttrFinding = findings.find((f) => f.ruleId === 'RULE_ATTRS_DUPLICATE_KEY');
    expect(dupAttrFinding).toBeDefined();
    expect(dupAttrFinding.severity).toBe('Low');
  });
});
