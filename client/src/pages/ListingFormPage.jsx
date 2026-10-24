import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { SUPPORTED_CURRENCIES } from '../utils/currency';
import {
  Package,
  ArrowLeft,
  Save,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Plus,
  Trash2,
  Tag,
  Coins,
  Send,
} from 'lucide-react';

export const ListingFormPage = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { user, isSeller } = useAuth();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState([]);
  const [attributes, setAttributes] = useState([{ key: '', value: '' }]);
  const [attributeErrors, setAttributeErrors] = useState({});
  const [existingListing, setExistingListing] = useState(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      title: '',
      description: '',
      category: '',
      price: '',
      currency: 'USD',
      seller: user?.name || '',
      status: 'Draft',
    },
  });

  const selectedCurrency = watch('currency') || 'USD';

  useEffect(() => {
    // Fetch active categories from settings
    api
      .get('/policies/settings')
      .then((res) => {
        if (res.data.success) {
          setCategories(res.data.data.supportedCategories || []);
        }
      })
      .catch((err) => console.warn('Could not fetch categories:', err));

    if (isEdit) {
      api
        .get(`/listings/${id}`)
        .then((res) => {
          if (res.data.success) {
            const item = res.data.data;
            setExistingListing(item);
            setValue('title', item.title || '');
            setValue('description', item.description || '');
            setValue('category', item.category || '');
            setValue('price', item.price !== undefined ? String(item.price) : '');
            setValue('currency', item.currency || 'USD');
            setValue('seller', item.seller || '');
            setTags(item.tags || []);

            // Normalize attributes from array or legacy map/object
            if (Array.isArray(item.attributes)) {
              const mapped = item.attributes.map((a) => ({
                key: a.key || '',
                value: a.value !== undefined ? String(a.value) : '',
              }));
              setAttributes(mapped.length > 0 ? mapped : [{ key: '', value: '' }]);
            } else if (item.attributes && typeof item.attributes === 'object') {
              const attrList = Object.entries(item.attributes).map(([k, v]) => ({
                key: k,
                value: v !== undefined && v !== null ? String(v) : '',
              }));
              setAttributes(attrList.length > 0 ? attrList : [{ key: '', value: '' }]);
            }
          }
        })
        .catch(() => setError('Failed to load listing for editing.'))
        .finally(() => setLoading(false));
    } else {
      if (user?.name) {
        setValue('seller', user.name);
      }
    }
  }, [id, isEdit, setValue, user]);

  const handleAddAttribute = () => {
    setAttributes([...attributes, { key: '', value: '' }]);
  };

  const handleRemoveAttribute = (index) => {
    const updated = attributes.filter((_, i) => i !== index);
    setAttributes(updated.length > 0 ? updated : [{ key: '', value: '' }]);
    validateAttributes(updated);
  };

  const handleAttributeChange = (index, field, val) => {
    const updated = [...attributes];
    let newKey = field === 'key' ? val : updated[index].key;
    let newVal = field === 'value' ? val : updated[index].value;

    // Auto-split if user pastes "Dimensions: 65 x 65 x 110 cm" into the key field
    if (field === 'key' && newKey.includes(':') && !newVal) {
      const colonIdx = newKey.indexOf(':');
      newVal = newKey.slice(colonIdx + 1).trim();
      newKey = newKey.slice(0, colonIdx).trim();
    }

    updated[index] = { key: newKey, value: newVal };
    setAttributes(updated);
    validateAttributes(updated);
  };

  // Real-time attribute validation
  const validateAttributes = (currentAttrs) => {
    const errs = {};
    const seen = new Map();

    currentAttrs.forEach((attr, idx) => {
      const k = (attr.key || '').trim();
      const v = (attr.value || '').trim();

      // Skip completely empty rows
      if (!k && !v) return;

      if (!k && v) {
        errs[idx] = 'Attribute key is missing.';
      } else if (k && !v) {
        errs[idx] = `Value is required for '${k}'.`;
      } else if (k && v) {
        const lower = k.toLowerCase();
        if (seen.has(lower)) {
          errs[idx] = `Duplicate attribute key '${k}'.`;
        } else {
          seen.set(lower, idx);
        }
      }
    });

    setAttributeErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleAddTag = (e) => {
    e.preventDefault();
    const cleanTag = tagInput.trim().replace(/^#/, '');
    if (cleanTag && !tags.includes(cleanTag)) {
      setTags([...tags, cleanTag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const onSubmit = async (data, submitStatus) => {
    setError(null);
    setSuccessMsg(null);

    // Validate attributes
    const isAttrsValid = validateAttributes(attributes);
    if (!isAttrsValid && submitStatus !== 'Draft') {
      setError('Please resolve the attribute errors before submitting.');
      return;
    }

    // Filter out completely blank attribute rows
    const cleanedAttributes = attributes
      .map((a) => ({ key: (a.key || '').trim(), value: (a.value || '').trim() }))
      .filter((a) => a.key || a.value);

    // For non-draft submissions, check if any filtered attribute has missing parts
    if (submitStatus !== 'Draft') {
      const hasIncomplete = cleanedAttributes.some((a) => !a.key || !a.value);
      if (hasIncomplete) {
        setError('Every attribute must have both a key and a value.');
        return;
      }
    }

    setSubmitting(true);

    const isResubmission =
      isEdit &&
      (existingListing?.status === 'Changes Requested' ||
        existingListing?.status === 'Changes Suggested') &&
      submitStatus === 'Pending Review';

    const payload = {
      title: data.title.trim(),
      description: data.description.trim(),
      category: data.category,
      price: data.price !== '' ? parseFloat(data.price) : 0,
      currency: data.currency || 'USD',
      seller: data.seller.trim(),
      tags,
      attributes: cleanedAttributes,
      status: submitStatus,
    };

    try {
      if (isEdit) {
        if (isResubmission) {
          // Update fields first, then call resubmit endpoint to increment revision & set Pending Review
          await api.patch(`/listings/${id}`, payload);
          await api.patch(`/listings/${id}/resubmit`);
          setSuccessMsg('Listing corrected and resubmitted for review!');
          setTimeout(() => navigate(`/listings/${id}`), 1200);
          return;
        } else {
          await api.patch(`/listings/${id}`, payload);
        }
      } else {
        const res = await api.post('/listings', payload);
        if (submitStatus === 'Pending Review') {
          navigate(`/listings/${res.data.data._id}`);
          return;
        }
      }
      navigate('/listings');
    } catch (err) {
      setError(
        err.response?.data?.message ||
          (err.response?.data?.errors
            ? err.response.data.errors.map((e) => e.message || e.description).join(', ')
            : 'Error saving listing.')
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-500 text-sm">Loading listing data...</div>;
  }

  const isChangesRequested =
    existingListing?.status === 'Changes Requested' ||
    existingListing?.status === 'Changes Suggested';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to={isEdit ? `/listings/${id}` : '/listings'}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors shadow-xs"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {isEdit ? 'Edit Marketplace Listing' : 'Create New Listing'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Specify complete details. Listings can be saved as drafts or submitted for quality review.
            </p>
          </div>
        </div>
      </div>

      {/* Reviewer Changes Requested Feedback Banner */}
      {isChangesRequested && (
        <div className="p-5 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-2xl space-y-2">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="text-purple-600 shrink-0 mt-0.5" size={18} />
            <div>
              <h3 className="text-sm font-bold text-purple-950 dark:text-purple-200">
                Action Required: Reviewer Requested Corrections
              </h3>
              <p className="text-xs text-purple-800 dark:text-purple-300 mt-1 whitespace-pre-wrap">
                {existingListing.changeRequestReason ||
                  existingListing.reviewDecisionNotes ||
                  'Please update the requested fields and resubmit for quality review.'}
              </p>
              {existingListing.changeRequestFields && existingListing.changeRequestFields.length > 0 && (
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="text-[11px] font-semibold text-purple-900 dark:text-purple-300">
                    Flagged Fields:
                  </span>
                  {existingListing.changeRequestFields.map((f) => (
                    <span
                      key={f}
                      className="px-2 py-0.5 rounded-md bg-purple-200/70 dark:bg-purple-900 text-purple-900 dark:text-purple-200 text-[10px] font-bold capitalize"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-start gap-2.5 text-xs text-emerald-800 dark:text-emerald-300">
          <CheckCircle size={16} className="shrink-0 mt-0.5 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      <form className="space-y-6">
        {/* Core Info Card */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-3 flex items-center gap-2">
            <Package size={16} className="text-blue-600" />
            <span>Primary Listing Information</span>
          </h2>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Sony WH-1000XM5 Wireless Headphones - Black"
              {...register('title', {
                required: 'Title is required',
                minLength: { value: 5, message: 'Title must be at least 5 characters' },
                maxLength: { value: 150, message: 'Title cannot exceed 150 characters' },
                validate: (v) => v.trim().length >= 5 || 'Title cannot be whitespace only',
              })}
              className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                errors.title
                  ? 'border-red-400 focus:border-red-500'
                  : 'border-slate-200 dark:border-slate-700 focus:border-blue-500'
              }`}
            />
            {errors.title && (
              <p className="text-xs text-rose-600 mt-1">{errors.title.message}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={5}
              placeholder="Provide a comprehensive product or service description including features, package contents, materials, and condition (minimum 20 characters)..."
              {...register('description', {
                required: 'Description is required',
                minLength: { value: 20, message: 'Description must be at least 20 characters' },
                validate: (v) => v.trim().length >= 20 || 'Description cannot be whitespace only',
              })}
              className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                errors.description
                  ? 'border-red-400 focus:border-red-500'
                  : 'border-slate-200 dark:border-slate-700 focus:border-blue-500'
              }`}
            />
            {errors.description && (
              <p className="text-xs text-rose-600 mt-1">{errors.description.message}</p>
            )}
          </div>

          {/* Category & Price with Currency & Seller Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Category <span className="text-rose-500">*</span>
              </label>
              <select
                {...register('category', {
                  required: 'Category is required',
                  validate: (v) =>
                    (v && v.toLowerCase() !== 'select category') || 'Please select a valid category',
                })}
                className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                  errors.category
                    ? 'border-red-400 focus:border-red-500'
                    : 'border-slate-200 dark:border-slate-700 focus:border-blue-500'
                }`}
              >
                <option value="">Select Category</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              {errors.category && (
                <p className="text-xs text-rose-600 mt-1">{errors.category.message}</p>
              )}
            </div>

            {/* Price & Currency Combined Group */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Price & Currency <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="29.99"
                  {...register('price', {
                    required: 'Price is required',
                    validate: {
                      positive: (v) => {
                        const n = parseFloat(v);
                        return (!isNaN(n) && isFinite(n) && n > 0) || 'Price must be greater than 0.';
                      },
                      decimals: (v) => {
                        const dec = (String(v).split('.')[1] || '').length;
                        return dec <= 2 || 'Maximum two decimal places.';
                      },
                    },
                  })}
                  className={`flex-1 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                    errors.price
                      ? 'border-red-400 focus:border-red-500'
                      : 'border-slate-200 dark:border-slate-700 focus:border-blue-500'
                  }`}
                />
                <select
                  {...register('currency')}
                  className="w-28 px-2.5 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              {errors.price && (
                <p className="text-xs text-rose-600 mt-1">{errors.price.message}</p>
              )}
            </div>

            {/* Seller */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Seller Name / Reference <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Apex Electronics Ltd"
                {...register('seller', {
                  required: 'Seller name is required',
                  validate: (v) => v.trim().length > 0 || 'Seller name cannot be whitespace only',
                })}
                className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                  errors.seller
                    ? 'border-red-400 focus:border-red-500'
                    : 'border-slate-200 dark:border-slate-700 focus:border-blue-500'
                }`}
              />
              {errors.seller && (
                <p className="text-xs text-rose-600 mt-1">{errors.seller.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic Key-Value Attributes Card */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Product Attributes (Key-Value)</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Specifications such as Brand, Model, Color, Dimensions, Weight, Material.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddAttribute}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-lg transition-colors border border-blue-200 dark:border-blue-800"
            >
              <Plus size={14} />
              <span>Add Attribute</span>
            </button>
          </div>

          <div className="space-y-3">
            {attributes.map((attr, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Key (e.g. Dimensions)"
                    value={attr.key}
                    onChange={(e) => handleAttributeChange(idx, 'key', e.target.value)}
                    className={`w-1/3 px-3 py-2 bg-slate-50 dark:bg-slate-900 border rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                      attributeErrors[idx]
                        ? 'border-red-400 focus:border-red-500'
                        : 'border-slate-200 dark:border-slate-700 focus:border-blue-500'
                    }`}
                  />
                  <input
                    type="text"
                    placeholder="Value (e.g. 65 x 65 x 110 cm)"
                    value={attr.value}
                    onChange={(e) => handleAttributeChange(idx, 'value', e.target.value)}
                    className={`flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                      attributeErrors[idx]
                        ? 'border-red-400 focus:border-red-500'
                        : 'border-slate-200 dark:border-slate-700 focus:border-blue-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveAttribute(idx)}
                    className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    title="Remove this attribute"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                {attributeErrors[idx] && (
                  <p className="text-[11px] text-rose-600 pl-1">{attributeErrors[idx]}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Tags Section */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-3 flex items-center gap-2">
            <Tag size={16} className="text-blue-600" />
            <span>Search Tags (Optional)</span>
          </h2>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Add keyword tag (e.g. bluetooth, wireless)"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddTag(e);
                }
              }}
              className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors border border-slate-200 dark:border-slate-600"
            >
              Add Tag
            </button>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs border border-blue-200 dark:border-blue-800 font-medium"
              >
                #{tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:text-blue-900 dark:hover:text-blue-100 ml-1 font-bold"
                >
                  &times;
                </button>
              </span>
            ))}
            {tags.length === 0 && (
              <span className="text-xs text-slate-400 italic">No tags added yet.</span>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Link
            to={isEdit ? `/listings/${id}` : '/listings'}
            className="px-5 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-xl transition-colors border border-slate-200 dark:border-slate-600"
          >
            Cancel
          </Link>

          <button
            type="button"
            disabled={submitting}
            onClick={handleSubmit((data) => onSubmit(data, 'Draft'))}
            className="px-5 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm font-medium rounded-xl border border-slate-300 dark:border-slate-600 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
          >
            <Save size={16} />
            <span>Save as Draft</span>
          </button>

          <button
            type="button"
            disabled={submitting}
            onClick={handleSubmit((data) => onSubmit(data, 'Pending Review'))}
            className={`px-6 py-2.5 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2 ${
              isChangesRequested
                ? 'bg-purple-600 hover:bg-purple-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isChangesRequested ? <Send size={16} /> : <CheckCircle size={16} />}
            <span>
              {submitting
                ? 'Submitting...'
                : isChangesRequested
                ? `Resubmit for Review (Rev ${(existingListing?.revision || 1) + 1})`
                : 'Submit for Review'}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
};
