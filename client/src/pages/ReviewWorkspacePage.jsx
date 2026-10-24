import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { SeverityBadge } from '../components/SeverityBadge';
import { StatusBadge } from '../components/StatusBadge';
import { DiffViewer } from '../components/DiffViewer';
import { Modal } from '../components/Modal';
import {
  ArrowLeft,
  Sparkles,
  CheckCircle,
  XCircle,
  Edit3,
  BookOpen,
  AlertTriangle,
  History,
  ShieldAlert,
  HelpCircle,
  Filter,
  CheckCheck,
  RefreshCw,
  Cpu,
  Layers,
  Quote,
  MessageSquare,
  Shield,
  Gauge,
} from 'lucide-react';

export const ReviewWorkspacePage = () => {
  const { id: listingId } = useParams();
  const { user, isSeller, isReviewer, isAdmin } = useAuth();

  const [listing, setListing] = useState(null);
  const [review, setReview] = useState(null);
  const [auditEvents, setAuditEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reRunningReview, setReRunningReview] = useState(false);
  const [error, setError] = useState(null);

  // Filters
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [sourceFilter, setSourceFilter] = useState('ALL');

  // Modals state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedFindingForEdit, setSelectedFindingForEdit] = useState(null);
  const [customEditValue, setCustomEditValue] = useState('');

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedFindingForReject, setSelectedFindingForReject] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const [requestChangesModalOpen, setRequestChangesModalOpen] = useState(false);
  const [changesReason, setChangesReason] = useState('');

  const [confirmApproveAllOpen, setConfirmApproveAllOpen] = useState(false);

  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [decisionTargetStatus, setDecisionTargetStatus] = useState('');
  const [decisionNotes, setDecisionNotes] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [listingRes, reviewsRes, auditRes] = await Promise.all([
        api.get(`/listings/${listingId}`),
        api.get(`/listings/${listingId}/reviews`),
        api.get(`/listings/${listingId}/audit`),
      ]);

      if (listingRes.data.success) {
        setListing(listingRes.data.data);
      }

      if (reviewsRes.data.success && reviewsRes.data.data.length > 0) {
        setReview(reviewsRes.data.data[0]);
      } else {
        setReview(null);
      }

      if (auditRes.data.success) {
        setAuditEvents(auditRes.data.data);
      }
    } catch (err) {
      console.error('Error fetching review workspace data:', err);
      setError('Failed to load review workspace. Please verify connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [listingId]);

  const handleRunReview = async () => {
    setReRunningReview(true);
    try {
      const res = await api.post(`/listings/${listingId}/reviews`);
      if (res.data.success) {
        await fetchData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to run review.');
    } finally {
      setReRunningReview(false);
    }
  };

  const handleApproveRevision = async (findingId) => {
    try {
      const res = await api.post(`/reviews/${review._id}/revisions/${findingId}/approve`);
      if (res.data.success) {
        await fetchData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve revision.');
    }
  };

  const openRejectModal = (finding) => {
    setSelectedFindingForReject(finding);
    setRejectionReason('');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!selectedFindingForReject) return;
    try {
      const res = await api.post(
        `/reviews/${review._id}/revisions/${selectedFindingForReject._id}/reject`,
        { reason: rejectionReason }
      );
      if (res.data.success) {
        setRejectModalOpen(false);
        await fetchData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reject revision.');
    }
  };

  const openEditModal = (finding) => {
    setSelectedFindingForEdit(finding);
    setCustomEditValue(finding.suggestedRevision || listing[finding.field] || '');
    setEditModalOpen(true);
  };

  const handleConfirmEdit = async () => {
    if (!selectedFindingForEdit) return;
    try {
      const res = await api.patch(
        `/reviews/${review._id}/revisions/${selectedFindingForEdit._id}`,
        { customValue: customEditValue }
      );
      if (res.data.success) {
        setEditModalOpen(false);
        await fetchData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to apply custom edit.');
    }
  };

  const handleApproveAll = async () => {
    try {
      const res = await api.post(`/reviews/${review._id}/approve-all`);
      if (res.data.success) {
        setConfirmApproveAllOpen(false);
        await fetchData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve all revisions.');
    }
  };

  const handleOpenDecisionModal = (status) => {
    setDecisionTargetStatus(status);
    setDecisionNotes('');
    setDecisionModalOpen(true);
  };

  const handleConfirmDecision = async () => {
    try {
      if (decisionTargetStatus === 'Changes Requested') {
        if (!decisionNotes.trim()) {
          alert('A reason is mandatory when requesting changes from the seller.');
          return;
        }
        await api.post(`/listings/${listingId}/request-changes`, {
          reason: decisionNotes,
        });
      } else {
        await api.patch(`/reviews/${review._id}/decision`, {
          status: decisionTargetStatus,
          reviewNotes: decisionNotes,
        });
      }

      setDecisionModalOpen(false);
      await fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to finalize review decision.');
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-sm">
        Loading Review Workspace...
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-sm">
        Listing not found.{' '}
        <Link to="/listings" className="text-blue-600 dark:text-blue-400 underline">
          Back
        </Link>
      </div>
    );
  }

  // Filter findings
  const allFindings = review?.findings || [];
  const filteredFindings = allFindings.filter((f) => {
    const matchesSeverity = severityFilter === 'ALL' || f.severity.toUpperCase() === severityFilter;
    const matchesSource = sourceFilter === 'ALL' || f.source.toUpperCase() === sourceFilter;
    return matchesSeverity && matchesSource;
  });

  const pendingEligibleCount = allFindings.filter(
    (f) => f.status === 'pending' && f.suggestedRevision
  ).length;

  return (
    <div className="space-y-6">
      {/* Top Header & Context */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            to={`/listings/${listingId}`}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                AI Review Workspace
              </h1>
              <StatusBadge status={listing.status} />
              {review?.providerMetadata?.fallbackUsed && (
                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 text-[11px] font-medium flex items-center gap-1">
                  <Cpu size={12} />
                  <span>Rule Engine Fallback</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Listing: <strong className="text-slate-800 dark:text-slate-200">{listing.title}</strong> ($
              {listing.price} {listing.currency}) | Seller:{' '}
              <strong className="text-slate-800 dark:text-slate-200">{listing.seller}</strong>
            </p>
          </div>
        </div>

        {/* Global Controls (Hidden from Sellers) */}
        {!isSeller && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleRunReview}
              disabled={reRunningReview}
              className="inline-flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-600 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} className={reRunningReview ? 'animate-spin' : ''} />
              <span>{reRunningReview ? 'Re-analyzing...' : 'Re-Run Review'}</span>
            </button>

            {pendingEligibleCount > 0 && (
              <button
                onClick={() => setConfirmApproveAllOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs"
              >
                <CheckCheck size={14} />
                <span>Approve All ({pendingEligibleCount})</span>
              </button>
            )}

            {/* Request Changes Action */}
            <button
              onClick={() => handleOpenDecisionModal('Changes Requested')}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900 text-purple-700 dark:text-purple-300 text-xs font-semibold rounded-xl border border-purple-200 dark:border-purple-800 transition-colors"
            >
              <MessageSquare size={14} />
              <span>Request Changes</span>
            </button>

            {/* Approve Action */}
            <button
              onClick={() => handleOpenDecisionModal('Approved')}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs"
            >
              <CheckCircle size={14} />
              <span>Mark Approved</span>
            </button>

            {/* Reject Action */}
            <button
              onClick={() => handleOpenDecisionModal('Rejected')}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold rounded-xl border border-rose-200 dark:border-rose-800 transition-colors"
            >
              <XCircle size={14} />
              <span>Reject Listing</span>
            </button>
          </div>
        )}
      </div>

      {!review && (
        <div className="bg-white dark:bg-slate-800 p-12 rounded-2xl border border-slate-200 dark:border-slate-700 text-center space-y-4">
          <Sparkles size={36} className="text-blue-500 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            No Quality Review Generated Yet
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            This listing has not undergone quality and policy compliance analysis. Click below to
            orchestrate deterministic validation and AI grounding.
          </p>
          {!isSeller && (
            <button
              onClick={handleRunReview}
              disabled={reRunningReview}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs"
            >
              {reRunningReview ? 'Analyzing...' : 'Generate Review Now'}
            </button>
          )}
        </div>
      )}

      {review && (
        <div className="space-y-6">
          {/* Findings Filter Bar */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mr-1">
                <Filter size={14} />
                <span>Severity:</span>
              </span>
              {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => {
                const count =
                  sev === 'ALL'
                    ? allFindings.length
                    : allFindings.filter((f) => f.severity.toUpperCase() === sev).length;

                return (
                  <button
                    key={sev}
                    onClick={() => setSeverityFilter(sev)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      severityFilter === sev
                        ? 'bg-blue-600 text-white font-semibold shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                    }`}
                  >
                    {sev} ({count})
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 dark:text-slate-400">Source:</span>
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="px-2.5 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-200"
              >
                <option value="ALL">All Sources</option>
                <option value="AI">AI Grounded</option>
                <option value="RULE">Deterministic Rule</option>
              </select>
            </div>
          </div>

          {/* Findings List */}
          <div className="space-y-4">
            {filteredFindings.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 text-center text-slate-400 text-xs">
                No issues match the selected severity and source filters.
              </div>
            ) : (
              filteredFindings.map((finding, idx) => {
                const isDecisionMade = finding.status !== 'pending';

                return (
                  <div
                    key={finding._id || idx}
                    className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden transition-all hover:border-slate-300 dark:hover:border-slate-600"
                  >
                    {/* Finding Header */}
                    <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/40">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <SeverityBadge severity={finding.severity} size="sm" />
                        <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-mono text-[11px] font-semibold">
                          Field: {finding.affectedField || finding.field}
                        </span>
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {finding.issueTitle || finding.issueCategory}
                        </span>
                        <span className="text-[10px] uppercase font-bold text-slate-400 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-750 rounded">
                          Source: {finding.source}
                        </span>
                        {finding.confidenceScore && (
                          <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Gauge size={11} />
                            <span>{Math.round(finding.confidenceScore * 100)}% match</span>
                          </span>
                        )}
                        {finding.isUnverified && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[10px] font-medium flex items-center gap-1">
                            <HelpCircle size={11} />
                            <span>Unverified Claim</span>
                          </span>
                        )}
                      </div>

                      {/* Finding Status Badge */}
                      <div>
                        {finding.status === 'approved' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold">
                            <CheckCircle size={13} />
                            <span>Approved & Applied</span>
                          </span>
                        )}
                        {finding.status === 'rejected' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-semibold">
                            <XCircle size={13} />
                            <span>Dismissed</span>
                          </span>
                        )}
                        {finding.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-semibold">
                            <span>Pending Reviewer Action</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Finding Body */}
                    <div className="p-6 space-y-4">
                      {/* Description & Explanation */}
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                          {finding.description}
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                          {finding.explanation}
                        </p>
                      </div>

                      {/* Original Excerpt Highlight (if present) */}
                      {finding.originalExcerpt && (
                        <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                            Problematic Listing Excerpt:
                          </span>
                          <span className="font-mono text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-1.5 py-0.5 rounded">
                            "{finding.originalExcerpt}"
                          </span>
                        </div>
                      )}

                      {/* Policy Citation Grounding Panel */}
                      {finding.policySectionId ? (
                        <div className="p-4 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-xl space-y-2">
                          <div className="flex items-center gap-2 text-xs font-bold text-blue-900 dark:text-blue-300">
                            <BookOpen size={14} className="text-blue-700 dark:text-blue-400 shrink-0" />
                            <span>
                              Supporting Policy Citation: {finding.policySectionId} -{' '}
                              {finding.policyTitle || 'Policy Guideline'}
                            </span>
                          </div>
                          {finding.policyExcerpt && (
                            <blockquote className="text-xs text-blue-800 dark:text-blue-300 font-serif italic border-l-2 border-blue-400 pl-3 py-0.5">
                              "{finding.policyExcerpt}"
                            </blockquote>
                          )}
                        </div>
                      ) : (
                        <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-500 dark:text-slate-400 italic flex items-center gap-2">
                          <HelpCircle size={14} />
                          <span>
                            No direct policy section cited. Classified as a general quality recommendation.
                          </span>
                        </div>
                      )}

                      {/* Diff Comparison if Suggested Revision Exists */}
                      {finding.suggestedRevision && (
                        <DiffViewer
                          fieldName={finding.affectedField || finding.field}
                          originalValue={listing[finding.affectedField || finding.field] || ''}
                          revisedValue={
                            finding.reviewerDecision?.appliedValue || finding.suggestedRevision
                          }
                        />
                      )}

                      {/* Reviewer Action Buttons (Hidden from Sellers) */}
                      {!isSeller && (
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {finding.reviewerDecision?.rejectionReason && (
                              <span className="text-rose-600 dark:text-rose-400">
                                Reason: {finding.reviewerDecision.rejectionReason}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {finding.suggestedRevision && (
                              <>
                                <button
                                  onClick={() => handleApproveRevision(finding._id)}
                                  disabled={isDecisionMade}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs disabled:opacity-40"
                                >
                                  <CheckCircle size={13} />
                                  <span>Approve Suggestion</span>
                                </button>

                                <button
                                  onClick={() => openEditModal(finding)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-600 transition-colors"
                                >
                                  <Edit3 size={13} />
                                  <span>Edit & Apply</span>
                                </button>
                              </>
                            )}

                            <button
                              onClick={() => openRejectModal(finding)}
                              disabled={finding.status === 'rejected'}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold rounded-lg border border-rose-200 dark:border-rose-800 transition-colors disabled:opacity-40"
                            >
                              <XCircle size={13} />
                              <span>Reject Finding</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Audit History Timeline */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-3 flex items-center gap-2">
              <History size={16} className="text-blue-600" />
              <span>Immutable Audit Trail for this Listing</span>
            </h3>

            {auditEvents.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No audit records logged yet.</p>
            ) : (
              <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
                {auditEvents.map((event, idx) => (
                  <div key={event._id || idx} className="relative text-xs">
                    <span className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-blue-600 border-2 border-white dark:border-slate-800 ring-2 ring-blue-100 dark:ring-blue-900"></span>
                    <div className="flex items-center gap-2">
                      <strong className="text-slate-900 dark:text-white font-semibold">
                        {event.action}
                      </strong>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-500 dark:text-slate-400 font-medium">
                        {event.actorName}
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-400 font-mono">
                        {new Date(event.timestamp).toLocaleString()}
                      </span>
                    </div>

                    {event.before && event.after && (
                      <div className="mt-1.5 text-[11px] bg-slate-50 dark:bg-slate-900 p-2 rounded-lg border border-slate-100 dark:border-slate-700 font-mono text-slate-600 dark:text-slate-400">
                        {event.before.field && (
                          <div>
                            Changed <strong>{event.before.field}</strong> from "{event.before.value}" →
                            "{event.after.value}"
                          </div>
                        )}
                        {event.before.status && (
                          <div>
                            Status transition: {event.before.status} → {event.after.status}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Suggestion Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={`Edit Revision for '${selectedFindingForEdit?.field}'`}
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Customize the proposed replacement text before applying it to the listing:
          </p>
          <textarea
            rows={4}
            value={customEditValue}
            onChange={(e) => setCustomEditValue(e.target.value)}
            className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setEditModalOpen(false)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmEdit}
              className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg shadow-xs hover:bg-blue-700"
            >
              Apply to Listing
            </button>
          </div>
        </div>
      </Modal>

      {/* Reject Suggestion Modal */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="Reject Suggestion"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Please provide an optional reason for rejecting this finding (recorded in the audit history):
          </p>
          <input
            type="text"
            placeholder="e.g. Verified legitimate trademark holder / Context approved"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setRejectModalOpen(false)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmReject}
              className="px-4 py-2 bg-rose-600 text-white text-xs font-semibold rounded-lg hover:bg-rose-700"
            >
              Confirm Rejection
            </button>
          </div>
        </div>
      </Modal>

      {/* Decision Modal (Approve, Reject, or Request Changes) */}
      <Modal
        isOpen={decisionModalOpen}
        onClose={() => setDecisionModalOpen(false)}
        title={`Finalize Decision: ${decisionTargetStatus}`}
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-300">
            {decisionTargetStatus === 'Changes Requested'
              ? 'Please describe the mandatory changes the seller must make before approval:'
              : `Add optional reviewer notes for marking this listing as ${decisionTargetStatus}:`}
          </p>

          <textarea
            rows={4}
            value={decisionNotes}
            onChange={(e) => setDecisionNotes(e.target.value)}
            placeholder={
              decisionTargetStatus === 'Changes Requested'
                ? 'Mandatory: Explain what needs to be changed (e.g. Remove non-standard medical claims in description)'
                : 'Optional reviewer notes for the audit trail'
            }
            required={decisionTargetStatus === 'Changes Requested'}
            className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setDecisionModalOpen(false)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDecision}
              className={`px-4 py-2 text-white text-xs font-semibold rounded-lg shadow-xs ${
                decisionTargetStatus === 'Approved'
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : decisionTargetStatus === 'Rejected'
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-purple-600 hover:bg-purple-700'
              }`}
            >
              Confirm {decisionTargetStatus}
            </button>
          </div>
        </div>
      </Modal>

      {/* Confirm Approve All Modal */}
      <Modal
        isOpen={confirmApproveAllOpen}
        onClose={() => setConfirmApproveAllOpen(false)}
        title="Confirm Approve All Eligible Revisions"
      >
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
            <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-600" />
            <span>
              This action will apply all {pendingEligibleCount} suggested revisions directly to the
              listing fields and mark the listing status as <strong>Approved</strong>.
            </span>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setConfirmApproveAllOpen(false)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleApproveAll}
              className="px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 shadow-xs"
            >
              Yes, Approve All
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
