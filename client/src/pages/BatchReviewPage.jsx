import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import {
  FileCheck2,
  Upload,
  Download,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Eye,
  FileSpreadsheet,
  CheckSquare,
  Square,
} from 'lucide-react';

export const BatchReviewPage = () => {
  const [tab, setTab] = useState('csv'); // 'csv' | 'select'
  const [file, setFile] = useState(null);
  const [csvPreview, setCsvPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const [currentBatch, setCurrentBatch] = useState(null);
  const [error, setError] = useState(null);

  // Multi-select existing listings
  const [availableListings, setAvailableListings] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [listingsLoading, setListingsLoading] = useState(false);

  // Recent batches history
  const [recentBatches, setRecentBatches] = useState([]);

  const fetchRecentBatches = async () => {
    try {
      const res = await api.get('/batches');
      if (res.data.success) {
        setRecentBatches(res.data.data);
      }
    } catch (e) {}
  };

  const fetchAvailableListings = async () => {
    setListingsLoading(true);
    try {
      const res = await api.get('/listings?limit=30&status=Pending Review');
      if (res.data.success) {
        setAvailableListings(res.data.data);
      }
    } catch (e) {
    } finally {
      setListingsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentBatches();
    fetchAvailableListings();
  }, []);

  const handleDownloadSampleCsv = () => {
    const csvContent =
      'title,description,category,price,currency,seller,tags\n' +
      '"Anker Wireless Earbuds Pro","Premium active noise cancellation earbuds with 40-hour playback and fast wireless charging.","Electronics",79.99,"USD","Anker Store","audio;wireless;earbuds"\n' +
      '"SUPER REPLICA WATCH DISCOUNTS 100% MIRACLE CURE","Fake rolex replica luxury clone watches, best in the world guaranteed millionaire lifestyle!!!","Clothing & Apparel",120.00,"USD","BargainSeller","watch;replica;miracle"\n' +
      '"Ergonomic Lumbar Office Cushion","High density memory foam cushion with breathable mesh cover for desk chairs and cars.","Home & Kitchen",34.50,"USD","ErgoLiving","office;cushion;chair"';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'sample_marketplace_listings.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError(null);
    setPreviewLoading(true);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await api.post('/batches/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.success) {
        setCsvPreview(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to parse CSV file.');
      setCsvPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleExecuteCsvImport = async () => {
    if (!csvPreview || !csvPreview.preview) return;

    const validItems = csvPreview.preview
      .filter((r) => r.valid)
      .map((r) => r.data);

    if (validItems.length === 0) {
      alert('No valid listing rows to import.');
      return;
    }

    setBatchLoading(true);
    setError(null);

    try {
      const res = await api.post('/batches/import', { items: validItems });
      if (res.data.success) {
        setCurrentBatch(res.data.data);
        setCsvPreview(null);
        setFile(null);
        fetchRecentBatches();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Batch import execution failed.');
    } finally {
      setBatchLoading(false);
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === availableListings.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(availableListings.map((l) => l._id));
    }
  };

  const handleExecuteSelectedBatch = async () => {
    if (selectedIds.length === 0) return;
    setBatchLoading(true);
    try {
      const res = await api.post('/batches', { listingIds: selectedIds });
      if (res.data.success) {
        setCurrentBatch(res.data.data);
        setSelectedIds([]);
        fetchRecentBatches();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to process batch.');
    } finally {
      setBatchLoading(false);
    }
  };

  const handleRetryFailed = async (batchId) => {
    try {
      const res = await api.post(`/batches/${batchId}/retry`);
      if (res.data.success) {
        setCurrentBatch(res.data.data);
        fetchRecentBatches();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Retry failed.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Batch Listing Review</h1>
          <p className="text-xs text-slate-500 mt-1">
            Analyze multiple catalog listings simultaneously via CSV file import or multi-selection.
          </p>
        </div>

        <button
          onClick={handleDownloadSampleCsv}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors"
        >
          <Download size={14} />
          <span>Download Sample CSV Template</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
          <AlertCircle size={15} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Mode Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-semibold text-slate-500">
        <button
          onClick={() => setTab('csv')}
          className={`pb-3 transition-colors ${
            tab === 'csv'
              ? 'border-b-2 border-blue-600 text-blue-600 font-bold'
              : 'hover:text-slate-800'
          }`}
        >
          CSV File Upload & Validation
        </button>
        <button
          onClick={() => setTab('select')}
          className={`pb-3 transition-colors ${
            tab === 'select'
              ? 'border-b-2 border-blue-600 text-blue-600 font-bold'
              : 'hover:text-slate-800'
          }`}
        >
          Select Existing Pending Listings ({availableListings.length})
        </button>
      </div>

      {/* TAB 1: CSV UPLOAD */}
      {tab === 'csv' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Upload size={16} className="text-blue-600" />
              <span>Upload CSV for Pre-Flight Validation</span>
            </h2>

            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center hover:border-blue-400 transition-colors bg-slate-50/50">
              <FileSpreadsheet size={36} className="text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">
                Click to browse or drag and drop your CSV catalog file here
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Required columns: <code>title</code>, <code>description</code>, <code>category</code>,{' '}
                <code>price</code>, <code>seller</code>. Max batch limit: 50 records.
              </p>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="mt-4 text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
              />
            </div>
          </div>

          {/* CSV Pre-Flight Validation Summary */}
          {previewLoading && (
            <div className="p-8 text-center text-xs text-slate-500">
              Validating CSV columns and row formats...
            </div>
          )}

          {csvPreview && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Pre-Import Validation Results</h3>
                  <div className="flex items-center gap-3 mt-1 text-xs">
                    <span className="text-slate-600">
                      Total Rows: <strong>{csvPreview.summary.totalRows}</strong>
                    </span>
                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                      Valid: {csvPreview.summary.validCount}
                    </span>
                    {csvPreview.summary.invalidCount > 0 && (
                      <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 font-semibold">
                        Errors: {csvPreview.summary.invalidCount}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleExecuteCsvImport}
                  disabled={batchLoading || csvPreview.summary.validCount === 0}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
                >
                  <FileCheck2 size={15} />
                  <span>
                    {batchLoading
                      ? 'Importing & Reviewing...'
                      : `Import & Review ${csvPreview.summary.validCount} Valid Listings`}
                  </span>
                </button>
              </div>

              {/* Preview Table */}
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">Row #</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Title</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Price</th>
                      <th className="py-2.5 px-3">Seller</th>
                      <th className="py-2.5 px-3">Validation Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {csvPreview.preview.map((row) => (
                      <tr
                        key={row.rowNumber}
                        className={row.valid ? 'hover:bg-slate-50' : 'bg-red-50/30'}
                      >
                        <td className="py-2.5 px-3 font-mono">{row.rowNumber}</td>
                        <td className="py-2.5 px-3">
                          {row.valid ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
                              <CheckCircle2 size={13} />
                              <span>Valid</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-rose-700 font-semibold text-[11px]">
                              <XCircle size={13} />
                              <span>Error</span>
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-900 max-w-xs truncate">
                          {row.data.title || <span className="italic text-slate-400">Empty</span>}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">{row.data.category}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          ${row.data.price?.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">{row.data.seller}</td>
                        <td className="py-2.5 px-3 text-[11px]">
                          {row.valid ? (
                            <span className="text-slate-400 italic">Ready for review</span>
                          ) : (
                            <span className="text-rose-600 font-medium">
                              {row.errors.join('; ')}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MULTI-SELECT EXISTING */}
      {tab === 'select' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Select Pending Listings to Process ({selectedIds.length} selected)
              </h2>
              <p className="text-xs text-slate-500">
                Bulk-evaluate pending catalog submissions against active policies in one operation.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSelectAll}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
              >
                {selectedIds.length === availableListings.length ? 'Deselect All' : 'Select All'}
              </button>

              <button
                onClick={handleExecuteSelectedBatch}
                disabled={batchLoading || selectedIds.length === 0}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm disabled:opacity-40"
              >
                {batchLoading ? 'Processing Batch...' : `Run Batch Review (${selectedIds.length})`}
              </button>
            </div>
          </div>

          {listingsLoading ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading listings...</div>
          ) : availableListings.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 italic">
              No pending listings currently available for batch review.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {availableListings.map((item) => {
                const isSelected = selectedIds.includes(item._id);
                return (
                  <div
                    key={item._id}
                    onClick={() => handleToggleSelect(item._id)}
                    className="flex items-center gap-3 py-3 px-2 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors"
                  >
                    <button type="button" className="text-blue-600 shrink-0">
                      {isSelected ? <CheckSquare size={18} /> : <Square size={18} className="text-slate-300" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 truncate">{item.title}</h4>
                      <p className="text-[11px] text-slate-500 truncate">
                        Seller: {item.seller} | Category: {item.category} | ${item.price?.toFixed(2)}
                      </p>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Live Batch Results Card */}
      {currentBatch && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Batch Processing Results</h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  {currentBatch.status.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Processed: <strong>{currentBatch.processedRecords}</strong> /{' '}
                {currentBatch.totalRecords} (Failed: <strong>{currentBatch.failedRecords}</strong>)
              </p>
            </div>

            {currentBatch.failedRecords > 0 && (
              <button
                onClick={() => handleRetryFailed(currentBatch._id)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold rounded-xl border border-amber-200 transition-colors"
              >
                <RefreshCw size={14} />
                <span>Retry {currentBatch.failedRecords} Failed Records</span>
              </button>
            )}
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {currentBatch.results.map((item, idx) => (
              <div key={idx} className="py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <span className="font-semibold text-slate-900 block truncate">{item.title}</span>
                  {item.error ? (
                    <span className="text-rose-600 text-[11px] block mt-0.5">{item.error}</span>
                  ) : (
                    <span className="text-slate-500 text-[11px] block mt-0.5">
                      Review completed • {item.findingsCount} findings identified
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {item.status === 'success' ? (
                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1 border border-emerald-200">
                      <CheckCircle2 size={12} />
                      <span>Reviewed</span>
                    </span>
                  ) : (
                    <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1 border border-rose-200">
                      <XCircle size={12} />
                      <span>Failed</span>
                    </span>
                  )}

                  {item.listingId && (
                    <Link
                      to={`/listings/${item.listingId}/review`}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                    >
                      View →
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
