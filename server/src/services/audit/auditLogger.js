import { AuditEvent } from '../../models/AuditEvent.js';

/**
 * Append-only Audit Event Logger
 */
export async function logAuditEvent({
  listingId,
  reviewId = null,
  actorId,
  actorName = 'System',
  actorRole = 'reviewer',
  action,
  before = null,
  after = null,
  metadata = {},
}) {
  try {
    const event = await AuditEvent.create({
      listingId,
      reviewId,
      actorId,
      actorName,
      actorRole,
      action,
      before,
      after,
      metadata,
      timestamp: new Date(),
    });
    return event;
  } catch (err) {
    console.error(`[AuditLogger Error] Failed to create audit event: ${err.message}`);
    // Don't crash main request if audit write fails, but log error
    return null;
  }
}
