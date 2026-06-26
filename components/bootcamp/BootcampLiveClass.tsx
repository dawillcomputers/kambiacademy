import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import type { AuthUser } from '../../lib/auth';
import LiveClassroom from '../LiveClassroom';

interface Props {
  bootcampId: number;
  bootcampTitle?: string;
  user: { id: number | string; name: string; role: AuthUser['role'] };
}

interface ActiveSession {
  id: number;
  title?: string;
  started_at?: string;
}

// Drop-in control that lets a bootcamp manager start the realtime (camera/audio)
// classroom and lets enrolled participants join it. Reuses <LiveClassroom>.
const BootcampLiveClass: React.FC<Props> = ({ bootcampId, bootcampTitle, user }) => {
  const [canManage, setCanManage] = useState(false);
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const res = await api.getBootcampLiveClass(bootcampId);
      setCanManage(Boolean(res.canManage));
      setSession(res.session || null);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load live class.');
    } finally {
      setLoading(false);
    }
  }, [bootcampId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const start = async () => {
    setBusy(true); setError('');
    try {
      const res = await api.startBootcampLiveClass(bootcampId, `${bootcampTitle || 'Bootcamp'} live class`);
      await refresh();
      setActiveSessionId(Number(res.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start live class.');
    } finally {
      setBusy(false);
    }
  };

  const end = async () => {
    if (!session) return;
    setBusy(true); setError('');
    try {
      await api.endBootcampLiveClass(session.id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to end live class.');
    } finally {
      setBusy(false);
    }
  };

  if (activeSessionId !== null) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-slate-700">Live classroom (camera &amp; microphone)</p>
          <button onClick={() => { setActiveSessionId(null); void refresh(); }} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            Leave
          </button>
        </div>
        <LiveClassroom
          sessionId={activeSessionId}
          user={{ id: Number(user.id), name: user.name, role: user.role }}
          onLeave={() => { setActiveSessionId(null); void refresh(); }}
        />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Live class</h3>
          <p className="mt-1 text-sm text-slate-500">
            {loading ? 'Checking…' : session ? 'A live class is running now.' : canManage ? 'Start a realtime class with camera and microphone.' : 'No live class is running right now.'}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          {session ? (
            <>
              <button onClick={() => setActiveSessionId(session.id)} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
                Join live class
              </button>
              {canManage && (
                <button onClick={end} disabled={busy} className="rounded-xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60">
                  End
                </button>
              )}
            </>
          ) : canManage && !loading ? (
            <button onClick={start} disabled={busy} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
              {busy ? 'Starting…' : 'Start live class'}
            </button>
          ) : null}
        </div>
      </div>
      {error && <p className="mt-3 text-sm font-semibold text-rose-600">{error}</p>}
    </div>
  );
};

export default BootcampLiveClass;
