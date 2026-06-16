import React, { useCallback, useEffect, useState } from 'react';
import { LiveSession, liveApi, formatBootcampDate } from '../../lib/bootcamp';

const PROVIDER_LABEL: Record<string, string> = { zoom: 'Zoom', meet: 'Google Meet', teams: 'Microsoft Teams', other: 'Other' };

const emptyForm = {
  title: '', description: '', provider: 'zoom' as LiveSession['provider'],
  url: '', meeting_id: '', passcode: '', starts_at: '', duration_minutes: 60,
};

const LiveSessionsManager: React.FC<{ bootcampId: number }> = ({ bootcampId }) => {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await liveApi.list(bootcampId);
      setSessions(res.sessions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load live sessions.');
    } finally {
      setLoading(false);
    }
  }, [bootcampId]);

  useEffect(() => { void load(); }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await liveApi.create({
        bootcamp_id: bootcampId,
        title: form.title.trim(),
        description: form.description,
        provider: form.provider,
        url: form.url,
        meeting_id: form.meeting_id,
        passcode: form.passcode,
        starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : undefined,
        duration_minutes: Number(form.duration_minutes),
      });
      setForm({ ...emptyForm });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule session.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (s: LiveSession) => {
    if (!confirm(`Delete "${s.title}"?`)) return;
    try { await liveApi.remove(s.id); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to delete.'); }
  };

  const setStatus = async (s: LiveSession, status: LiveSession['status']) => {
    try { await liveApi.update({ id: s.id, status }); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to update.'); }
  };

  const input = 'w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500';

  return (
    <div className="space-y-6">
      {error && <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700">{error}</p>}

      <form onSubmit={create} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2">
        <h3 className="sm:col-span-2 text-sm font-bold text-slate-900">Schedule a live session</h3>
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-slate-600">Title</label>
          <input className={input} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Week 1 — Intro to Payments" required />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600">Platform</label>
          <select className={input} value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value as LiveSession['provider'] })}>
            {Object.entries(PROVIDER_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600">Start time</label>
          <input type="datetime-local" className={input} value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-slate-600">Join URL</label>
          <input className={input} value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://zoom.us/j/..." />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600">Meeting ID</label>
          <input className={input} value={form.meeting_id} onChange={(e) => setForm({ ...form, meeting_id: e.target.value })} />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600">Passcode</label>
          <input className={input} value={form.passcode} onChange={(e) => setForm({ ...form, passcode: e.target.value })} />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600">Duration (minutes)</label>
          <input type="number" min={15} className={input} value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })} />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-slate-600">Description</label>
          <textarea rows={2} className={input} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <button type="submit" disabled={saving} className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
            {saving ? 'Scheduling…' : 'Schedule session'}
          </button>
        </div>
      </form>

      {loading ? (
        <div className="flex justify-center py-10"><div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" /></div>
      ) : sessions.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">No live sessions yet.</p>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-indigo-600">{PROVIDER_LABEL[s.provider]}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${s.status === 'live' ? 'bg-rose-100 text-rose-700' : s.status === 'ended' ? 'bg-slate-200 text-slate-500' : 'bg-emerald-100 text-emerald-700'}`}>{s.status}</span>
                </div>
                <h4 className="mt-1 font-semibold text-slate-900">{s.title}</h4>
                <p className="text-xs text-slate-500">{s.starts_at ? new Date(s.starts_at).toLocaleString() : 'No time set'} · {s.duration_minutes} min</p>
                {s.url && <a href={s.url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-indigo-600 hover:underline">{s.url}</a>}
              </div>
              <div className="flex items-center gap-2">
                {s.status !== 'live' && <button onClick={() => setStatus(s, 'live')} className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700">Go live</button>}
                {s.status === 'live' && <button onClick={() => setStatus(s, 'ended')} className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800">End</button>}
                <button onClick={() => remove(s)} className="text-xs font-semibold text-rose-600 hover:underline">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LiveSessionsManager;
