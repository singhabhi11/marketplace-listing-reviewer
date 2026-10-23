import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { SeverityBadge } from '../components/SeverityBadge';
import {
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  FileCheck,
  Search,
  Filter,
  Plus,
} from 'lucide-react';

export const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [recentListings, setRecentListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Quick filters for listings table
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, listingsRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/listings?limit=6&sortBy=createdAt&sortOrder=desc'),
      ]);

      if (statsRes.data.success) {
        setStats(statsRes.data.data);
      }
      if (listingsRes.data.success) {
        setRecentListings(listingsRes.data.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard statistics:', err);
      setError('Failed to load dashboard metrics. Check server connectivity.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const statCards = [
    {
      label: 'Total Listings',
      value: stats?.totalListings ?? 0,
      icon: Package,
      color: 'blue',
      desc: 'All marketplace listings in catalog',
    },
    {
      label: 'Pending Reviews',
      value: stats?.pendingReviews ?? 0,
      icon: Clock,
      color: 'amber',
      desc: 'Awaiting human or AI quality review',
    },
    {
      label: 'Changes Suggested',
      value: stats?.changesSuggestedListings ?? 0,
      icon: AlertTriangle,
      color: 'purple',
      desc: 'Review findings require reviewer action',
    },
    {
      label: 'Approved Listings',
      value: stats?.approvedListings ?? 0,
      icon: CheckCircle2,
      color: 'emerald',
      desc: 'Fully compliant with catalog policies',
    },
    {
      label: 'Rejected Listings',
      value: stats?.rejectedListings ?? 0,
      icon: XCircle,
      color: 'rose',
      desc: 'Violated critical marketplace policies',
    },
    {
      label: 'High/Critical Risk Items',
      value: stats?.criticalOrHighIssues ?? 0,
      icon: AlertTriangle,
      color: 'red',
      desc: 'Containing severe policy citations',
    },
  ];

  const getColorClasses = (color) => {
    switch (color) {
      case 'blue':
        return { bg: 'bg-blue-50', text: 'text-blue-700', iconBg: 'bg-blue-600 text-white' };
      case 'amber':
        return { bg: 'bg-amber-50', text: 'text-amber-700', iconBg: 'bg-amber-500 text-white' };
      case 'purple':
        return { bg: 'bg-purple-50', text: 'text-purple-700', iconBg: 'bg-purple-600 text-white' };
      case 'emerald':
        return { bg: 'bg-emerald-50', text: 'text-emerald-700', iconBg: 'bg-emerald-600 text-white' };
      case 'rose':
        return { bg: 'bg-rose-50', text: 'text-rose-700', iconBg: 'bg-rose-600 text-white' };
      case 'red':
        return { bg: 'bg-red-50', text: 'text-red-700', iconBg: 'bg-red-600 text-white' };
      default:
        return { bg: 'bg-slate-50', text: 'text-slate-700', iconBg: 'bg-slate-600 text-white' };
    }
  };

  const filteredListings = recentListings.filter((l) => {
    const matchesSearch =
      !searchTerm ||
      l.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.seller.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Review Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time quality monitoring, deterministic policy enforcement, and AI review workflow.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/batch"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-colors border border-slate-200"
          >
            <FileCheck size={16} />
            <span>Batch Review</span>
          </Link>
          <Link
            to="/listings/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
          >
            <Plus size={16} />
            <span>New Listing</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card, idx) => {
          const colors = getColorClasses(card.color);
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-start justify-between hover:border-slate-300 transition-all"
            >
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  {card.label}
                </span>
                <span className="text-3xl font-extrabold text-slate-900 mt-2 block tracking-tight">
                  {loading ? '...' : card.value}
                </span>
                <span className="text-xs text-slate-400 mt-1 block">{card.desc}</span>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colors.iconBg}`}>
                <Icon size={20} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Review Activity & Quick Action Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recent Listings & Review Status</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live catalog items with latest deterministic and AI policy findings
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-60">
              <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search title, seller..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Pending Review">Pending Review</option>
              <option value="Changes Suggested">Changes Suggested</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
            <Link
              to="/listings"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 whitespace-nowrap"
            >
              View All →
            </Link>
          </div>
        </div>

        {/* Listings Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-6">Product / Service</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Price</th>
                <th className="py-3 px-4">Seller</th>
                <th className="py-3 px-4">Review Status</th>
                <th className="py-3 px-4">Findings</th>
                <th className="py-3 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Loading recent listings...
                  </td>
                </tr>
              ) : filteredListings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No matching listings found.
                  </td>
                </tr>
              ) : (
                filteredListings.map((listing) => {
                  const findingsCount = listing.latestReviewId?.findings?.length || 0;
                  const hasCritical = listing.latestReviewId?.findings?.some(
                    (f) => f.severity === 'Critical'
                  );
                  const hasHigh = listing.latestReviewId?.findings?.some(
                    (f) => f.severity === 'High'
                  );

                  return (
                    <tr key={listing._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-6 font-medium text-slate-900 max-w-xs truncate">
                        <Link
                          to={`/listings/${listing._id}`}
                          className="hover:text-blue-600 transition-colors"
                        >
                          {listing.title}
                        </Link>
                      </td>
                      <td className="py-4 px-4 text-slate-600">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[11px]">
                          {listing.category}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-semibold text-slate-900">
                        ${listing.price?.toFixed(2)} {listing.currency}
                      </td>
                      <td className="py-4 px-4 text-slate-600">{listing.seller}</td>
                      <td className="py-4 px-4">
                        <StatusBadge status={listing.status} />
                      </td>
                      <td className="py-4 px-4">
                        {findingsCount > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-700">{findingsCount}</span>
                            {hasCritical && <SeverityBadge severity="Critical" size="sm" />}
                            {!hasCritical && hasHigh && <SeverityBadge severity="High" size="sm" />}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">None</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <Link
                          to={`/listings/${listing._id}/review`}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg border border-blue-200 transition-colors"
                        >
                          <span>Review</span>
                          <ArrowRight size={13} />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
