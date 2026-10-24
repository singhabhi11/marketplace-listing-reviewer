import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
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
  UserCheck,
  Sparkles,
  Layers,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

export const DashboardPage = () => {
  const { user, isReviewer, isSeller, isAdmin } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentListings, setRecentListings] = useState([]);
  const [assignedListings, setAssignedListings] = useState([]);
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
        api.get('/listings?limit=8&sortBy=createdAt&sortOrder=desc'),
      ]);

      if (statsRes.data.success) {
        setStats(statsRes.data.data);
      }
      if (listingsRes.data.success) {
        setRecentListings(listingsRes.data.data);
      }

      // If reviewer or admin, also fetch tasks assigned to current user
      if (user && (user.role === 'reviewer' || user.role === 'administrator')) {
        try {
          const assignedRes = await api.get('/listings?assignedToMe=true&limit=5');
          if (assignedRes.data.success) {
            setAssignedListings(assignedRes.data.data);
          }
        } catch (e) {
          // Fallback filtering from recent listings
          const myAssigned = (listingsRes.data.data || []).filter(
            (l) =>
              (l.assignedTo?._id === user._id || l.assignedTo === user._id) &&
              ['Pending Review', 'Under Review'].includes(l.status)
          );
          setAssignedListings(myAssigned);
        }
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
  }, [user]);

  const statCards = [
    {
      label: 'Total Listings',
      value: stats?.totalListings ?? 0,
      icon: Package,
      color: 'blue',
      desc: isSeller ? 'Your submitted listings' : 'All marketplace listings in catalog',
    },
    {
      label: 'Pending Reviews',
      value: stats?.pendingReviews ?? 0,
      icon: Clock,
      color: 'amber',
      desc: 'Awaiting quality audit review',
    },
    {
      label: 'Changes Requested',
      value: stats?.changesSuggestedListings ?? 0,
      icon: AlertTriangle,
      color: 'purple',
      desc: 'Findings require author revisions',
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
      desc: 'Violated critical safety policies',
    },
    {
      label: 'High/Critical Risk',
      value: stats?.criticalOrHighIssues ?? 0,
      icon: AlertTriangle,
      color: 'red',
      desc: 'Containing severe policy citations',
    },
  ];

  const getColorClasses = (color) => {
    switch (color) {
      case 'blue':
        return { iconBg: 'bg-blue-600 text-white' };
      case 'amber':
        return { iconBg: 'bg-amber-500 text-white' };
      case 'purple':
        return { iconBg: 'bg-purple-600 text-white' };
      case 'emerald':
        return { iconBg: 'bg-emerald-600 text-white' };
      case 'rose':
        return { iconBg: 'bg-rose-600 text-white' };
      case 'red':
        return { iconBg: 'bg-red-600 text-white' };
      default:
        return { iconBg: 'bg-slate-600 text-white' };
    }
  };

  // Recharts Data Prep
  const pieColors = {
    Approved: '#10b981',
    'Changes Requested': '#a855f7',
    Rejected: '#f43f5e',
    'Pending Review': '#f59e0b',
    Draft: '#94a3b8',
  };

  const statusDistributionData = [
    { name: 'Approved', value: stats?.approvedListings ?? 0, fill: pieColors.Approved },
    {
      name: 'Changes Requested',
      value: stats?.changesSuggestedListings ?? 0,
      fill: pieColors['Changes Requested'],
    },
    { name: 'Rejected', value: stats?.rejectedListings ?? 0, fill: pieColors.Rejected },
    { name: 'Pending Review', value: stats?.pendingReviews ?? 0, fill: pieColors['Pending Review'] },
  ].filter((item) => item.value > 0);

  const severityData = [
    { name: 'Critical', count: stats?.severityBreakdown?.critical ?? 0, fill: '#ef4444' },
    { name: 'High', count: stats?.severityBreakdown?.high ?? 0, fill: '#f97316' },
    { name: 'Medium', count: stats?.severityBreakdown?.medium ?? 0, fill: '#eab308' },
    { name: 'Low', count: stats?.severityBreakdown?.low ?? 0, fill: '#3b82f6' },
  ];

  const filteredListings = recentListings.filter((l) => {
    const matchesSearch =
      !searchTerm ||
      l.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.seller && l.seller.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = !statusFilter || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {isSeller ? 'Seller Catalog Dashboard' : 'Review Workspace & Quality Dashboard'}
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isSeller
              ? 'Track the approval and policy compliance status of your marketplace product listings.'
              : 'Real-time catalog monitoring, deterministic policy enforcement, and AI-assisted audits.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isSeller && (
            <Link
              to="/batch"
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition-colors border border-slate-200 dark:border-slate-600"
            >
              <FileCheck size={15} />
              <span>Batch Review</span>
            </Link>
          )}
          <Link
            to="/listings/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs"
          >
            <Plus size={15} />
            <span>New Listing</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-400">
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
              className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-start justify-between hover:border-slate-300 dark:hover:border-slate-600 transition-all"
            >
              <div>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  {card.label}
                </span>
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2 block tracking-tight">
                  {loading ? '...' : card.value}
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500 mt-1 block">
                  {card.desc}
                </span>
              </div>
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colors.iconBg}`}
              >
                <Icon size={20} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Visual Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Breakdown Donut Chart */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Catalog Status Distribution
              </h2>
              <p className="text-[11px] text-slate-400">
                Proportion of listings by current compliance state
              </p>
            </div>
          </div>

          <div className="h-56 w-full flex items-center justify-center">
            {statusDistributionData.length === 0 ? (
              <p className="text-xs text-slate-400">No listing data available to plot.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statusDistributionData.map((entry, index) => (
                      <Cell key={`cell-dash-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={30}
                    iconSize={10}
                    wrapperStyle={{ fontSize: '11px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Issues by Severity Bar Chart */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Policy Violations by Severity
              </h2>
              <p className="text-[11px] text-slate-400">
                Issue classification requiring reviewer remediation
              </p>
            </div>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={severityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {severityData.map((entry, index) => (
                    <Cell key={`cell-sev-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* My Assigned Reviews (For Reviewers & Admins) */}
      {!isSeller && assignedListings.length > 0 && (
        <div className="bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <UserCheck size={18} className="text-blue-600 dark:text-blue-400" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                My Assigned Review Tasks
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-blue-200 dark:bg-blue-900 text-blue-800 dark:text-blue-300 text-[11px] font-bold">
                {assignedListings.length}
              </span>
            </div>
            <Link
              to="/listings"
              className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline"
            >
              Catalog View →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {assignedListings.map((item) => (
              <div
                key={item._id}
                className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-blue-100 dark:border-slate-700 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium">
                      {item.category}
                    </span>
                    <StatusBadge status={item.status} />
                  </div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1 mb-1">
                    {item.title}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Seller: <span className="font-semibold">{item.seller}</span>
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    ${item.price?.toFixed(2)}
                  </span>
                  <Link
                    to={`/listings/${item._id}/review`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                  >
                    <span>Audit Now</span>
                    <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Review Activity & Quick Action Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Recent Listings & Quality Audit Status
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live catalog items with latest deterministic and AI policy citations
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
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Pending Review">Pending Review</option>
              <option value="Changes Suggested">Changes Suggested</option>
              <option value="Changes Requested">Changes Requested</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
            <Link
              to="/listings"
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
            >
              View All →
            </Link>
          </div>
        </div>

        {/* Listings Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/75 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
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
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
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
                    <tr
                      key={listing._id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors"
                    >
                      <td className="py-4 px-6 font-medium text-slate-900 dark:text-white max-w-xs truncate">
                        <Link
                          to={`/listings/${listing._id}`}
                          className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        >
                          {listing.title}
                        </Link>
                      </td>
                      <td className="py-4 px-4 text-slate-600 dark:text-slate-300">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-[11px]">
                          {listing.category}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-semibold text-slate-900 dark:text-white">
                        ${listing.price?.toFixed(2)} {listing.currency}
                      </td>
                      <td className="py-4 px-4 text-slate-600 dark:text-slate-300">
                        {listing.seller}
                      </td>
                      <td className="py-4 px-4">
                        <StatusBadge status={listing.status} />
                      </td>
                      <td className="py-4 px-4">
                        {findingsCount > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-700 dark:text-slate-200">
                              {findingsCount}
                            </span>
                            {hasCritical && <SeverityBadge severity="Critical" size="sm" />}
                            {!hasCritical && hasHigh && <SeverityBadge severity="High" size="sm" />}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">None</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right">
                        {isSeller ? (
                          <Link
                            to={`/listings/${listing._id}`}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-600 transition-colors"
                          >
                            <span>View</span>
                            <ArrowRight size={13} />
                          </Link>
                        ) : (
                          <Link
                            to={`/listings/${listing._id}/review`}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 dark:bg-blue-950 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded-lg border border-blue-200 dark:border-blue-800 transition-colors"
                          >
                            <span>Review</span>
                            <ArrowRight size={13} />
                          </Link>
                        )}
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
