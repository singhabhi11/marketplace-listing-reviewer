import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { SeverityBadge } from '../components/SeverityBadge';
import { useAuth } from '../context/AuthContext';
import {
  Package,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  Edit2,
  Trash2,
  Eye,
  FileCheck2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';

export const ListingsPage = () => {
  const { user, isAdmin } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [severity, setSeverity] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  const [categoriesList, setCategoriesList] = useState([]);

  useEffect(() => {
    // Fetch categories from settings
    api.get('/policies/settings').then((res) => {
      if (res.data.success) {
        setCategoriesList(res.data.data.supportedCategories || []);
      }
    }).catch(() => {});
  }, []);

  const fetchListings = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        limit: 10,
        sortBy,
        sortOrder,
      });
      if (search) params.append('search', search);
      if (category) params.append('category', category);
      if (status) params.append('status', status);
      if (severity) params.append('severity', severity);

      const res = await api.get(`/listings?${params.toString()}`);
      if (res.data.success) {
        setListings(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      setError('Failed to fetch listings. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, [page, category, status, severity, sortBy, sortOrder]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchListings();
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete listing: "${title}"?`)) return;
    try {
      await api.delete(`/listings/${id}`);
      fetchListings();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete listing.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Listings Catalog</h1>
          <p className="text-xs text-slate-500 mt-1">
            Browse, manage, filter, and review marketplace product and service listings.
          </p>
        </div>
        <Link
          to="/listings/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
        >
          <Plus size={16} />
          <span>Create Listing</span>
        </Link>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by title, seller, or keywords..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">All Categories</option>
            {categoriesList.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Pending Review">Pending Review</option>
            <option value="Changes Suggested">Changes Suggested</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>

          {/* Severity Filter */}
          <select
            value={severity}
            onChange={(e) => {
              setSeverity(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">All Severities</option>
            <option value="critical">Critical Issues</option>
            <option value="high">High Issues</option>
            <option value="medium">Medium Issues</option>
            <option value="low">Low Issues</option>
          </select>

          {/* Sort By */}
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              setSortBy(field);
              setSortOrder(order);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="createdAt-desc">Newest First</option>
            <option value="createdAt-asc">Oldest First</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="title-asc">Title: A-Z</option>
          </select>
        </div>
      </div>

      {/* Listings Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-6">Product Title</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Price</th>
                <th className="py-3.5 px-4">Seller</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Findings</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Loading listings...
                  </td>
                </tr>
              ) : listings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No listings match the current filters.
                  </td>
                </tr>
              ) : (
                listings.map((item) => {
                  const review = item.latestReviewId;
                  const findingsCount = review?.findings?.length || 0;
                  const hasCritical = review?.findings?.some((f) => f.severity === 'Critical');
                  const hasHigh = review?.findings?.some((f) => f.severity === 'High');

                  return (
                    <tr key={item._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-6 font-medium text-slate-900 max-w-sm">
                        <Link
                          to={`/listings/${item._id}`}
                          className="hover:text-blue-600 transition-colors block font-semibold truncate"
                        >
                          {item.title}
                        </Link>
                        <span className="text-[11px] text-slate-400 block truncate">
                          {item.description}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-slate-600">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[11px]">
                          {item.category}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-semibold text-slate-900 whitespace-nowrap">
                        ${item.price?.toFixed(2)} {item.currency}
                      </td>
                      <td className="py-4 px-4 text-slate-600">{item.seller}</td>
                      <td className="py-4 px-4">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        {findingsCount > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-700">{findingsCount}</span>
                            {hasCritical && <SeverityBadge severity="Critical" size="sm" />}
                            {!hasCritical && hasHigh && <SeverityBadge severity="High" size="sm" />}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">0 issues</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            to={`/listings/${item._id}/review`}
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Open AI Review Workspace"
                          >
                            <FileCheck2 size={16} />
                          </Link>
                          <Link
                            to={`/listings/${item._id}`}
                            className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                            title="View Listing Details"
                          >
                            <Eye size={16} />
                          </Link>
                          <Link
                            to={`/listings/${item._id}/edit`}
                            className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit Listing"
                          >
                            <Edit2 size={16} />
                          </Link>
                          {(isAdmin || item.createdBy?._id === user?.id) && (
                            <button
                              onClick={() => handleDelete(item._id, item.title)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete Listing"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Showing Page {pagination.page || 1} of {pagination.totalPages || 1} ({pagination.total || 0} listings)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages || 1, p + 1))}
              disabled={page >= pagination.totalPages}
              className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
