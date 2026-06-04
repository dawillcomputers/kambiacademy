import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bootcamp, bootcampApi, formatBootcampDate } from '../lib/bootcamp';
import { useAuth } from '../lib/auth';

const statusBadge = (status: string) => {
  if (status === 'open') return 'bg-emerald-100 text-emerald-700';
  if (status === 'closed') return 'bg-slate-200 text-slate-600';
  return 'bg-amber-100 text-amber-700';
};

const BootcampHub: React.FC = () => {
  const { user } = useAuth();
  const [bootcamps, setBootcamps] = useState<Bootcamp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    bootcampApi
      .list()
      .then((res) => {
        if (!cancelled) setBootcamps(res.bootcamps || []);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load bootcamps.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-10 lg:space-y-14">
      <section className="section-shell surface-ring relative overflow-hidden rounded-[32px] border border-white/70 px-6 py-12 sm:px-10 lg:px-12">
        <div className="hero-orb hero-orb--blue right-[-6%] top-8 h-60 w-60" />
        <div className="hero-orb hero-orb--teal bottom-[-10%] left-[34%] h-56 w-56" />
        <div className="relative max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">Kambi Academy × FintechNG</p>
          <h1 className="mt-4 font-display text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
            Fintech Bootcamp Hub
          </h1>
          <p className="mt-6 text-base leading-8 text-slate-600 sm:text-lg">
            Join an immersive cohort to build fintech skills, ship real projects, compete, and get hired. Register for a
            bootcamp to unlock its hub — and keep full access to every Kambi Academy course.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/competitions" className="inline-flex items-center justify-center rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-white">
              See competition winners
            </Link>
            {!user && (
              <Link to="/signup" className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
                Create a free account
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="section-shell surface-ring rounded-[32px] border border-white/70 px-6 py-8 sm:px-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">Available Cohorts</p>
            <h2 className="mt-3 font-display text-3xl font-bold text-slate-950">Choose your bootcamp.</h2>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
          </div>
        ) : bootcamps.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white/70 p-12 text-center">
            <h3 className="text-xl font-semibold text-slate-900">No bootcamps yet</h3>
            <p className="mt-2 text-sm text-slate-500">New fintech cohorts are announced here. Check back soon.</p>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {bootcamps.map((bootcamp) => (
              <Link
                key={bootcamp.id}
                to={`/bootcamps/${bootcamp.slug}`}
                className="group flex flex-col overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-xl shadow-slate-200/60 transition hover:-translate-y-1 hover:shadow-2xl"
              >
                <div
                  className="h-40 w-full bg-slate-900 bg-cover bg-center"
                  style={bootcamp.cover_image_url ? { backgroundImage: `url(${bootcamp.cover_image_url})` } : undefined}
                >
                  <div className="flex h-full w-full items-start justify-between bg-gradient-to-br from-indigo-600/80 to-slate-900/70 p-4">
                    <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
                      {bootcamp.category || 'Fintech'}
                    </span>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusBadge(bootcamp.status)}`}>
                      {bootcamp.status === 'open' ? 'Enrolling' : bootcamp.status}
                    </span>
                  </div>
                </div>
                <div className="flex flex-1 flex-col gap-3 p-5">
                  <h3 className="font-display text-xl font-bold text-slate-950">{bootcamp.title}</h3>
                  {bootcamp.tagline && <p className="text-sm font-medium text-indigo-600">{bootcamp.tagline}</p>}
                  <p className="line-clamp-3 text-sm leading-6 text-slate-600">{bootcamp.description}</p>
                  <div className="mt-auto flex items-center justify-between pt-2 text-sm font-semibold text-slate-950">
                    <span>{Number(bootcamp.price) > 0 ? `₦${Number(bootcamp.price).toLocaleString()}` : 'Free'}</span>
                    <span className="text-indigo-600 transition group-hover:translate-x-1">
                      {bootcamp.enrolled ? 'Open hub →' : 'View & register →'}
                    </span>
                  </div>
                  {(bootcamp.start_date || bootcamp.end_date) && (
                    <p className="text-xs text-slate-400">
                      {formatBootcampDate(bootcamp.start_date)}
                      {bootcamp.end_date ? ` – ${formatBootcampDate(bootcamp.end_date)}` : ''}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default BootcampHub;
