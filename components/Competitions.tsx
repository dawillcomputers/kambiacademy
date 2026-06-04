import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BootcampCompetition, bootcampApi, formatBootcampDate } from '../lib/bootcamp';

const WinnerCard: React.FC<{ winner: BootcampCompetition['winners'][number] }> = ({ winner }) => (
  <div className="flex items-center gap-4 rounded-2xl border border-white/70 bg-white/85 p-4 shadow-sm">
    {winner.image_url ? (
      <img src={winner.image_url} alt={winner.name} className="h-16 w-16 shrink-0 rounded-2xl object-cover" />
    ) : (
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-slate-900 text-lg font-bold text-white">
        {winner.name.charAt(0).toUpperCase()}
      </div>
    )}
    <div className="min-w-0">
      <p className="truncate font-semibold text-slate-950">{winner.name}</p>
      {winner.prize && <p className="text-sm font-medium text-indigo-600">{winner.prize}</p>}
      {winner.note && <p className="truncate text-xs text-slate-500">{winner.note}</p>}
    </div>
  </div>
);

export const CompetitionCard: React.FC<{ competition: BootcampCompetition }> = ({ competition }) => (
  <article className="overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-xl shadow-slate-200/60">
    {competition.image_url && (
      <img src={competition.image_url} alt={competition.title} className="h-48 w-full object-cover" />
    )}
    <div className="space-y-5 p-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          {competition.bootcamp_title && (
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
              {competition.bootcamp_title}
            </span>
          )}
          {competition.event_date && (
            <span className="text-xs font-medium text-slate-400">{formatBootcampDate(competition.event_date)}</span>
          )}
        </div>
        <h3 className="mt-3 font-display text-2xl font-bold text-slate-950">{competition.title}</h3>
        {competition.description && <p className="mt-2 text-sm leading-6 text-slate-600">{competition.description}</p>}
      </div>

      {competition.winners.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">🏆 Winners</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {competition.winners.map((winner, index) => (
              <WinnerCard key={winner.id ?? index} winner={winner} />
            ))}
          </div>
        </div>
      )}
    </div>
  </article>
);

const Competitions: React.FC = () => {
  const [competitions, setCompetitions] = useState<BootcampCompetition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    bootcampApi
      .publicCompetitions()
      .then((res) => {
        if (!cancelled) setCompetitions(res.competitions || []);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load competitions.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-10">
      <section className="section-shell surface-ring relative overflow-hidden rounded-[32px] border border-white/70 px-6 py-12 sm:px-10">
        <div className="hero-orb hero-orb--amber left-[-8%] top-[-8%] h-52 w-52" />
        <div className="relative max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">Bootcamp Showcase</p>
          <h1 className="mt-4 font-display text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
            Competitions & Winners
          </h1>
          <p className="mt-6 text-base leading-8 text-slate-600 sm:text-lg">
            Celebrating the standout builders, teams, and ideas from Kambi Academy fintech bootcamps.
          </p>
          <Link to="/bootcamps" className="mt-8 inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
            Explore bootcamps
          </Link>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
        </div>
      ) : competitions.length === 0 ? (
        <div className="section-shell surface-ring rounded-[32px] border border-dashed border-slate-300 px-6 py-16 text-center">
          <h2 className="font-display text-2xl font-bold text-slate-900">No competitions published yet</h2>
          <p className="mt-2 text-sm text-slate-500">Winners and highlights from our bootcamps will appear here.</p>
        </div>
      ) : (
        <section data-reveal className="grid gap-6 lg:grid-cols-2">
          {competitions.map((competition) => (
            <CompetitionCard key={competition.id} competition={competition} />
          ))}
        </section>
      )}
    </div>
  );
};

export default Competitions;
