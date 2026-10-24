import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { SeverityBadge } from '../components/SeverityBadge';
import { DiffViewer } from '../components/DiffViewer';
import { formatPrice } from '../utils/currency';
import {
  ArrowLeft,
  FileCheck2,
  Edit2,
  Trash2,
  Clock,
  User,
  Tag,
  Layers,
  Sparkles,
  History,
  AlertCircle,
  AlertTriangle,
  ExternalLink,
  Copy,
  Archive,
  ArchiveRestore,
  UserCheck,
  Send,
  CheckCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const ListingDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin, isReviewer, isSeller } = useAuth();

  const [listing, setListing] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewersList, setReviewersList] = useState([]);
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [loading, setLoading] = useState(true);
  const [triggeringReview, setTriggeringReview] = useState(false);
  const [resubmitting, setResubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const fetchListingAndReviews = async () => {
    setLoading(true);
    try {
      const [listingRes, reviewsRes] = await Promise.all([
        api.get(`/listings/${id}`),
        api.get(`/listings/${id}/reviews`),
      ]);

      if (listingRes.data.success) {
        setListing(listingRes.data.data);
        setSelectedAssignee(listingRes.data.data.assignedTo?._id || '');
      }
      if (reviewsRes.data.success) {
        setReviews(reviewsRes.data.data);
      }
    } catch (err) {
      setError('Failed to load listing details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListingAndReviews();

    // If admin or reviewer, load reviewers list for assignment
    if (!isSeller) {
      api
        .get('/users/reviewers')
        .then((res) => {
          if (res.data.success) {
            setReviewersList(res.data.data);
          }
        })
        .catch(() => {});
    }
  }, [id, isSeller]);

  const handleRunReview = async () => {
    setTriggeringReview(true);
    try {
      const res = await api.post(`/listings/${id}/reviews`);
      if (res.data.success) {
        navigate(`/listings/${id}/review`);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to trigger review.');
    } finally {
      setTriggeringReview(false);
    }
  };

  const handleAssignReviewer = async (assigneeId) => {
    setSelectedAssignee(assigneeId);
    try {
      const res = await api.patch(`/listings/${id}/assign`, {
        assignedTo: assigneeId || null,
      });
      if (res.data.success) {
        setSuccess('Reviewer assignment updated.');
        setTimeout(() => setSuccess(null), 3000);
        fetchListingAndReviews();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to assign reviewer.');
    }
  };

  const handleDuplicate = async () => {
    try {
      const res = await api.post(`/listings/${id}/duplicate`);
      if (res.data.success) {
        navigate(`/listings/${res.data.data._id}`);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to duplicate listing.');
    }
  };

  const handleToggleArchive = async () => {
    try {
      const res = await api.patch(`/listings/${id}/archive`);
      if (res.data.success) {
        setSuccess(
          listing?.archived ? 'Listing restored from archive.' : 'Listing moved to archive.'
        );
        setTimeout(() => setSuccess(null), 3000);
        fetchListingAndReviews();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update archive status.');
    }
  };

  const handleResubmit = async () => {
    setResubmitting(true);
    try {
      const res = await api.patch(`/listings/${id}/resubmit`);
      if (res.data.success) {
        setSuccess('Listing resubmitted for review successfully!');
        setTimeout(() => setSuccess(null), 4000);
        fetchListingAndReviews();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to resubmit listing.');
    } finally {
      setResubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-sm">
        Loading listing details...
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-sm">
        Listing not found.{' '}
        <Link to="/listings" className="text-blue-600 dark:text-blue-400 underline">
          Back to Listings
        </Link>
      </div>
    );
  }

  const normalizedAttributes = Array.isArray(listing.attributes)
    ? listing.attributes.filter((a) => a && (a.key || a.value))
    : listing.attributes && typeof listing.attributes === 'object'
    ? Object.entries(listing.attributes).map(([k, v]) => ({ key: k, value: String(v) }))
    : [];

  const isOwnerOrAdmin = isAdmin || listing.createdBy?._id === user?._id;
  const isChangesRequested =
    listing.status === 'Changes Requested' || listing.status === 'Changes Suggested';

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/listings"
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors shadow-xs"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                {listing.title}
              </h1>
              <StatusBadge status={listing.status} />
              <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[11px] font-bold">
                Revision #{listing.revision || 1}
              </span>
              {listing.archived && (
                <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[11px] font-bold">
                  Archived
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Seller: <strong className="text-slate-700 dark:text-slate-300">{listing.seller}</strong> |
              Category: <strong className="text-slate-700 dark:text-slate-300">{listing.category}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleDuplicate}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 transition-colors shadow-xs"
            title="Duplicate as new draft"
          >
            <Copy size={14} />
            <span>Duplicate</span>
          </button>

          <button
            onClick={handleToggleArchive}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 transition-colors shadow-xs"
            title={listing.archived ? 'Restore from Archive' : 'Move to Archive'}
          >
            {listing.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
            <span>{listing.archived ? 'Restore' : 'Archive'}</span>
          </button>

          <Link
            to={`/listings/${id}/edit`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 transition-colors shadow-xs"
          >
            <Edit2 size={14} />
            <span>Edit</span>
          </Link>

          {!isSeller && (
            <button
              onClick={handleRunReview}
              disabled={triggeringReview}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs disabled:opacity-50"
            >
              <Sparkles size={15} />
              <span>{triggeringReview ? 'Analyzing Quality...' : 'Run Quality Review'}</span>
            </button>
          )}
        </div>
      </div>

      {success && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle size={16} className="text-emerald-600 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Reviewer Changes Requested Banner */}
      {isChangesRequested && (
        <div className="p-5 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-2xl space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-purple-600 shrink-0 mt-0.5" size={20} />
              <div>
                <h3 className="text-sm font-bold text-purple-900 dark:text-purple-200">
                  Changes Requested by Quality Reviewer
                </h3>
                <p className="text-xs text-purple-700 dark:text-purple-300 mt-1 whitespace-pre-wrap">
                  {listing.reviewDecisionNotes ||
                    'Reviewer flagged policy issues that need remediation before this listing can be approved.'}
                </p>
              </div>
            </div>

            {isOwnerOrAdmin && (
              <button
                onClick={handleResubmit}
                disabled={resubmitting}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors shrink-0 disabled:opacity-50"
              >
                <Send size={14} />
                <span>{resubmitting ? 'Resubmitting...' : 'Fix & Resubmit for Review'}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Core Fields */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description Card */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
            <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Description
            </h2>
            <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap font-sans">
              {listing.description}
            </p>
          </div>

          {/* Original vs Modified Diff (if listing was modified after suggestions) */}
          {listing.originalFields && listing.originalFields.title && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
              <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Sparkles size={15} className="text-blue-600" />
                <span>Revision Comparison: Original vs Current Version</span>
              </h2>

              <DiffViewer
                fieldName="title"
                originalValue={listing.originalFields.title}
                revisedValue={listing.title}
              />

              {listing.originalFields.description && (
                <DiffViewer
                  fieldName="description"
                  originalValue={listing.originalFields.description}
                  revisedValue={listing.description}
                />
              )}
            </div>
          )}

          {/* Attributes Table Card */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
            <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Layers size={15} className="text-blue-600" />
              <span>Listing Attributes & Specifications</span>
            </h2>

            {normalizedAttributes.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No custom attributes specified.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {normalizedAttributes.map((attr, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700"
                  >
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase block">
                      {attr.key}
                    </span>
                    <span className="text-xs font-semibold text-slate-900 dark:text-white mt-0.5 block">
                      {attr.value}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
            <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Tag size={15} className="text-blue-600" />
              <span>Search Tags</span>
            </h2>
            <div className="flex flex-wrap gap-2">
              {listing.tags && listing.tags.length > 0 ? (
                listing.tags.map((t) => (
                  <span
                    key={t}
                    className="px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-medium border border-blue-200 dark:border-blue-800"
                  >
                    #{t}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400 italic">No search tags specified.</span>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Metadata & Review History */}
        <div className="space-y-6">
          {/* Metadata Card */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
            <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Listing Metadata
            </h2>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                <span className="text-slate-500 dark:text-slate-400">Price</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">
                  {formatPrice(listing.price, listing.currency)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                <span className="text-slate-500 dark:text-slate-400">Status</span>
                <StatusBadge status={listing.status} />
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                <span className="text-slate-500 dark:text-slate-400">Category</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{listing.category}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                <span className="text-slate-500 dark:text-slate-400">Created At</span>
                <span className="text-slate-700 dark:text-slate-300">
                  {new Date(listing.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                <span className="text-slate-500 dark:text-slate-400">Author</span>
                <span className="text-slate-700 dark:text-slate-300 font-medium">
                  {listing.createdBy?.name || 'Seller'}
                </span>
              </div>

              {/* Reviewer Assignment Row */}
              <div className="pt-2">
                <label className="block text-slate-500 dark:text-slate-400 text-xs mb-1.5 font-medium flex items-center gap-1.5">
                  <UserCheck size={14} className="text-blue-600" />
                  <span>Assigned Reviewer</span>
                </label>
                {!isSeller ? (
                  <select
                    value={selectedAssignee}
                    onChange={(e) => handleAssignReviewer(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Unassigned</option>
                    {reviewersList.map((rev) => (
                      <option key={rev._id} value={rev._id}>
                        {rev.name} ({rev.email})
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="font-semibold text-slate-800 dark:text-slate-200 block text-xs">
                    {listing.assignedTo?.name || 'Unassigned'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Review History Card */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
            <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <History size={14} className="text-blue-600" />
                <span>Quality Reviews ({reviews.length})</span>
              </span>
              {!isSeller && (
                <Link
                  to={`/listings/${id}/review`}
                  className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Open Workspace →
                </Link>
              )}
            </h2>

            {reviews.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400">
                No reviews conducted yet. Click "Run Quality Review" to analyze this listing against
                marketplace policies.
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.map((rev) => {
                  const criticals = rev.findings.filter((f) => f.severity === 'Critical').length;
                  const highs = rev.findings.filter((f) => f.severity === 'High').length;

                  return (
                    <Link
                      key={rev._id}
                      to={`/listings/${id}/review`}
                      className="block p-3.5 bg-slate-50 dark:bg-slate-900 hover:bg-blue-50/50 dark:hover:bg-slate-750 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {new Date(rev.createdAt).toLocaleDateString()}
                        </span>
                        <StatusBadge status={rev.overallStatus} />
                      </div>
                      <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                        <span>{rev.findings.length} findings</span>
                        {criticals > 0 && <SeverityBadge severity="Critical" size="sm" />}
                        {highs > 0 && <SeverityBadge severity="High" size="sm" />}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
