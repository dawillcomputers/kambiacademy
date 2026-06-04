import React, { useCallback, useEffect, useState } from 'react';
import { Bootcamp, BootcampInput, bootcampApi } from '../../../../lib/bootcamp';
import CompetitionsManager from '../../../../components/bootcamp/CompetitionsManager';
import ResourcesManager from '../../../../components/bootcamp/ResourcesManager';

const blankCreate: BootcampInput = {
  title: '',
  tagline: '',
  description: '',
  cover_image_url: '',
  category: 'Fintech',
  price: 0,
  start_date: '',
  end_date: '',
  status: 'open',
  managerEmail: '',
};

const statusBadge = (status: string) => {
  if (status === 'open') return 'bg-emerald-100 text-emerald-700';
  if (status === 'closed') return 'bg-slate-200 text-slate-600';
  return 'bg-amber-100 text-amber-700';
};

const SuperAdminBootcamps: React.FC = () => {
  const [bootcamps, setBootcamps] = useState<Bootcamp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<BootcampInput>(blankCreate);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [managerEmails, setManagerEmails] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await bootcampApi.listAdmin();
      setBootcamps(res.bootcamps || []);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bootcamps.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const flash = (text: string) => {
    setMessage(text);
    setTimeout(() => setMessage(''), 4000);
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.title?.trim()) return;
    setSaving(true);
    setError('');
    try {
      await bootcampApi.create(createForm);
      setCreateForm(blankCreate);
      setShowCreate(false);
      flash('Bootcamp created.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create bootcamp.');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (bootcamp: Bootcamp) => {
    const action = bootcamp.status === 'open' ? 'close' : 'open';
    if (action === 'close' && !confirm(`Close "${bootcamp.title}"? Registration will be disabled.`)) return;
    try {
      await bootcampApi.update({ id: bootcamp.id, action });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status.');
    }
  };

  const remove = async (bootcamp: Bootcamp) => {
    if (!confirm(`Delete "${bootcamp.title}" and all its data? This cannot be undone.`)) return;
    try {
      await bootcampApi.remove(bootcamp.id);
      flash('Bootcamp deleted.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete bootcamp.');
    }
  };

  const assignManager = async (bootcamp: Bootcamp) => {
    const email = (managerEmails[bootcamp.id] ?? '').trim();
    try {
      await bootcampApi.update({ id: bootcamp.id, managerEmail: email });
      flash(email ? `Manager set to ${email}.` : 'Manager removed.');
      setManagerEmails((prev) => ({ ...prev, [bootcamp.id]: '' }));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign manager.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bootcamps</h1>
          <p className="mt-1 text-sm text-slate-500">Create and run multiple fintech bootcamps. Assign managers and close cohorts when done.</p>
        </div>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
        >
          {showCreate ? 'Cancel' : '+ New bootcamp'}
        </button>
      </div>

      {message && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{message}</div>}
      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div>}

      {showCreate && (
        <form onSubmit={create} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <input value={createForm.title} onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })} placeholder="Bootcamp title *" required
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <input value={createForm.tagline} onChange={(e) => setCreateForm({ ...createForm, tagline: e.target.value })} placeholder="Tagline"
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <textarea value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} placeholder="Description" rows={3}
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <input value={createForm.cover_image_url} onChange={(e) => setCreateForm({ ...createForm, cover_image_url: e.target.value })} placeholder="Cover image URL"
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input value={createForm.category} onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })} placeholder="Category"
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <input type="number" min={0} value={createForm.price} onChange={(e) => setCreateForm({ ...createForm, price: Number(e.target.value) })} placeholder="Price (₦)"
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <input type="date" value={createForm.start_date} onChange={(e) => setCreateForm({ ...createForm, start_date: e.target.value })}
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <input type="date" value={createForm.end_date} onChange={(e) => setCreateForm({ ...createForm, end_date: e.target.value })}
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input value={createForm.managerEmail} onChange={(e) => setCreateForm({ ...createForm, managerEmail: e.target.value })} placeholder="Manager email (existing user)"
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <select value={createForm.status} onChange={(e) => setCreateForm({ ...createForm, status: e.target.value as BootcampInput['status'] })}
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="open">Open (enrolling)</option>
              <option value="draft">Draft (hidden)</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <button type="submit" disabled={saving} className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
            {saving ? 'Creating…' : 'Create bootcamp'}
          </button>
        </form>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
        </div>
      ) : bootcamps.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-500">
          No bootcamps yet. Create your first cohort above.
        </div>
      ) : (
        <div className="space-y-4">
          {bootcamps.map((bootcamp) => (
            <div key={bootcamp.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4 p-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-slate-900">{bootcamp.title}</h3>
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase ${statusBadge(bootcamp.status)}`}>{bootcamp.status}</span>
                    <span className="text-xs text-slate-400">/{bootcamp.slug}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {bootcamp.enrollment_count ?? 0} participants ·{' '}
                    {bootcamp.manager_name ? `Manager: ${bootcamp.manager_name} (${bootcamp.manager_email})` : 'No manager assigned'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setExpanded(expanded === bootcamp.id ? null : bootcamp.id)} className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100">
                    {expanded === bootcamp.id ? 'Hide' : 'Manage content'}
                  </button>
                  <button onClick={() => toggleStatus(bootcamp)} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200">
                    {bootcamp.status === 'open' ? 'Close' : 'Open'}
                  </button>
                  <button onClick={() => remove(bootcamp)} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-rose-100 hover:text-rose-700">Delete</button>
                </div>
              </div>

              {expanded === bootcamp.id && (
                <div className="space-y-6 border-t border-slate-100 bg-slate-50 p-5">
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="flex-1 min-w-[220px]">
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Assign / change manager</label>
                      <input
                        value={managerEmails[bootcamp.id] ?? ''}
                        onChange={(e) => setManagerEmails((prev) => ({ ...prev, [bootcamp.id]: e.target.value }))}
                        placeholder={bootcamp.manager_email || 'manager@example.com'}
                        className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <button onClick={() => assignManager(bootcamp)} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
                      Save manager
                    </button>
                  </div>

                  <div>
                    <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Hub content</h4>
                    <ResourcesManager bootcampId={bootcamp.id} />
                  </div>

                  <div>
                    <CompetitionsManager bootcampId={bootcamp.id} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SuperAdminBootcamps;
