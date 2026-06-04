import React, { useCallback, useEffect, useState } from 'react';
import { BootcampResource, bootcampApi } from '../../lib/bootcamp';

interface Props {
  bootcampId: number;
}

const emptyForm = { title: '', description: '', type: 'link' as 'link' | 'text' | 'announcement', url: '', content: '' };

const ResourcesManager: React.FC<Props> = ({ bootcampId }) => {
  const [resources, setResources] = useState<BootcampResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await bootcampApi.resources(bootcampId);
      setResources(res.resources || []);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load resources.');
    } finally {
      setLoading(false);
    }
  }, [bootcampId]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    setError('');
    try {
      await bootcampApi.addResource({ bootcamp_id: bootcampId, ...form });
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add resource.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm('Remove this resource?')) return;
    try {
      await bootcampApi.removeResource(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove resource.');
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Post hub content</h3>
        <p className="mt-1 text-sm text-slate-500">Share links, notes, and announcements with enrolled participants.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Title"
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as typeof form.type })}
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="link">Link / Resource</option>
            <option value="text">Note</option>
            <option value="announcement">Announcement</option>
          </select>
        </div>
        <input
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Short description (optional)"
          className="mt-3 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {form.type === 'link' ? (
          <input
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            placeholder="https://… resource URL"
            className="mt-3 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        ) : (
          <textarea
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            placeholder="Write the note or announcement…"
            rows={3}
            className="mt-3 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        )}
        {error && <p className="mt-3 text-sm font-semibold text-rose-600">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="mt-4 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
        >
          {saving ? 'Posting…' : 'Post to hub'}
        </button>
      </form>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
          </div>
        ) : resources.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-slate-500">No hub content yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {resources.map((resource) => (
              <li key={resource.id} className="flex items-start justify-between gap-4 px-5 py-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      {resource.type}
                    </span>
                    <p className="font-semibold text-slate-900">{resource.title}</p>
                  </div>
                  {resource.description && <p className="mt-1 text-sm text-slate-600">{resource.description}</p>}
                  {resource.url && (
                    <a href={resource.url} target="_blank" rel="noreferrer" className="mt-1 block truncate text-sm text-indigo-600 hover:underline">
                      {resource.url}
                    </a>
                  )}
                  {resource.content && <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{resource.content}</p>}
                </div>
                <button
                  onClick={() => remove(resource.id)}
                  className="shrink-0 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-rose-100 hover:text-rose-700"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ResourcesManager;
