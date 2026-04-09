import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

const JoinClass: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [classInfo, setClassInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [joinMsg, setJoinMsg] = useState('');
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!code) return;
    api.getInviteInfo(code)
      .then((d) => setClassInfo(d.class))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [code]);

  const handleJoin = async () => {
    if (!code) return;
    setJoining(true);
    try {
      await api.joinClass(code);
      setJoinMsg('You have joined the class!');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="section-shell surface-ring rounded-[32px] border border-white/60 px-6 py-16 text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
      </div>
    );
  }

  if (error && !classInfo) {
    return (
      <div className="section-shell surface-ring rounded-[32px] border border-rose-100 bg-white/90 px-6 py-12 text-center">
        <p className="text-sm font-semibold text-rose-500">{error}</p>
        <Link to="/" className="mt-4 inline-block text-sm text-indigo-600 underline">Go home</Link>
      </div>
    );
  }

  return (
    <div className="section-shell surface-ring rounded-[32px] border border-white/70 px-6 py-8 sm:px-10 max-w-lg mx-auto">
      <p className="text-xs font-semibold uppercase tracking-[0.32em] text-indigo-500">Private Class Invitation</p>
      <h1 className="mt-2 font-display text-3xl font-bold text-slate-950">{classInfo?.title}</h1>
      {classInfo?.description && <p className="mt-2 text-slate-600">{classInfo.description}</p>}
      <p className="mt-3 text-sm text-slate-500">Tutor: {classInfo?.tutor_name}</p>
      <p className="text-sm text-slate-500">{classInfo?.member_count}/{classInfo?.max_students} students enrolled</p>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {joinMsg && <p className="mt-4 text-sm text-green-600 font-semibold">{joinMsg}</p>}

      {!joinMsg && (
        <>
          {!user ? (
            <div className="mt-6">
              <p className="text-sm text-slate-500 mb-3">You need an account to join this class.</p>
              <Link to={`/login?redirect=/join/${code}`} className="rounded-full bg-indigo-600 px-6 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
                Sign in to join
              </Link>
            </div>
          ) : (
            <button onClick={handleJoin} disabled={joining}
              className="mt-6 rounded-full bg-indigo-600 px-6 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
              {joining ? 'Joining...' : 'Join Class'}
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default JoinClass;
