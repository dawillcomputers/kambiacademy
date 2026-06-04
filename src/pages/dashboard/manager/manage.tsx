import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Bootcamp, bootcampApi } from '../../../../lib/bootcamp';
import ResourcesManager from '../../../../components/bootcamp/ResourcesManager';
import CompetitionsManager from '../../../../components/bootcamp/CompetitionsManager';
import TeamManager from '../../../../components/bootcamp/TeamManager';

type Tab = 'content' | 'competitions' | 'team' | 'settings';

const ManagerManageBootcamp: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const bootcampId = Number(id);
  const [bootcamp, setBootcamp] = useState<Bootcamp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('content');

  // Settings form
  const [form, setForm] = useState({ title: '', tagline: '', description: '', cover_image_url: '', start_date: '', end_date: '' });
  const [saving, setSaving] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await bootcampApi.listManaged();
      const match = (res.bootcamps || []).find((b) => b.id === bootcampId) || null;
      setBootcamp(match);
      if (match) {
        setForm({
          title: match.title || '',
          tagline: match.tagline || '',
          description: match.description || '',
          cover_image_url: match.cover_image_url || '',
          start_date: match.start_date ? match.start_date.slice(0, 10) : '',
          end_date: match.end_date ? match.end_date.slice(0, 10) : '',
        });
      } else {
        setError('You do not manage this bootcamp.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load the bootcamp.');
    } finally {
      setLoading(false);
    }
  }, [bootcampId]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await bootcampApi.update({ id: bootcampId, ...form });
      setMessage('Bootcamp details saved.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const handleCoverUpload = async (file?: File | null) => {
    if (!file) return;
    setCoverUploading(true);
    setError('');
    try {
      const { url } = await bootcampApi.uploadCoverImage(file);
      setForm((prev) => ({ ...prev, cover_image_url: url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cover upload failed.');
    } finally {
      setCoverUploading(false);
    }
  };

  const toggleStatus = async () => {
    if (!bootcamp) return;
    const action = bootcamp.status === 'open' ? 'close' : 'open';
    if (action === 'close' && !confirm('Close this bootcamp? Registration will be disabled.')) return;
    try {
      await bootcampApi.update({ id: bootcampId, action });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
      </div>
    );
  }

  if (!bootcamp) {
    return (
      <div className="p-6 lg:p-8">
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <h2 className="text-xl font-semibold text-slate-900">Bootcamp unavailable</h2>
          <p className="mt-2 text-sm text-slate-500">{error || 'You do not manage this bootcamp.'}</p>
          <Link to="/manager" className="mt-6 inline-flex rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white">Back</Link>
        </div>
      </div>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'content', label: 'Hub content' },
    { key: 'competitions', label: 'Competitions' },
    { key: 'team', label: 'Facilitators & Mentors' },
    { key: 'settings', label: 'Settings' },
  ];

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/manager" className="text-sm text-slate-500 hover:text-slate-700">← My bootcamps</Link>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">{bootcamp.title}</h1>
          <p className="text-sm text-slate-500">{bootcamp.enrollment_count ?? 0} participants · <span className="capitalize">{bootcamp.status}</span></p>
        </div>
        <button
          onClick={toggleStatus}
          className={`rounded-xl px-4 py-2 text-sm font-semibold text-white transition ${bootcamp.status === 'open' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
        >
          {bootcamp.status === 'open' ? 'Close bootcamp' : 'Reopen bootcamp'}
        </button>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold transition ${tab === t.key ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'content' && <ResourcesManager bootcampId={bootcampId} />}
      {tab === 'competitions' && <CompetitionsManager bootcampId={bootcampId} />}
      {tab === 'team' && <TeamManager bootcampId={bootcampId} />}
      {tab === 'settings' && (
        <form onSubmit={saveSettings} className="max-w-2xl space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {message && <p className="text-sm font-semibold text-emerald-600">{message}</p>}
          {error && <p className="text-sm font-semibold text-rose-600">{error}</p>}
          <div>
            <label className="text-sm font-medium text-slate-700">Bootcamp name</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Tagline</label>
            <input
              value={form.tagline}
              onChange={(e) => setForm({ ...form, tagline: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={5}
              className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Cover image</label>
            <p className="text-xs text-slate-400">Upload a wide image, or paste a URL.</p>
            <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div
                className="h-20 w-36 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 bg-cover bg-center text-center text-xs leading-[5rem] text-slate-400"
                style={form.cover_image_url ? { backgroundImage: `url(${form.cover_image_url})` } : undefined}
              >
                {!form.cover_image_url && 'Preview'}
              </div>
              <div className="flex-1 space-y-2">
                <label className="inline-flex cursor-pointer items-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  {coverUploading ? 'Uploading…' : 'Upload image'}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleCoverUpload(e.target.files?.[0])} />
                </label>
                <input
                  value={form.cover_image_url}
                  onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })}
                  placeholder="…or paste an image URL"
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-700">Start date</label>
              <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">End date</label>
              <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <button type="submit" disabled={saving} className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
            {saving ? 'Saving…' : 'Save details'}
          </button>
        </form>
      )}
    </div>
  );
};

export default ManagerManageBootcamp;
