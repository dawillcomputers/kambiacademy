import React, { useCallback, useEffect, useState } from 'react';
import { BootcampRegistration, Facilitator, bootcampApi } from '../../lib/bootcamp';

interface Props {
  bootcampId: number;
}

const roleBadge = (role: string) => (role === 'mentor' ? 'bg-violet-100 text-violet-700' : 'bg-sky-100 text-sky-700');

const TeamManager: React.FC<Props> = ({ bootcampId }) => {
  const [team, setTeam] = useState<Facilitator[]>([]);
  const [registrants, setRegistrants] = useState<BootcampRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<number | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [profile, setProfile] = useState({ industry: '', expertise: '', country: '', linkedin_url: '', bio: '' });

  const openEditor = (m: Facilitator) => {
    setEditing(m.id);
    setProfile({
      industry: m.industry || '', expertise: m.expertise || '', country: m.country || '',
      linkedin_url: m.linkedin_url || '', bio: m.bio || '',
    });
  };

  const saveProfile = async (id: number) => {
    try {
      await bootcampApi.updateFacilitator({ id, ...profile });
      setEditing(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile.');
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, r] = await Promise.all([
        bootcampApi.facilitators(bootcampId),
        bootcampApi.registrations(bootcampId).catch(() => ({ registrations: [] as BootcampRegistration[] })),
      ]);
      setTeam(t.facilitators || []);
      setRegistrants(r.registrations || []);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load the team.');
    } finally {
      setLoading(false);
    }
  }, [bootcampId]);

  useEffect(() => {
    void load();
  }, [load]);

  const appoint = async (r: BootcampRegistration, role: 'facilitator' | 'mentor') => {
    setBusy(r.user_id);
    setError('');
    try {
      await bootcampApi.addFacilitator({ bootcamp_id: bootcampId, user_id: r.user_id, name: r.full_name, email: r.email, role });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to appoint.');
    } finally {
      setBusy(null);
    }
  };

  const remove = async (id: number) => {
    if (!confirm('Remove this team member?')) return;
    try {
      await bootcampApi.removeFacilitator(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove.');
    }
  };

  // Which registrant user_ids already hold each role.
  const has = (userId: number, role: string) => team.some((m) => m.user_id === userId && m.role === role);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Facilitators & Mentors</h3>
        <p className="text-sm text-slate-500">Appoint your bootcamp team from registered participants.</p>
      </div>

      {error && <p className="text-sm font-semibold text-rose-600">{error}</p>}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
        </div>
      ) : (
        <>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Current team ({team.length})</p>
            {team.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-500">No facilitators or mentors yet.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {team.map((m) => (
                  <div key={m.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${roleBadge(m.role)}`}>{m.role}</span>
                          <span className="font-semibold text-slate-900">{m.name}</span>
                        </div>
                        {(m.expertise || m.industry) && <p className="mt-1 text-xs text-slate-500">{[m.expertise, m.industry, m.country].filter(Boolean).join(' · ')}</p>}
                        {m.linkedin_url && <a href={m.linkedin_url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-indigo-600 hover:underline">LinkedIn ↗</a>}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button onClick={() => (editing === m.id ? setEditing(null) : openEditor(m))} className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200">{editing === m.id ? 'Cancel' : 'Edit'}</button>
                        <button onClick={() => remove(m.id)} className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-rose-100 hover:text-rose-700">✕</button>
                      </div>
                    </div>
                    {editing === m.id && (
                      <div className="mt-3 grid gap-2">
                        {([['expertise', 'Expertise (e.g. Payments, ML)'], ['industry', 'Industry'], ['country', 'Country'], ['linkedin_url', 'LinkedIn URL']] as const).map(([key, ph]) => (
                          <input key={key} value={(profile as any)[key]} onChange={(e) => setProfile({ ...profile, [key]: e.target.value })} placeholder={ph}
                            className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        ))}
                        <textarea value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} rows={2} placeholder="Short bio"
                          className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        <button onClick={() => saveProfile(m.id)} className="justify-self-start rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-800">Save profile</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Appoint from registrants ({registrants.length})</p>
            {registrants.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-500">No one has registered for this bootcamp yet.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-2.5">Name</th>
                      <th className="px-4 py-2.5">Email</th>
                      <th className="px-4 py-2.5 text-right">Appoint as</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {registrants.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-medium text-slate-900">{r.full_name}</td>
                        <td className="px-4 py-2.5 text-slate-600">{r.email}</td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => appoint(r, 'facilitator')}
                              disabled={busy === r.user_id || has(r.user_id, 'facilitator')}
                              className="rounded-lg bg-sky-100 px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-200 disabled:opacity-40"
                            >
                              {has(r.user_id, 'facilitator') ? 'Facilitator ✓' : 'Facilitator'}
                            </button>
                            <button
                              onClick={() => appoint(r, 'mentor')}
                              disabled={busy === r.user_id || has(r.user_id, 'mentor')}
                              className="rounded-lg bg-violet-100 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-200 disabled:opacity-40"
                            >
                              {has(r.user_id, 'mentor') ? 'Mentor ✓' : 'Mentor'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default TeamManager;
