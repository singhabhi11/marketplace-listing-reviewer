import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Modal } from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import {
  BookOpen,
  Plus,
  Edit2,
  FileText,
  Shield,
  CheckCircle2,
  XCircle,
  AlertCircle,
  HelpCircle,
  Layers,
} from 'lucide-react';

export const PolicyLibraryPage = () => {
  const { isAdmin } = useAuth();
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // New Document Modal
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [newDoc, setNewDoc] = useState({
    name: '',
    documentType: 'marketplace_policy',
    version: '1.0.0',
    source: 'Marketplace Operations Standard',
  });

  // New Section Modal
  const [sectionModalOpen, setSectionModalOpen] = useState(false);
  const [targetDocId, setTargetDocId] = useState(null);
  const [newSection, setNewSection] = useState({
    sectionId: '',
    title: '',
    category: 'General',
    content: '',
  });

  const fetchPolicies = async () => {
    setLoading(true);
    try {
      const res = await api.get('/policies');
      if (res.data.success) {
        setPolicies(res.data.data);
      }
    } catch (err) {
      setError('Failed to fetch policies.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const handleCreateDocument = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/policies', newDoc);
      if (res.data.success) {
        setDocModalOpen(false);
        setNewDoc({
          name: '',
          documentType: 'marketplace_policy',
          version: '1.0.0',
          source: 'Marketplace Operations Standard',
        });
        fetchPolicies();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create policy document.');
    }
  };

  const openAddSectionModal = (docId) => {
    setTargetDocId(docId);
    setNewSection({
      sectionId: '',
      title: '',
      category: 'General',
      content: '',
    });
    setSectionModalOpen(true);
  };

  const handleCreateSection = async (e) => {
    e.preventDefault();
    if (!targetDocId) return;

    try {
      const res = await api.post(`/policies/${targetDocId}/sections`, newSection);
      if (res.data.success) {
        setSectionModalOpen(false);
        fetchPolicies();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add policy section.');
    }
  };

  const handleToggleSectionActive = async (sectionId, currentActive) => {
    if (!isAdmin) return;
    try {
      await api.patch(`/policies/sections/${sectionId}`, { active: !currentActive });
      fetchPolicies();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update section state.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Policy & Guidelines Library
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-semibold">
              RAG Grounding Corpus
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Authoritative marketplace rules, brand tone standards, and compliance sections used for citation verification.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setDocModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm"
          >
            <Plus size={16} />
            <span>Add Policy Document</span>
          </button>
        )}
      </div>

      {/* Clearly labeled Sample Policy Notice */}
      <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-start gap-3 text-xs text-amber-900 dark:text-amber-300">
        <HelpCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Sample Policy Guidance Notice:</span> Pre-loaded documents are clearly labeled sample policies designed for compliance testing and simulation. They do not constitute actual legal marketplace terms and can be modified by administrators at any time.
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs">Loading policy library...</div>
      ) : (
        <div className="space-y-6">
          {policies.map((doc) => (
            <div
              key={doc._id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden"
            >
              {/* Doc Header */}
              <div className="p-6 bg-slate-50/75 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <BookOpen size={18} className="text-blue-600" />
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">{doc.name}</h2>
                    <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-mono rounded">
                      v{doc.version}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Type: <strong className="text-slate-700 dark:text-slate-300">{doc.documentType}</strong> | Source:{' '}
                    <span className="italic">{doc.source}</span>
                  </p>
                </div>

                {isAdmin && (
                  <button
                    onClick={() => openAddSectionModal(doc._id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 transition-colors shadow-sm"
                  >
                    <Plus size={14} />
                    <span>Add Section</span>
                  </button>
                )}
              </div>

              {/* Sections Table / Cards */}
              <div className="p-6 divide-y divide-slate-100 dark:divide-slate-700 space-y-4">
                {doc.sections?.length === 0 ? (
                  <div className="py-4 text-center text-xs text-slate-400 italic">
                    No sections added to this document yet.
                  </div>
                ) : (
                  doc.sections?.map((sec) => (
                    <div key={sec._id} className="pt-4 first:pt-0 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded">
                            {sec.sectionId}
                          </span>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white">{sec.title}</h3>
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            Category: {sec.category}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {sec.active ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                              <CheckCircle2 size={12} />
                              <span>Active</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-600">
                              <XCircle size={12} />
                              <span>Inactive</span>
                            </span>
                          )}

                          {isAdmin && (
                            <button
                              onClick={() => handleToggleSectionActive(sec.sectionId, sec.active)}
                              className="text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 underline ml-2"
                            >
                              {sec.active ? 'Deactivate' : 'Activate'}
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 font-sans leading-relaxed bg-slate-50/50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                        {sec.content}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Document Modal */}
      <Modal isOpen={docModalOpen} onClose={() => setDocModalOpen(false)} title="New Policy Document">
        <form onSubmit={handleCreateDocument} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Document Name</label>
            <input
              type="text"
              required
              value={newDoc.name}
              onChange={(e) => setNewDoc({ ...newDoc, name: e.target.value })}
              placeholder="e.g. Prohibited Goods & Hazardous Materials Standard"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Document Type</label>
            <select
              value={newDoc.documentType}
              onChange={(e) => setNewDoc({ ...newDoc, documentType: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
            >
              <option value="marketplace_policy">Marketplace Policy</option>
              <option value="brand_guideline">Brand Guideline</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Version</label>
            <input
              type="text"
              required
              value={newDoc.version}
              onChange={(e) => setNewDoc({ ...newDoc, version: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Source / Attribution</label>
            <input
              type="text"
              value={newDoc.source}
              onChange={(e) => setNewDoc({ ...newDoc, source: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setDocModalOpen(false)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 shadow-sm"
            >
              Create Document
            </button>
          </div>
        </form>
      </Modal>

      {/* Create Section Modal */}
      <Modal isOpen={sectionModalOpen} onClose={() => setSectionModalOpen(false)} title="Add Policy Section">
        <form onSubmit={handleCreateSection} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Section ID (e.g. POL-PROH-002)
            </label>
            <input
              type="text"
              required
              placeholder="POL-PROH-002"
              value={newSection.sectionId}
              onChange={(e) => setNewSection({ ...newSection, sectionId: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg uppercase font-mono text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Section Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Hazardous Materials and Flammables"
              value={newSection.title}
              onChange={(e) => setNewSection({ ...newSection, title: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Category</label>
            <input
              type="text"
              required
              placeholder="e.g. Prohibited Items / Electronics"
              value={newSection.category}
              onChange={(e) => setNewSection({ ...newSection, category: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Full Policy Content</label>
            <textarea
              rows={5}
              required
              placeholder="Write the full policy clause, prohibited language, and requirements..."
              value={newSection.content}
              onChange={(e) => setNewSection({ ...newSection, content: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-xs text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setSectionModalOpen(false)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 shadow-sm"
            >
              Save Section
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
