import React, { useCallback, useEffect, useState } from 'react';
import { Bootcamp, BootcampInput, BootcampRegistration, bootcampApi } from '../../../../lib/bootcamp';
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

const fieldCls = 'w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500';

// Label + description wrapper so every field is self-explanatory.
const Labeled: React.FC<{ label: string; description: string; required?: boolean; children: React.ReactNode }> = ({ label, description, required, children }) => (
  <div className="space-y-1">
    <label className="block text-sm font-semibold text-slate-700">{label}{required && <span className="text-rose-500"> *</span>}</label>
    <p className="text-xs text-slate-400">{description}</p>
    <div className="pt-0.5">{children}</div>
  </div>
);

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
  const [registrants, setRegistrants] = useState<Record<number, BootcampRegistration[]>>({});
  const [registrantsLoading, setRegistrantsLoading] = useState<number | null>(null);
  const [allRegistrants, setAllRegistrants] = useState<BootcampRegistration[]>([]);
  const [showRegistrants, setShowRegistrants] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);

  const loadAllRegistrants = useCallback(async () => {
    try {
      const res = await bootcampApi.registrations();
      setAllRegistrants(res.registrations || []);
    } catch {
      setAllRegistrants([]);
    }
  }, []);

  useEffect(() => {
    void loadAllRegistrants();
  }, [loadAllRegistrants]);

  const handleCoverUpload = async (file?: File | null) => {
    if (!file) return;
    setCoverUploading(true);
    setError('');
    try {
      const { url } = await bootcampApi.uploadCoverImage(file);
      setCreateForm((prev) => ({ ...prev, cover_image_url: url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cover upload failed.');
    } finally {
      setCoverUploading(false);
    }
  };

  const loadRegistrants = useCallback(async (bootcampId: number) => {
    setRegistrantsLoading(bootcampId);
    try {
      const res = await bootcampApi.registrations(bootcampId);
      setRegistrants((prev) => ({ ...prev, [bootcampId]: res.registrations || [] }));
    } catch {
      setRegistrants((prev) => ({ ...prev, [bootcampId]: [] }));
    } finally {
      setRegistrantsLoading(null);
    }
  }, []);

  const toggleExpand = (bootcampId: number) => {
    const next = expanded === bootcampId ? null : bootcampId;
    setExpanded(next);
    if (next && registrants[next] === undefined) void loadRegistrants(next);
  };

  const appoint = async (bootcampId: number, userId: number) => {
    if (!confirm('Appoint this registrant as the bootcamp manager?')) return;
    try {
      await bootcampApi.appointManager(bootcampId, userId);
      flash('Manager appointed.');
      await Promise.all([load(), loadRegistrants(bootcampId), loadAllRegistrants()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to appoint manager.');
    }
  };

  const [resetPasswords, setResetPasswords] = useState<Record<number, string>>({});

  const resetPassword = async (bootcampId: number, userId: number) => {
    if (!confirm('Reset this participant\'s password? They will need the new temporary password to sign in.')) return;
    try {
      const res = await bootcampApi.resetPassword(userId);
      setResetPasswords((prev) => ({ ...prev, [userId]: res.tempPassword }));
      flash(`New temporary password: ${res.tempPassword}`);
      await Promise.all([loadRegistrants(bootcampId), loadAllRegistrants()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password.');
    }
  };

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
          <p className="mt-1 text-sm text-slate-500">Create and run multiple bootcamps across any field. Appoint managers from registrants and close cohorts when done.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowRegistrants((v) => !v); if (!showRegistrants) void loadAllRegistrants(); }}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            {showRegistrants ? 'Hide registrants' : `View registrants (${allRegistrants.length})`}
          </button>
          <button
            onClick={() => setShowCreate((v) => !v)}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            {showCreate ? 'Cancel' : '+ New bootcamp'}
          </button>
        </div>
      </div>

      {message && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{message}</div>}
      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div>}

      {showCreate && (
        <form onSubmit={create} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-5 sm:grid-cols-2">
            <Labeled label="Bootcamp name" description="The public title of this cohort, e.g. 'Product Design Bootcamp 2026'." required>
              <input value={createForm.title} onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })} required className={fieldCls} />
            </Labeled>
            <Labeled label="Tagline" description="A short one-line hook shown under the title on cards and the detail page.">
              <input value={createForm.tagline} onChange={(e) => setCreateForm({ ...createForm, tagline: e.target.value })} className={fieldCls} />
            </Labeled>
          </div>

          <Labeled label="Description" description="What participants will learn and do. Shown on the bootcamp's public page.">
            <textarea value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} rows={3} className={fieldCls} />
          </Labeled>

          <Labeled label="Cover image" description="Upload a wide landscape image (1600×900+) used on cards and the hero. You can also paste a URL.">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div
                className="h-24 w-40 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 bg-cover bg-center text-center text-xs leading-[6rem] text-slate-400"
                style={createForm.cover_image_url ? { backgroundImage: `url(${createForm.cover_image_url})` } : undefined}
              >
                {!createForm.cover_image_url && 'Preview'}
              </div>
              <div className="flex-1 space-y-2">
                <label className="inline-flex cursor-pointer items-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  {coverUploading ? 'Uploading…' : 'Upload image'}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleCoverUpload(e.target.files?.[0])} />
                </label>
                <input value={createForm.cover_image_url} onChange={(e) => setCreateForm({ ...createForm, cover_image_url: e.target.value })} placeholder="…or paste an image URL" className={fieldCls} />
              </div>
            </div>
          </Labeled>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Labeled label="Category" description="Field or theme, e.g. Design, Data, Fintech.">
              <input value={createForm.category} onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })} className={fieldCls} />
            </Labeled>
            <Labeled label="Price (₦)" description="Set 0 for a free cohort.">
              <input type="number" min={0} value={createForm.price} onChange={(e) => setCreateForm({ ...createForm, price: Number(e.target.value) })} className={fieldCls} />
            </Labeled>
            <Labeled label="Start date" description="When the cohort begins.">
              <input type="date" value={createForm.start_date} onChange={(e) => setCreateForm({ ...createForm, start_date: e.target.value })} className={fieldCls} />
            </Labeled>
            <Labeled label="End date" description="When the cohort ends.">
              <input type="date" value={createForm.end_date} onChange={(e) => setCreateForm({ ...createForm, end_date: e.target.value })} className={fieldCls} />
            </Labeled>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Labeled label="Manager" description="Choose a manager from people who have registered. You can also appoint one later from “View registrants”.">
              <select value={createForm.managerEmail} onChange={(e) => setCreateForm({ ...createForm, managerEmail: e.target.value })} className={fieldCls}>
                <option value="">No manager yet</option>
                {allRegistrants.map((r) => (
                  <option key={r.id} value={r.email}>{r.full_name} — {r.email}</option>
                ))}
              </select>
            </Labeled>
            <Labeled label="Status" description="Open accepts registrations. Draft hides it. Closed stops new registrations.">
              <select value={createForm.status} onChange={(e) => setCreateForm({ ...createForm, status: e.target.value as BootcampInput['status'] })} className={fieldCls}>
                <option value="open">Open (enrolling)</option>
                <option value="draft">Draft (hidden)</option>
                <option value="closed">Closed</option>
              </select>
            </Labeled>
          </div>

          <button type="submit" disabled={saving} className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
            {saving ? 'Creating…' : 'Create bootcamp'}
          </button>
        </form>
      )}

      {showRegistrants && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3">
            <h3 className="text-lg font-semibold text-slate-900">All registrants</h3>
            <p className="text-sm text-slate-500">Everyone who registered for any bootcamp. Appoint a manager (for the bootcamp they registered for) or reset a password.</p>
          </div>
          {allRegistrants.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">No registrants yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5">Name</th>
                    <th className="px-4 py-2.5">Email</th>
                    <th className="px-4 py-2.5">Bootcamp</th>
                    <th className="px-4 py-2.5">Temp password</th>
                    <th className="px-4 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allRegistrants.map((r) => {
                    const isManager = r.user_role === 'bootcamp_manager';
                    return (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            {r.profile_photo ? (
                              <img src={r.profile_photo} alt={r.full_name} className="h-7 w-7 rounded-full object-cover" />
                            ) : (
                              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">{r.full_name.charAt(0).toUpperCase()}</span>
                            )}
                            <span className="font-medium text-slate-900">{r.full_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-slate-600">{r.email}</td>
                        <td className="px-4 py-2.5 text-slate-600">{r.bootcamp_title || '—'}</td>
                        <td className="px-4 py-2.5">
                          {resetPasswords[r.user_id] ? (
                            <code className="rounded bg-amber-100 px-2 py-0.5 font-mono text-xs font-semibold text-amber-800">{resetPasswords[r.user_id]}</code>
                          ) : r.must_change_password === 1 && r.temp_password ? (
                            <code className="rounded bg-indigo-50 px-2 py-0.5 font-mono text-xs font-semibold text-indigo-700">{r.temp_password}</code>
                          ) : (
                            <span className="text-xs text-slate-400">Set by user</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => resetPassword(r.bootcamp_id, r.user_id)} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200">Reset password</button>
                            {isManager ? (
                              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">Manager</span>
                            ) : (
                              <button onClick={() => appoint(r.bootcamp_id, r.user_id)} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800">Make manager</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
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
                  <button onClick={() => toggleExpand(bootcamp.id)} className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100">
                    {expanded === bootcamp.id ? 'Hide' : 'Manage'}
                  </button>
                  <button onClick={() => toggleStatus(bootcamp)} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200">
                    {bootcamp.status === 'open' ? 'Close' : 'Open'}
                  </button>
                  <button onClick={() => remove(bootcamp)} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-rose-100 hover:text-rose-700">Delete</button>
                </div>
              </div>

              {expanded === bootcamp.id && (
                <div className="space-y-6 border-t border-slate-100 bg-slate-50 p-5">
                  <div>
                    <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
                      Registrants ({registrants[bootcamp.id]?.length ?? 0})
                    </h4>
                    {registrantsLoading === bootcamp.id ? (
                      <p className="text-sm text-slate-500">Loading registrants…</p>
                    ) : (registrants[bootcamp.id]?.length ?? 0) === 0 ? (
                      <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-500">
                        No one has registered for this bootcamp yet.
                      </p>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                            <tr>
                              <th className="px-4 py-2.5">Name</th>
                              <th className="px-4 py-2.5">Email</th>
                              <th className="px-4 py-2.5">Location</th>
                              <th className="px-4 py-2.5">Temp password</th>
                              <th className="px-4 py-2.5 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {(registrants[bootcamp.id] || []).map((r) => {
                              const isManager = r.user_id === bootcamp.manager_id;
                              return (
                                <tr key={r.id} className="hover:bg-slate-50">
                                  <td className="px-4 py-2.5">
                                    <div className="flex items-center gap-2">
                                      {r.profile_photo ? (
                                        <img src={r.profile_photo} alt={r.full_name} className="h-7 w-7 rounded-full object-cover" />
                                      ) : (
                                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                                          {r.full_name.charAt(0).toUpperCase()}
                                        </span>
                                      )}
                                      <span className="font-medium text-slate-900">{r.full_name}</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-2.5 text-slate-600">{r.email}</td>
                                  <td className="px-4 py-2.5 text-slate-600">{[r.city, r.state, r.country].filter(Boolean).join(', ') || '—'}</td>
                                  <td className="px-4 py-2.5">
                                    {resetPasswords[r.user_id] ? (
                                      <code className="rounded bg-amber-100 px-2 py-0.5 font-mono text-xs font-semibold text-amber-800">{resetPasswords[r.user_id]}</code>
                                    ) : r.must_change_password === 1 && r.temp_password ? (
                                      <code className="rounded bg-indigo-50 px-2 py-0.5 font-mono text-xs font-semibold text-indigo-700">{r.temp_password}</code>
                                    ) : (
                                      <span className="text-xs text-slate-400">Set by user</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-2.5 text-right">
                                    <div className="flex justify-end gap-2">
                                      <button onClick={() => resetPassword(bootcamp.id, r.user_id)} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200">
                                        Reset password
                                      </button>
                                      {isManager ? (
                                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">Manager</span>
                                      ) : (
                                        <button onClick={() => appoint(bootcamp.id, r.user_id)} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800">
                                          Make manager
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

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
