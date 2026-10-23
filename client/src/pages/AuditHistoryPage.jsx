import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import {
  History,
  Shield,
  Filter,
  ChevronLeft,
  ChevronRight,
  User,
  Clock,
  Layers,
  FileCheck,
} from 'lucide-react';

export const AuditHistoryPage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  const fetchAuditEvents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (actionFilter) params.append('action', actionFilter);

      const res = await api.get(`/audit?${params.toString()}`);
      if (res.data.success) {
        setEvents(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch (e) {
      console.error('Failed to load audit history:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditEvents();
  }, [page, actionFilter]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Review & Audit History</h1>
          <p className="text-xs text-slate-500 mt-1">
            Immutable, append-only ledger tracking all listing lifecycle actions, quality reviews, and human approval decisions.
          </p>
        </div>

        {/* Action Filter */}
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-slate-400" />
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">All Action Types</option>
            <option value="LISTING_CREATED">Listing Created</option>
            <option value="LISTING_UPDATED">Listing Updated</option>
            <option value="REVIEW_GENERATED">Review Generated</option>
            <option value="REVISION_APPROVED">Revision Approved</option>
            <option value="REVISION_EDITED_AND_APPROVED">Revision Edited</option>
            <option value="REVISION_REJECTED">Revision Rejected</option>
            <option value="ALL_REVISIONS_APPROVED">All Revisions Approved</option>
            <option value="REVIEW_APPROVED">Review Marked Approved</option>
            <option value="REVIEW_REJECTED">Review Marked Rejected</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-6">Timestamp</th>
                <th className="py-3.5 px-4">Action</th>
                <th className="py-3.5 px-4">Listing</th>
                <th className="py-3.5 px-4">Actor</th>
                <th className="py-3.5 px-6">Change Snapshot</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    Loading audit trail...
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 italic">
                    No audit records recorded yet.
                  </td>
                </tr>
              ) : (
                events.map((event) => (
                  <tr key={event._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-6 whitespace-nowrap text-slate-500 font-mono">
                      {new Date(event.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        {event.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate">
                      {event.listingId?._id ? (
                        <Link
                          to={`/listings/${event.listingId._id}/review`}
                          className="font-medium text-slate-900 hover:text-blue-600 block truncate"
                        >
                          {event.listingId.title}
                        </Link>
                      ) : (
                        <span className="text-slate-400 font-mono">{String(event.listingId)}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <User size={13} className="text-slate-400" />
                        <span className="font-semibold text-slate-800">{event.actorName}</span>
                        <span className="text-[10px] text-slate-400 uppercase">
                          ({event.actorRole})
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-6 text-slate-600 max-w-md">
                      {event.before?.field && (
                        <div className="font-mono text-[11px] truncate">
                          <span className="text-slate-400">Field {event.before.field}:</span> "
                          <span className="text-rose-600">{event.before.value}</span>" → "
                          <span className="text-emerald-700 font-bold">{event.after.value}</span>"
                        </div>
                      )}
                      {event.metadata?.count !== undefined && (
                        <span className="text-slate-500">
                          Bulk processed {event.metadata.count} revisions
                        </span>
                      )}
                      {event.metadata?.rejectionReason && (
                        <span className="text-rose-600 italic">
                          "{event.metadata.rejectionReason}"
                        </span>
                      )}
                      {event.action === 'REVIEW_GENERATED' && (
                        <span className="text-slate-500">
                          Generated review ({event.after?.findingsCount || 0} findings) using{' '}
                          {event.metadata?.provider || 'engine'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Page {pagination.page || 1} of {pagination.totalPages || 1} ({pagination.total || 0}{' '}
            events)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages || 1, p + 1))}
              disabled={page >= pagination.totalPages}
              className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
