import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Bootcamp, bootcampApi, formatBootcampDate } from '../lib/bootcamp';
import { useAuth } from '../lib/auth';

const BootcampDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [bootcamp, setBootcamp] = useState<Bootcamp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [registering, setRegistering] = useState(false);

  const load = useCallback(async () => {
    if (!slug) return;
    try {
      const res = await bootcampApi.list();
      const match = (res.bootcamps || []).find((b) => b.slug === slug) || null;
      setBootcamp(match);
      if (!match) setError('This bootcamp is not available.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load the bootcamp.');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  const register = useCallback(async () => {
    if (!slug || !bootcamp) return;

    if (!user) {
      navigate(`/signup?redirect=${encodeURIComponent(`/bootcamps/${slug}?register=1`)}`);
      return;
    }

    if (user.role !== 'student') {
      setError('Only learner accounts can register for a bootcamp.');
      return;
    }

    setRegistering(true);
    setError('');
    try {
      await bootcampApi.enroll(slug);
      await refreshUser();
      navigate(`/student/bootcamp/${slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not complete your registration.');
    } finally {
      setRegistering(false);
    }
  }, [slug, bootcamp, user, navigate, refreshUser]);

  // Auto-register when arriving back from sign-up with ?register=1.
  useEffect(() => {
    if (searchParams.get('register') === '1' && user?.role === 'student' && bootcamp && !bootcamp.enrolled && bootcamp.status === 'open' && !registering) {
      void register();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, user, bootcamp]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
      </div>
    );
  }

  if (!bootcamp) {
    return (
      <div className="section-shell surface-ring rounded-[32px] border border-white/70 px-6 py-16 text-center">
        <h1 className="font-display text-3xl font-bold text-slate-950">Bootcamp not found</h1>
        <p className="mt-3 text-sm text-slate-500">{error || 'This bootcamp may have been removed.'}</p>
        <Link to="/bootcamps" className="mt-6 inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white">
          Back to bootcamps
        </Link>
      </div>
    );
  }

  const isEnrolled = !!bootcamp.enrolled;
  const isOpen = bootcamp.status === 'open';

  return (
    <div className="space-y-8">
      <section className="section-shell surface-ring overflow-hidden rounded-[32px] border border-white/70">
        <div
          className="h-56 w-full bg-slate-900 bg-cover bg-center"
          style={bootcamp.cover_image_url ? { backgroundImage: `url(${bootcamp.cover_image_url})` } : undefined}
        >
          <div className="flex h-full w-full flex-col justify-end bg-gradient-to-t from-slate-950/90 via-slate-900/40 to-transparent p-6 sm:p-10">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
                {bootcamp.category || 'Fintech'}
              </span>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${isOpen ? 'bg-emerald-500 text-white' : 'bg-slate-500 text-white'}`}>
                {isOpen ? 'Enrolling now' : 'Closed'}
              </span>
            </div>
            <h1 className="mt-3 font-display text-4xl font-bold text-white">{bootcamp.title}</h1>
            {bootcamp.tagline && <p className="mt-2 text-lg font-medium text-indigo-200">{bootcamp.tagline}</p>}
          </div>
        </div>

        <div className="grid gap-8 p-6 sm:p-10 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-4">
            <h2 className="font-display text-2xl font-bold text-slate-950">About this bootcamp</h2>
            <p className="whitespace-pre-line text-sm leading-7 text-slate-600">
              {bootcamp.description || 'Programme details will be shared by your bootcamp manager.'}
            </p>
          </div>

          <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Price</dt>
                <dd className="font-semibold text-slate-900">{Number(bootcamp.price) > 0 ? `₦${Number(bootcamp.price).toLocaleString()}` : 'Free'}</dd>
              </div>
              {bootcamp.start_date && (
                <div className="flex justify-between">
                  <dt className="text-slate-500">Starts</dt>
                  <dd className="font-semibold text-slate-900">{formatBootcampDate(bootcamp.start_date)}</dd>
                </div>
              )}
              {bootcamp.end_date && (
                <div className="flex justify-between">
                  <dt className="text-slate-500">Ends</dt>
                  <dd className="font-semibold text-slate-900">{formatBootcampDate(bootcamp.end_date)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-slate-500">Participants</dt>
                <dd className="font-semibold text-slate-900">{bootcamp.enrollment_count ?? 0}</dd>
              </div>
            </dl>

            {error && <p className="mt-4 text-sm font-semibold text-rose-600">{error}</p>}

            <div className="mt-6">
              {isEnrolled ? (
                <Link
                  to={`/student/bootcamp/${bootcamp.slug}`}
                  className="block w-full rounded-2xl bg-indigo-600 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-indigo-700"
                >
                  Open your bootcamp hub
                </Link>
              ) : isOpen ? (
                <button
                  onClick={register}
                  disabled={registering}
                  className="w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                >
                  {registering ? 'Registering…' : user ? 'Register for this bootcamp' : 'Sign up & register'}
                </button>
              ) : (
                <p className="rounded-2xl bg-slate-100 px-5 py-3 text-center text-sm font-medium text-slate-500">
                  Registration is closed for this cohort.
                </p>
              )}
            </div>
            <p className="mt-4 text-center text-xs text-slate-400">
              Registering keeps full access to all Kambi Academy courses too.
            </p>
          </aside>
        </div>
      </section>
    </div>
  );
};

export default BootcampDetail;
