import React, { useCallback, useEffect, useState } from 'react';
import { PopupCampaignItem, bootcampApi, popupApi } from '../../../../lib/bootcamp';

const emptyForm = {
  title: '',
  media_type: 'image' as 'image' | 'video' | 'html',
  media_url: '',
  html: '',
  link_url: '',
  cta_label: 'Learn more',
  frequency: 'once' as 'once' | 'daily' | 'always',
  audience: 'all' as 'all' | 'bootcamp',
  bootcamp_id: '' as number | '',
  starts_at: '',
  ends_at: '',
};

const SuperAdminCampaigns: React.FC = () => {
  const [campaigns, setCampaigns] = useState<PopupCampaignItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await popupApi.listAdmin();
      setCampaigns(res.campaigns || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load campaigns.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const upload = async (file?: File | null) => {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const { url } = await bootcampApi.uploadCoverImage(file);
      setForm((prev) => ({ ...prev, media_url: url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await popupApi.create({
        ...form,
        bootcamp_id: form.audience === 'bootcamp' && form.bootcamp_id !== '' ? Number(form.bootcamp_id) : null,
        starts_at: form.starts_at || null,
        ends_at: form.ends_at || null,
      });
      setMessage('Campaign created.');
      setForm({ ...emptyForm });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create campaign.');
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (c: PopupCampaignItem) => {
    try { await popupApi.toggle(c.id, !c.active); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to update.'); }
  };

  const remove = async (c: PopupCampaignItem) => {
    if (!confirm(`Delete campaign "${c.title || c.id}"?`)) return;
    try { await popupApi.remove(c.id); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to delete.'); }
  };

  const input = 'w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500';

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Popup Campaigns</h1>
        <p className="mt-1 text-sm text-slate-500">Promote competitions, scholarships, and new bootcamps with a site-wide popup.</p>
      </div>

      {message && <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">{message}</p>}
      {error && <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700">{error}</p>}

      <form onSubmit={create} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2">
        <h3 className="sm:col-span-2 text-sm font-bold text-slate-900">New campaign</h3>
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-slate-600">Title</label>
          <input className={input} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="🎉 New Bootcamp Now Open!" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600">Media type</label>
          <select className={input} value={form.media_type} onChange={(e) => setForm({ ...form, media_type: e.target.value as typeof form.media_type })}>
            <option value="image">Image</option>
            <option value="video">Video (URL)</option>
            <option value="html">HTML banner</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600">Show frequency</label>
          <select className={input} value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value as typeof form.frequency })}>
            <option value="once">Once per visitor</option>
            <option value="daily">Once per day</option>
            <option value="always">Every visit</option>
          </select>
        </div>
        {form.media_type === 'html' ? (
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold text-slate-600">HTML</label>
            <textarea className={input} rows={4} value={form.html} onChange={(e) => setForm({ ...form, html: e.target.value })} placeholder="<h2>Hello</h2>" />
          </div>
        ) : (
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold text-slate-600">{form.media_type === 'video' ? 'Video URL' : 'Image'}</label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input className={input} value={form.media_url} onChange={(e) => setForm({ ...form, media_url: e.target.value })} placeholder={form.media_type === 'video' ? 'https://… .mp4' : 'Paste an image URL or upload'} />
              {form.media_type === 'image' && (
                <label className="inline-flex shrink-0 cursor-pointer items-center rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                  {uploading ? 'Uploading…' : 'Upload'}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
                </label>
              )}
            </div>
          </div>
        )}
        <div>
          <label className="text-xs font-semibold text-slate-600">Link URL (CTA)</label>
          <input className={input} value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} placeholder="/bootcamps" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600">CTA label</label>
          <input className={input} value={form.cta_label} onChange={(e) => setForm({ ...form, cta_label: e.target.value })} />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600">Start (optional)</label>
          <input type="date" className={input} value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600">End (optional)</label>
          <input type="date" className={input} value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <button type="submit" disabled={saving} className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
            {saving ? 'Creating…' : 'Launch campaign'}
          </button>
        </div>
      </form>

      {loading ? (
        <div className="flex justify-center py-10"><div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" /></div>
      ) : campaigns.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">No campaigns yet.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((c) => (
            <div key={c.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {c.media_type === 'image' && c.media_url && <img src={c.media_url} alt={c.title} className="h-28 w-full object-cover" />}
              <div className="space-y-2 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-slate-900">{c.title || '(untitled)'}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${c.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>{c.active ? 'Live' : 'Off'}</span>
                </div>
                <p className="text-xs text-slate-500">{c.media_type} · {c.frequency} · {c.audience}</p>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => toggle(c)} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200">{c.active ? 'Pause' : 'Activate'}</button>
                  <button onClick={() => remove(c)} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-rose-100 hover:text-rose-700">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SuperAdminCampaigns;
