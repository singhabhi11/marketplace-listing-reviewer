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
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Review & Audit History</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Tamper-evident, immutable audit trail of all quality findings, human reviewer decisions, and field modifications.
          </p>
        </div>

        {/* Filter by Action */}
        <div className="flex items-center gap-2 text-xs">
          <Filter size={14} className="text-slate-400" />
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200"
          >
            <option value="">All Actions</option>
            <option value="REVIEW_GENERATED">Review Generated</option>
            <option value="REVISION_APPROVED">Revision Approved</option>
            <option value="REVISION_EDITED">Revision Edited</option>
            <option value="REVISION_REJECTED">Revision Rejected</option>
            <option value="OVERALL_APPROVED">Overall Approved</option>
            <option value="OVERALL_REJECTED">Overall Rejected</option>
          </select>
        </div>
      </div>

      {/* Events List */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden p-6">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading audit events...</div>
        ) : events.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 italic">
            No audit records found matching selected filter.
          </div>
        ) : (
          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
            {events.map((event) => (
              <div key={event._id} className="relative text-xs">
                <span className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-blue-600 border-2 border-white dark:border-slate-800 ring-2 ring-blue-100 dark:ring-blue-900"></span>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-[11px] font-mono">
                      {event.action}
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-700 dark:text-slate-300 font-semibold">{event.actorName}</span>
                    <span className="text-[11px] text-slate-400 uppercase">({event.actorRole})</span>
                  </div>

                  <span className="text-[11px] text-slate-400 font-mono">
                    {new Date(event.timestamp).toLocaleString()}
                  </span>
                </div>

                {event.listingId && (
                  <p className="mt-1 text-slate-600 dark:text-slate-300">
                    Listing:{' '}
                    <Link
                      to={`/listings/${event.listingId._id || event.listingId}`}
                      className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {event.listingId.title || event.listingId}
                    </Link>
                  </p>
                )}

                {/* Diff Data Snapshot */}
                {event.before && event.after && (
                  <div className="mt-2 text-[11px] bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-700 space-y-1 font-mono text-slate-700 dark:text-slate-300">
                    {event.before.field && (
                      <div>
                        Modified field: <strong>{event.before.field}</strong>
                        <div className="text-rose-600 dark:text-rose-400 line-through">
                          - {String(event.before.value).slice(0, 100)}
                        </div>
                        <div className="text-emerald-600 dark:text-emerald-400">
                          + {String(event.after.value).slice(0, 100)}
                        </div>
                      </div>
                    )}
                    {event.before.status && (
                      <div>
                        Status Transition: {event.before.status} → <strong>{event.after.status}</strong>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>
            Page {pagination.page || 1} of {pagination.totalPages || 1} ({pagination.total || 0} events)
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages || 1, p + 1))}
              disabled={page >= pagination.totalPages}
              className="p-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
