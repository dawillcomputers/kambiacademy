import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bootcamp, bootcampApi, formatBootcampDate } from '../../../../lib/bootcamp';
import { useAuth } from '../../../../lib/auth';

const StudentBootcamps: React.FC = () => {
  const { refreshUser } = useAuth();
  const navigate = useNavigate();
  const [enrolled, setEnrolled] = useState<Bootcamp[]>([]);
  const [available, setAvailable] = useState<Bootcamp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [mine, all] = await Promise.all([bootcampApi.myEnrollments(), bootcampApi.list()]);
      const enrolledList = mine.bootcamps || [];
      const enrolledSlugs = new Set(enrolledList.map((b) => b.slug));
      setEnrolled(enrolledList);
      setAvailable((all.bootcamps || []).filter((b) => b.status === 'open' && !enrolledSlugs.has(b.slug)));
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

  const register = async (slug: string) => {
    setBusy(slug);
    setError('');
    try {
      await bootcampApi.enroll(slug);
      await refreshUser();
      navigate(`/student/bootcamp/${slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not register.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="mb-2 text-3xl font-bold text-white">Bootcamps</h1>
        <p className="text-white/80">Your fintech cohorts and new bootcamps you can join.</p>
      </div>

      {error && <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-200">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-white" />
        </div>
      ) : (
        <>
          <section>
            <h2 className="mb-4 text-lg font-semibold text-white">My bootcamps ({enrolled.length})</h2>
            {enrolled.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-6 text-sm text-white/70">
                You haven't joined a bootcamp yet. Pick one below to get started.
              </p>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {enrolled.map((bootcamp) => (
                  <button
                    key={bootcamp.id}
                    onClick={() => navigate(`/student/bootcamp/${bootcamp.slug}`)}
                    className="overflow-hidden rounded-2xl bg-white text-left shadow-lg transition hover:-translate-y-1"
                  >
                    <div
                      className="h-28 w-full bg-slate-800 bg-cover bg-center"
                      style={bootcamp.cover_image_url ? { backgroundImage: `url(${bootcamp.cover_image_url})` } : undefined}
                    />
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase text-indigo-600">{bootcamp.category}</span>
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase ${bootcamp.status === 'open' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                          {bootcamp.status === 'open' ? 'Active' : 'Closed'}
                        </span>
                      </div>
                      <h3 className="mt-2 font-bold text-slate-900">{bootcamp.title}</h3>
                      {bootcamp.tagline && <p className="text-sm text-indigo-600">{bootcamp.tagline}</p>}
                      <p className="mt-3 text-sm font-semibold text-indigo-600">Open hub →</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          {available.length > 0 && (
            <section>
              <h2 className="mb-4 text-lg font-semibold text-white">Discover bootcamps</h2>
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {available.map((bootcamp) => (
                  <div key={bootcamp.id} className="overflow-hidden rounded-2xl bg-white shadow-lg">
                    <div
                      className="h-28 w-full bg-slate-800 bg-cover bg-center"
                      style={bootcamp.cover_image_url ? { backgroundImage: `url(${bootcamp.cover_image_url})` } : undefined}
                    />
                    <div className="p-4">
                      <h3 className="font-bold text-slate-900">{bootcamp.title}</h3>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-600">{bootcamp.description}</p>
                      {(bootcamp.start_date || bootcamp.end_date) && (
                        <p className="mt-2 text-xs text-slate-400">
                          {formatBootcampDate(bootcamp.start_date)}{bootcamp.end_date ? ` – ${formatBootcampDate(bootcamp.end_date)}` : ''}
                        </p>
                      )}
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-900">{Number(bootcamp.price) > 0 ? `₦${Number(bootcamp.price).toLocaleString()}` : 'Free'}</span>
                        <button
                          onClick={() => register(bootcamp.slug)}
                          disabled={busy === bootcamp.slug}
                          className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                        >
                          {busy === bootcamp.slug ? 'Joining…' : 'Register'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
};

export default StudentBootcamps;
