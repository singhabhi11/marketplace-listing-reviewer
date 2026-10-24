import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import api from '../services/api';
import {
  Package,
  ArrowLeft,
  Save,
  CheckCircle,
  AlertCircle,
  Plus,
  Trash2,
  Tag,
} from 'lucide-react';

export const ListingFormPage = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState([]);
  const [attributes, setAttributes] = useState([{ key: '', value: '' }]);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      title: '',
      description: '',
      category: '',
      price: '',
      currency: 'USD',
      seller: '',
      status: 'Draft',
    },
  });

  useEffect(() => {
    // Fetch active categories
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
            setValue('title', item.title);
            setValue('description', item.description);
            setValue('category', item.category);
            setValue('price', item.price);
            setValue('currency', item.currency);
            setValue('seller', item.seller);
            setTags(item.tags || []);

            if (item.attributes && typeof item.attributes === 'object') {
              const attrList = Object.entries(item.attributes).map(([k, v]) => ({
                key: k,
                value: String(v),
              }));
              setAttributes(attrList.length > 0 ? attrList : [{ key: '', value: '' }]);
            }
          }
        })
        .catch(() => setError('Failed to load listing for editing.'))
        .finally(() => setLoading(false));
    }
  }, [id, isEdit, setValue]);

  const handleAddAttribute = () => {
    setAttributes([...attributes, { key: '', value: '' }]);
  };

  const handleRemoveAttribute = (index) => {
    setAttributes(attributes.filter((_, i) => i !== index));
  };

  const handleAttributeChange = (index, field, val) => {
    const updated = [...attributes];
    updated[index][field] = val;
    setAttributes(updated);
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
    setSubmitting(true);
    setError(null);

    const attributesObj = {};
    attributes.forEach((attr) => {
      if (attr.key.trim()) {
        attributesObj[attr.key.trim()] = attr.value.trim();
      }
    });

    const payload = {
      title: data.title.trim(),
      description: data.description.trim(),
      category: data.category,
      price: parseFloat(data.price),
      currency: data.currency || 'USD',
      seller: data.seller.trim(),
      tags,
      attributes: attributesObj,
      status: submitStatus,
    };

    try {
      if (isEdit) {
        await api.patch(`/listings/${id}`, payload);
      } else {
        const res = await api.post('/listings', payload);
        if (submitStatus === 'Pending Review') {
          // Immediately trigger review workspace
          navigate(`/listings/${res.data.data._id}/review`);
          return;
        }
      }
      navigate('/listings');
    } catch (err) {
      setError(
        err.response?.data?.message ||
          (err.response?.data?.errors
            ? err.response.data.errors.map((e) => e.message).join(', ')
            : 'Error saving listing.')
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-500 text-sm">Loading listing data...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/listings"
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

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
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
                minLength: { value: 10, message: 'Title should be at least 10 characters' },
                maxLength: { value: 200, message: 'Title cannot exceed 200 characters' },
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
              placeholder="Provide a comprehensive product or service description including features, package contents, materials, and condition..."
              {...register('description', {
                required: 'Description is required',
                minLength: { value: 30, message: 'Description must be at least 30 characters' },
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

          {/* Category & Price & Seller Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Category <span className="text-rose-500">*</span>
              </label>
              <select
                {...register('category', { required: 'Category is required' })}
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

            {/* Price */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Price (USD) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="29.99"
                {...register('price', {
                  required: 'Price is required',
                  min: { value: 0.01, message: 'Price must be greater than 0' },
                })}
                className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                  errors.price
                    ? 'border-red-400 focus:border-red-500'
                    : 'border-slate-200 dark:border-slate-700 focus:border-blue-500'
                }`}
              />
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
                {...register('seller', { required: 'Seller is required' })}
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

          <div className="space-y-2">
            {attributes.map((attr, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Key (e.g. Color)"
                  value={attr.key}
                  onChange={(e) => handleAttributeChange(idx, 'key', e.target.value)}
                  className="w-1/3 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <input
                  type="text"
                  placeholder="Value (e.g. Midnight Black)"
                  value={attr.value}
                  onChange={(e) => handleAttributeChange(idx, 'value', e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveAttribute(idx)}
                  className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Optional Tags Card */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Tag size={16} className="text-blue-600" />
            <span>Search & Discovery Tags (Optional)</span>
          </h2>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Add a search tag and press Add (e.g. bluetooth, wireless)"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag(e))}
              className="flex-1 px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-600 transition-colors"
            >
              Add Tag
            </button>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-medium border border-blue-200 dark:border-blue-800"
              >
                #{tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:text-blue-900 dark:hover:text-blue-100 ml-1"
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
            to="/listings"
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
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
          >
            <CheckCircle size={16} />
            <span>{submitting ? 'Submitting...' : 'Submit for Review'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
