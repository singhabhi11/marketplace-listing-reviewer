import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { SeverityBadge } from '../components/SeverityBadge';
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
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const ListingDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const [listing, setListing] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [triggeringReview, setTriggeringReview] = useState(false);
  const [error, setError] = useState(null);

  const fetchListingAndReviews = async () => {
    setLoading(true);
    try {
      const [listingRes, reviewsRes] = await Promise.all([
        api.get(`/listings/${id}`),
        api.get(`/listings/${id}/reviews`),
      ]);

      if (listingRes.data.success) {
        setListing(listingRes.data.data);
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
  }, [id]);

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

  if (loading) {
    return <div className="p-12 text-center text-slate-500 text-sm">Loading listing details...</div>;
  }

  if (!listing) {
    return (
      <div className="p-12 text-center text-slate-500 text-sm">
        Listing not found.{' '}
        <Link to="/listings" className="text-blue-600 underline">
          Back to Listings
        </Link>
      </div>
    );
  }

  const attributesEntries =
    listing.attributes && typeof listing.attributes === 'object'
      ? Object.entries(listing.attributes)
      : [];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/listings"
            className="p-2 text-slate-400 hover:text-slate-700 bg-white border border-slate-200 rounded-xl transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{listing.title}</h1>
              <StatusBadge status={listing.status} />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Seller: <strong className="text-slate-700">{listing.seller}</strong> | Category:{' '}
              <strong className="text-slate-700">{listing.category}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to={`/listings/${id}/edit`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors shadow-sm"
          >
            <Edit2 size={14} />
            <span>Edit</span>
          </Link>

          <button
            onClick={handleRunReview}
            disabled={triggeringReview}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm disabled:opacity-50"
          >
            <Sparkles size={15} />
            <span>{triggeringReview ? 'Analyzing Quality...' : 'Run Quality Review'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Core Fields */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Description
            </h2>
            <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-sans">
              {listing.description}
            </p>
          </div>

          {/* Attributes Table Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Layers size={15} className="text-blue-600" />
              <span>Listing Attributes & Specifications</span>
            </h2>

            {attributesEntries.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No custom attributes specified.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {attributesEntries.map(([key, value]) => (
                  <div key={key} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                      {key}
                    </span>
                    <span className="text-xs font-semibold text-slate-900 mt-0.5 block">
                      {String(value)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Tag size={15} className="text-blue-600" />
              <span>Search Tags</span>
            </h2>
            <div className="flex flex-wrap gap-2">
              {listing.tags && listing.tags.length > 0 ? (
                listing.tags.map((t) => (
                  <span
                    key={t}
                    className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium border border-blue-200"
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
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Listing Metadata
            </h2>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Price</span>
                <span className="font-bold text-slate-900 text-sm">
                  ${listing.price?.toFixed(2)} {listing.currency}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Status</span>
                <StatusBadge status={listing.status} />
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Category</span>
                <span className="font-medium text-slate-800">{listing.category}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Created At</span>
                <span className="text-slate-700">
                  {new Date(listing.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-500">Owner</span>
                <span className="text-slate-700 font-medium">
                  {listing.createdBy?.name || 'Seller'}
                </span>
              </div>
            </div>
          </div>

          {/* Review History Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <History size={14} className="text-blue-600" />
                <span>Quality Reviews ({reviews.length})</span>
              </span>
              <Link
                to={`/listings/${id}/review`}
                className="text-[11px] font-semibold text-blue-600 hover:underline"
              >
                Open Workspace →
              </Link>
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
                      className="block p-3.5 bg-slate-50 hover:bg-blue-50/50 rounded-xl border border-slate-200 transition-colors"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800">
                          {new Date(rev.createdAt).toLocaleDateString()}
                        </span>
                        <StatusBadge status={rev.overallStatus} />
                      </div>
                      <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-500">
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
