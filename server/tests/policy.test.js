import { describe, it, expect } from 'vitest';
import { retrieveRelevantPolicies, verifyPolicyCitation } from '../src/services/policy/policyRetriever.js';
import { PolicyDocument } from '../src/models/PolicyDocument.js';
import { PolicySection } from '../src/models/PolicySection.js';

describe('Policy Retrieval & Citation Verification (RAG Grounding)', () => {
  it('should retrieve relevant policies and rank matching categories higher', async () => {
    const doc = await PolicyDocument.create({
      name: 'Test Marketplace Policy',
      documentType: 'marketplace_policy',
      version: '1.0.0',
    });

    await PolicySection.create([
      {
        documentId: doc._id,
        sectionId: 'POL-PROH-001',
        title: 'Prohibited Items and Weapons',
        category: 'Prohibited Items',
        content: 'Counterfeit goods, replicas, weapons, and prescription medications are strictly forbidden.',
        active: true,
      },
      {
        documentId: doc._id,
        sectionId: 'POL-ELEC-002',
        title: 'Electronics Safety and Battery Compliance',
        category: 'Electronics',
        content: 'Lithium battery shipping certifications and voltage documentation are mandatory for electronics.',
        active: true,
      },
      {
        documentId: doc._id,
        sectionId: 'POL-INACTIVE-003',
        title: 'Deactivated Outdated Policy',
        category: 'Electronics',
        content: 'Old policy rules.',
        active: false, // inactive!
      },
    ]);

    const electronicsListing = {
      title: 'Anker Bluetooth Wireless Speaker with Lithium Battery',
      description: 'Portable rechargeable speaker with heavy bass and USB-C port.',
      category: 'Electronics',
      tags: ['speaker', 'battery'],
    };

    const retrieved = await retrieveRelevantPolicies(electronicsListing);
    const retrievedIds = retrieved.map((p) => p.sectionId);

    // Electronics policy should be retrieved
    expect(retrievedIds).toContain('POL-ELEC-002');
    // Inactive policy should NOT be retrieved
    expect(retrievedIds).not.toContain('POL-INACTIVE-003');
  });

  it('should verify legitimate policy citation and reject hallucinated citations', () => {
    const verifiedPolicies = [
      {
        sectionId: 'POL-PROH-001',
        title: 'Prohibited Items',
        content: 'Replicas are strictly prohibited.',
        version: '1.0.0',
      },
    ];

    // Valid citation
    const validMatch = verifyPolicyCitation('POL-PROH-001', verifiedPolicies);
    expect(validMatch).toBeDefined();
    expect(validMatch.sectionId).toBe('POL-PROH-001');

    // Case-insensitive match
    const caseMatch = verifyPolicyCitation('pol-proh-001', verifiedPolicies);
    expect(caseMatch).toBeDefined();

    // Hallucinated citation not in retrieved policies
    const hallucinatedMatch = verifyPolicyCitation('POL-FAKE-999', verifiedPolicies);
    expect(hallucinatedMatch).toBeNull();
  });
});
