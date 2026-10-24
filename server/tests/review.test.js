import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { Listing } from '../src/models/Listing.js';
import { PolicyDocument } from '../src/models/PolicyDocument.js';
import { PolicySection } from '../src/models/PolicySection.js';
import { Review } from '../src/models/Review.js';
import { AuditEvent } from '../src/models/AuditEvent.js';

describe('Review Orchestration & Human Approval Workflows', () => {
  let authToken;
  let testUser;
  let testListing;

  beforeEach(async () => {
    // Create reviewer user
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Reviewer Tester',
        email: 'reviewer_test@marketplace.local',
        password: 'Password123!',
        role: 'reviewer',
      });
    authToken = res.body.token;
    testUser = await User.findOne({ email: 'reviewer_test@marketplace.local' });

    // Create policy document & section
    const doc = await PolicyDocument.create({
      name: 'Safety & Brand Policy',
      documentType: 'marketplace_policy',
      version: '1.0.0',
      active: true,
      createdBy: testUser._id,
    });

    await PolicySection.create({
      documentId: doc._id,
      sectionId: 'POL-PROH-001',
      title: 'Prohibited Replica Goods',
      category: 'Prohibited Items',
      content: 'Replica, counterfeit, and fake products are strictly forbidden from marketplace sale.',
      version: '1.0.0',
      active: true,
    });

    // Create listing with an issue
    testListing = await Listing.create({
      title: 'LUXURY REPLICA WATCH WITH AUTOMATIC MOVEMENT',
      description: 'High quality replica watch. 100% cure for your style. Best in the world.',
      category: 'Clothing & Apparel',
      price: 199.99,
      seller: 'Bargain Watches LLC',
      status: 'Pending Review',
      createdBy: testUser._id,
    });
  });

  it('should generate a review with deterministic and policy findings', async () => {
    const res = await request(app)
      .post(`/api/listings/${testListing._id}/reviews`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.findings.length).toBeGreaterThan(0);

    const findings = res.body.data.findings;
    // Should detect the replica policy violation and cite POL-PROH-001
    const replicaFinding = findings.find(
      (f) => f.issueCategory === 'POLICY_VIOLATION' && f.policySectionId === 'POL-PROH-001'
    );
    expect(replicaFinding).toBeDefined();
    expect(replicaFinding.severity).toBe('Critical');

    // Listing status should be updated to 'Changes Suggested' or 'Changes Requested'
    const updatedListing = await Listing.findById(testListing._id);
    expect(['Changes Suggested', 'Changes Requested']).toContain(updatedListing.status);

    // Audit event must be created
    const auditEvents = await AuditEvent.find({ listingId: testListing._id, action: 'REVIEW_GENERATED' });
    expect(auditEvents.length).toBe(1);
  });

  it('should allow human reviewer to approve a revision and update only the target field', async () => {
    // Generate review
    const reviewRes = await request(app)
      .post(`/api/listings/${testListing._id}/reviews`)
      .set('Authorization', `Bearer ${authToken}`);
    
    const reviewId = reviewRes.body.data._id;
    const review = await Review.findById(reviewId);

    // Find finding with a suggested revision
    const findingWithRevision = review.findings.find((f) => f.suggestedRevision);
    expect(findingWithRevision).toBeDefined();

    const targetField = findingWithRevision.field;
    const proposedValue = findingWithRevision.suggestedRevision;

    // Approve revision
    const approveRes = await request(app)
      .post(`/api/reviews/${reviewId}/revisions/${findingWithRevision._id}/approve`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.success).toBe(true);

    // Verify listing field updated
    const updatedListing = await Listing.findById(testListing._id);
    expect(updatedListing[targetField]).toBe(proposedValue);

    // Verify finding marked approved
    const updatedReview = await Review.findById(reviewId);
    const updatedFinding = updatedReview.findings.id(findingWithRevision._id);
    expect(updatedFinding.status).toBe('approved');

    // Verify audit event logged
    const approveEvent = await AuditEvent.findOne({
      listingId: testListing._id,
      action: 'REVISION_APPROVED',
    });
    expect(approveEvent).toBeDefined();
    expect(approveEvent.after.value).toBe(proposedValue);
  });

  it('should allow human reviewer to reject a suggestion without changing the listing', async () => {
    const reviewRes = await request(app)
      .post(`/api/listings/${testListing._id}/reviews`)
      .set('Authorization', `Bearer ${authToken}`);
    
    const reviewId = reviewRes.body.data._id;
    const review = await Review.findById(reviewId);
    const targetFinding = review.findings[0];
    const initialTitle = testListing.title;

    const rejectRes = await request(app)
      .post(`/api/reviews/${reviewId}/revisions/${targetFinding._id}/reject`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ reason: 'Seller verified authorization to distribute this specific model.' });

    expect(rejectRes.status).toBe(200);

    // Listing must remain unchanged
    const listingAfterReject = await Listing.findById(testListing._id);
    expect(listingAfterReject.title).toBe(initialTitle);

    // Audit event must record rejection
    const rejectEvent = await AuditEvent.findOne({
      listingId: testListing._id,
      action: 'REVISION_REJECTED',
    });
    expect(rejectEvent).toBeDefined();
  });

  it('should allow human reviewer to edit a suggestion before approving', async () => {
    const reviewRes = await request(app)
      .post(`/api/listings/${testListing._id}/reviews`)
      .set('Authorization', `Bearer ${authToken}`);
    
    const reviewId = reviewRes.body.data._id;
    const review = await Review.findById(reviewId);
    const targetFinding = review.findings[0];

    const customValue = 'Custom Curated Luxury Mechanical Timepiece - Steel Edition';

    const editRes = await request(app)
      .patch(`/api/reviews/${reviewId}/revisions/${targetFinding._id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ customValue });

    expect(editRes.status).toBe(200);

    const updatedListing = await Listing.findById(testListing._id);
    expect(updatedListing[targetFinding.field]).toBe(customValue);

    const editEvent = await AuditEvent.findOne({
      listingId: testListing._id,
      action: 'REVISION_EDITED_AND_APPROVED',
    });
    expect(editEvent).toBeDefined();
    expect(editEvent.after.value).toBe(customValue);
  });

  it('should validate CSV rows and preview before batch import', async () => {
    const csvContent = `title,description,category,price,seller\nValid Headphone,Good quality wireless sound with long battery life.,Electronics,59.99,AudioVendor\n,Missing title description,Electronics,19.99,Vendor2`;

    const res = await request(app)
      .post('/api/batches/upload')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ csvContent });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.summary.totalRows).toBe(2);
    expect(res.body.summary.validCount).toBe(1);
    expect(res.body.summary.invalidCount).toBe(1);
  });
});
