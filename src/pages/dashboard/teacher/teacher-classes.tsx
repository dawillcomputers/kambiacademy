import React, { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { api } from '../../../../lib/api';

type Tab = 'classes' | 'live' | 'schedule';

interface ClassRecord {
  id: number;
  title: string;
  description?: string | null;
  invite_code: string;
  max_students?: number | null;
  member_count?: number | null;
  member_names?: string | null;
  member_emails?: string | null;
  created_at?: string;
}

interface LiveSession {
  id: number;
  title?: string;
  status?: string;
  class_id?: number;
  created_at?: string;
  ended_at?: string | null;
}

const parseList = (v?: string | null) => String(v || '').split(',').map(s => s.trim()).filter(Boolean);

export default function TeacherClassesPage() {
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [startingId, setStartingId] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>('classes');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [copiedVal, setCopiedVal] = useState<string | null>(null);

  const [classForm, setClassForm] = useState({ title: '', description: '', max_students: '30' });
  const [scheduleForm, setScheduleForm] = useState({ title: '', classId: '', date: '', time: '', duration: '60', description: '' });

  const load = async () => {
    setLoading(true);
    const [cr, lr] = await Promise.allSettled([api.tutorGetClasses(), api.getLiveSessions()]);
    setClasses(cr.status === 'fulfilled' ? (cr.value.classes || []) as ClassRecord[] : []);
    setLiveSessions(lr.status === 'fulfilled' ? (lr.value.sessions || []) as LiveSession[] : []);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const activeSessionClassIds = useMemo(() => new Set(
    liveSessions.filter(s => s.status === 'active' || s.status === 'live').map(s => s.class_id)
  ), [liveSessions]);

  const stats = useMemo(() => {
    const members = classes.reduce((s, c) => s + Number(c.member_count || 0), 0);
    const activeSessions = liveSessions.filter(s => s.status === 'active' || s.status === 'live').length;
    return [
      { label: 'Classes', value: classes.length, color: 'bg-emerald-100 text-emerald-700' },
      { label: 'Students', value: members, color: 'bg-blue-100 text-blue-700' },
      { label: 'Live Now', value: activeSessions, color: 'bg-rose-100 text-rose-700' },
      { label: 'Past Sessions', value: liveSessions.length, color: 'bg-amber-100 text-amber-700' },
    ];
  }, [classes, liveSessions]);

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classForm.title.trim()) { setError('Class title required.'); return; }
    setSaving(true); setError(''); setMessage('');
    try {
      const r = await api.tutorCreateClass({
        title: classForm.title.trim(),
        description: classForm.description.trim(),
        max_students: Number(classForm.max_students || 30),
      });
      setClassForm({ title: '', description: '', max_students: '30' });
      setMessage(`Class created! Invite code: ${r?.invite_code || ''}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create class.');
    } finally {
      setSaving(false);
    }
  };

  const handleStartLive = async (c: ClassRecord) => {
    setStartingId(c.id);
    setError(''); setMessage('');
    try {
      const r = await api.startLiveSession(c.id, `Live: ${c.title}`);
      setMessage(`Live session #${r.id} started for "${c.title}".`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start live session.');
    } finally {
      setStartingId(null);
    }
  };

  const handleEndSession = async (sessionId: number) => {
    setError(''); setMessage('');
    try {
      await api.endLiveSession(sessionId);
      setMessage('Session ended.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to end session.');
    }
  };

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleForm.title.trim() || !scheduleForm.classId || !scheduleForm.date) {
      setError('Fill in title, class, and date.');
      return;
    }
    setSaving(true); setError(''); setMessage('');
    try {
      const classId = Number(scheduleForm.classId);
      const cls = classes.find(c => c.id === classId);
      await api.startLiveSession(classId, `${scheduleForm.title} (Scheduled: ${scheduleForm.date} ${scheduleForm.time})`);
      setMessage(`Session scheduled for "${cls?.title || 'class'}".`);
      setScheduleForm({ title: '', classId: '', date: '', time: '', duration: '60', description: '' });
      setTab('live');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to schedule.');
    } finally {
      setSaving(false);
    }
  };

  const copy = async (val: string, msg: string) => {
    try {
      await navigator.clipboard.writeText(val);
      setCopiedVal(val);
      setMessage(msg);
    } catch { setError('Copy failed.'); }
  };

  const tabItems: { key: Tab; label: string }[] = [
    { key: 'classes', label: 'My Classes' },
    { key: 'live', label: 'Live Sessions' },
    { key: 'schedule', label: 'Schedule' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Classes</h1>
          <p className="mt-1 text-sm text-slate-500">Create private classes, go live, or schedule sessions for your students.</p>
        </div>

        {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}
        {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

        <div className="grid gap-3 sm:grid-cols-4">
          {stats.map(s => (
            <div key={s.label} className={`rounded-xl px-4 py-3 text-center ${s.color}`}>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs font-medium">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
          {tabItems.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${tab === t.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500">Loading...</div>
        ) : (
          <>
            {/* CLASSES TAB */}
            {tab === 'classes' && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="mb-4 text-lg font-bold text-slate-900">Create New Class</h2>
                  <form className="space-y-4" onSubmit={handleCreateClass}>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-slate-700">Class Title</label>
                        <input type="text" value={classForm.title} onChange={e => setClassForm(p => ({ ...p, title: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Frontend Coaching" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700">Seat Limit</label>
                        <input type="number" min="1" value={classForm.max_students} onChange={e => setClassForm(p => ({ ...p, max_students: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Description</label>
                      <textarea value={classForm.description} onChange={e => setClassForm(p => ({ ...p, description: e.target.value }))} rows={2} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                    </div>
                    <button type="submit" disabled={saving} className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
                      {saving ? 'Creating...' : 'Create Class'}
                    </button>
                  </form>
                </div>

                {classes.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">No classes yet. Create your first class above.</div>
                ) : (
                  <div className="space-y-4">
                    {classes.map(c => {
                      const members = parseList(c.member_names);
                      const joinLink = `${window.location.origin}/join/${c.invite_code}`;
                      const isLive = activeSessionClassIds.has(c.id);
                      return (
                        <div key={c.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-lg font-bold text-slate-900">{c.title}</h3>
                                {isLive && <span className="animate-pulse rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">● LIVE</span>}
                                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">{c.member_count || 0}/{c.max_students || '∞'}</span>
                              </div>
                              <p className="mt-1 text-sm text-slate-600">{c.description || 'No description.'}</p>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => handleStartLive(c)} disabled={startingId === c.id} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
                                {startingId === c.id ? 'Starting...' : 'Go Live'}
                              </button>
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-3">
                            <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs">
                              <span className="font-medium text-slate-500">Code:</span>
                              <code className="font-semibold text-slate-800">{c.invite_code}</code>
                              <button onClick={() => copy(c.invite_code, 'Code copied!')} className="text-blue-600 hover:text-blue-700">{copiedVal === c.invite_code ? '✓' : 'Copy'}</button>
                            </div>
                            <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs">
                              <span className="font-medium text-slate-500">Link:</span>
                              <button onClick={() => copy(joinLink, 'Link copied!')} className="text-blue-600 hover:text-blue-700">{copiedVal === joinLink ? '✓ Copied' : 'Copy Join Link'}</button>
                            </div>
                          </div>
                          {members.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {members.map((n, i) => (
                                <span key={`${c.id}-${i}`} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-700">{n}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* LIVE SESSIONS TAB */}
            {tab === 'live' && (
              <div className="space-y-4">
                {liveSessions.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">No live sessions yet. Start one from the Classes tab.</div>
                ) : (
                  liveSessions.map(s => {
                    const cls = classes.find(c => c.id === s.class_id);
                    const isActive = s.status === 'active' || s.status === 'live';
                    return (
                      <div key={s.id} className={`rounded-2xl border p-5 shadow-sm ${isActive ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white'}`}>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-slate-900">{s.title || `Session #${s.id}`}</h3>
                              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${isActive ? 'bg-red-100 text-red-700' : s.status === 'ended' ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-700'}`}>
                                {s.status || 'scheduled'}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-slate-600">
                              {cls ? `Class: ${cls.title}` : `Class #${s.class_id || 'N/A'}`}
                              {s.created_at && ` • Started ${new Date(s.created_at).toLocaleString()}`}
                            </p>
                          </div>
                          {isActive && (
                            <button onClick={() => handleEndSession(s.id)} className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100">
                              End Session
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* SCHEDULE TAB */}
            {tab === 'schedule' && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-lg font-bold text-slate-900">Schedule a Class Session</h2>
                <p className="mb-4 text-sm text-slate-500">Schedule a session so students can subscribe and join at the scheduled time.</p>
                <form className="space-y-4" onSubmit={handleSchedule}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Session Title</label>
                      <input type="text" value={scheduleForm.title} onChange={e => setScheduleForm(p => ({ ...p, title: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Introduction to React" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Class</label>
                      <select value={scheduleForm.classId} onChange={e => setScheduleForm(p => ({ ...p, classId: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                        <option value="">Select a class</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Date</label>
                      <input type="date" value={scheduleForm.date} onChange={e => setScheduleForm(p => ({ ...p, date: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Time</label>
                      <input type="time" value={scheduleForm.time} onChange={e => setScheduleForm(p => ({ ...p, time: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Duration (min)</label>
                      <input type="number" min="15" value={scheduleForm.duration} onChange={e => setScheduleForm(p => ({ ...p, duration: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Description</label>
                    <textarea value={scheduleForm.description} onChange={e => setScheduleForm(p => ({ ...p, description: e.target.value }))} rows={2} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="What will this session cover?" />
                  </div>
                  <button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                    {saving ? 'Scheduling...' : 'Schedule Session'}
                  </button>
                </form>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
