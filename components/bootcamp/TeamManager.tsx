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
              <div className="flex flex-wrap gap-2">
                {team.map((m) => (
                  <span key={m.id} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${roleBadge(m.role)}`}>{m.role}</span>
                    <span className="font-medium text-slate-800">{m.name}</span>
                    <button onClick={() => remove(m.id)} className="text-slate-400 hover:text-rose-600">✕</button>
                  </span>
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
