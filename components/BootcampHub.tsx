import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bootcamp, bootcampApi, formatBootcampDate } from '../lib/bootcamp';
import { api } from '../lib/api';
import { HeroSlide } from '../types';
import HeroCarousel from './HeroCarousel';

const statusBadge = (status: string) => {
  if (status === 'open') return 'bg-emerald-500/90 text-white';
  if (status === 'closed') return 'bg-slate-500/90 text-white';
  return 'bg-amber-500/90 text-white';
};

const HIGHLIGHTS = ['Hands-on real projects', 'Expert-led mentorship', 'Compete & get hired', 'Full Kambi course access'];

const BootcampHub: React.FC = () => {
  const [bootcamps, setBootcamps] = useState<Bootcamp[]>([]);
  const [heroSlides, setHeroSlides] = useState<HeroSlide[] | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([bootcampApi.list(), api.getSite()]).then(([camps, site]) => {
      if (cancelled) return;
      if (camps.status === 'fulfilled') setBootcamps(camps.value.bootcamps || []);
      else setError(camps.reason instanceof Error ? camps.reason.message : 'Failed to load bootcamps.');
      if (site.status === 'fulfilled' && site.value.heroSlides?.length) setHeroSlides(site.value.heroSlides);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-12 lg:space-y-16">
      <HeroCarousel
        slides={heroSlides}
        eyebrow="Kambi Academy Bootcamps"
        headline="Find your bootcamp. Build what's next."
        description="Join immersive, hands-on cohorts led by industry experts — across tech, design, business, finance and beyond. Build real projects, compete, and get hired, while keeping full access to every Kambi Academy course."
        highlights={HIGHLIGHTS}
        primaryCta={{ label: 'See competition winners', href: '/competitions' }}
        secondaryCta={{ label: 'Explore courses', href: '/courses' }}
      />

      <section className="space-y-8">
        <div data-reveal className="flex flex-col gap-2 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-indigo-500">Available Cohorts</p>
          <h2 className="font-display text-3xl font-bold text-slate-950 sm:text-4xl">Choose a bootcamp to join</h2>
          <p className="mx-auto max-w-2xl text-sm leading-7 text-slate-600">
            Every cohort has its own hub, mentors, and competitions. Register once to unlock yours.
          </p>
        </div>

        {error && (
          <div className="mx-auto max-w-xl rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-center text-sm font-medium text-rose-700">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-500" />
          </div>
        ) : bootcamps.length === 0 ? (
          <div className="mx-auto max-w-xl rounded-3xl border border-dashed border-slate-300 bg-white/70 p-12 text-center">
            <div className="text-4xl">🚀</div>
            <h3 className="mt-3 text-xl font-semibold text-slate-900">No bootcamps yet</h3>
            <p className="mt-2 text-sm text-slate-500">New cohorts are announced here. Check back soon.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {bootcamps.map((bootcamp, index) => (
              <Link
                key={bootcamp.id}
                to={`/bootcamps/${bootcamp.slug}`}
                style={{ animationDelay: `${Math.min(index * 80, 480)}ms` }}
                className="hover-lift glow-ring group flex animate-fade-in-up flex-col overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-xl shadow-slate-200/60"
              >
                <div className="relative h-44 w-full overflow-hidden bg-slate-900">
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                    style={bootcamp.cover_image_url ? { backgroundImage: `url(${bootcamp.cover_image_url})` } : { backgroundImage: 'linear-gradient(135deg,#4f46e5,#9333ea,#db2777)' }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-900/10 to-transparent" />
                  <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4">
                    <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700 backdrop-blur">
                      {bootcamp.category || 'Bootcamp'}
                    </span>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize backdrop-blur ${statusBadge(bootcamp.status)}`}>
                      {bootcamp.status === 'open' ? 'Enrolling' : bootcamp.status}
                    </span>
                  </div>
                </div>
                <div className="flex flex-1 flex-col gap-3 p-5">
                  <h3 className="font-display text-xl font-bold text-slate-950">{bootcamp.title}</h3>
                  {bootcamp.tagline && <p className="text-sm font-medium text-indigo-600">{bootcamp.tagline}</p>}
                  <p className="line-clamp-3 text-sm leading-6 text-slate-600">{bootcamp.description}</p>
                  {(bootcamp.start_date || bootcamp.end_date) && (
                    <p className="text-xs text-slate-400">
                      {formatBootcampDate(bootcamp.start_date)}
                      {bootcamp.end_date ? ` – ${formatBootcampDate(bootcamp.end_date)}` : ''}
                    </p>
                  )}
                  <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3 text-sm font-semibold text-slate-950">
                    <span>{Number(bootcamp.price) > 0 ? `₦${Number(bootcamp.price).toLocaleString()}` : 'Free'}</span>
                    <span className="inline-flex items-center gap-1 text-indigo-600 transition group-hover:gap-2">
                      {bootcamp.enrolled ? 'Open hub' : 'View & register'} <span className="transition group-hover:translate-x-0.5">→</span>
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section data-reveal className="bg-gradient-animated overflow-hidden rounded-[32px] border border-indigo-900 bg-gradient-to-br from-indigo-700 via-violet-700 to-fuchsia-700 px-6 py-10 text-center text-white shadow-2xl sm:px-10">
        <h2 className="mx-auto max-w-2xl font-display text-3xl font-bold">A cohort for every ambition.</h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-indigo-100">
          Pick a bootcamp above and complete a quick registration to get your account and unlock your hub.
        </p>
        <Link to="/competitions" className="mt-6 inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5">
          Meet our winners
        </Link>
      </section>
    </div>
  );
};

export default BootcampHub;
