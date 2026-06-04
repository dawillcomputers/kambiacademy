import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Bootcamp, BootcampCompetition, BootcampResource, bootcampApi, formatBootcampDate } from '../../../../lib/bootcamp';

const typeBadge = (type: string) => {
  if (type === 'announcement') return 'bg-amber-100 text-amber-700';
  if (type === 'text') return 'bg-slate-100 text-slate-600';
  return 'bg-indigo-100 text-indigo-700';
};

const StudentBootcampDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [bootcamp, setBootcamp] = useState<Bootcamp | null>(null);
  const [resources, setResources] = useState<BootcampResource[]>([]);
  const [competitions, setCompetitions] = useState<BootcampCompetition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const mine = await bootcampApi.myEnrollments();
      const match = (mine.bootcamps || []).find((b) => b.slug === slug) || null;
      setBootcamp(match);

      if (match) {
        const [resourceRes, competitionRes] = await Promise.all([
          bootcampApi.resources(match.id).catch(() => ({ resources: [] as BootcampResource[] })),
          bootcampApi.publicCompetitions().catch(() => ({ competitions: [] as BootcampCompetition[] })),
        ]);
        setResources(resourceRes.resources || []);
        setCompetitions((competitionRes.competitions || []).filter((c) => c.bootcamp_slug === slug));
        setError('');
      } else {
        setError('You are not enrolled in this bootcamp.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load the bootcamp hub.');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-white" />
      </div>
    );
  }

  if (!bootcamp) {
    return (
      <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-10 text-center">
        <h2 className="text-2xl font-semibold text-white">Bootcamp unavailable</h2>
        <p className="mt-2 text-sm text-white/70">{error || 'You do not have access to this bootcamp.'}</p>
        <Link to="/student/bootcamp" className="mt-6 inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-900">
          Back to my bootcamps
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="overflow-hidden rounded-3xl bg-white shadow-lg">
        <div
          className="h-40 w-full bg-slate-800 bg-cover bg-center"
          style={bootcamp.cover_image_url ? { backgroundImage: `url(${bootcamp.cover_image_url})` } : undefined}
        >
          <div className="flex h-full w-full flex-col justify-end bg-gradient-to-t from-slate-950/80 to-transparent p-6">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold uppercase text-slate-700">{bootcamp.category}</span>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${bootcamp.status === 'open' ? 'bg-emerald-500 text-white' : 'bg-slate-500 text-white'}`}>
                {bootcamp.status === 'open' ? 'Active' : 'Completed'}
              </span>
            </div>
            <h1 className="mt-2 font-display text-3xl font-bold text-white">{bootcamp.title}</h1>
          </div>
        </div>
        <div className="p-6">
          {bootcamp.tagline && <p className="font-medium text-indigo-600">{bootcamp.tagline}</p>}
          <p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-600">{bootcamp.description}</p>
          {(bootcamp.start_date || bootcamp.end_date) && (
            <p className="mt-3 text-xs font-medium text-slate-400">
              {formatBootcampDate(bootcamp.start_date)}{bootcamp.end_date ? ` – ${formatBootcampDate(bootcamp.end_date)}` : ''}
            </p>
          )}
        </div>
      </div>

      <section className="rounded-3xl bg-white p-6 shadow-lg">
        <h2 className="text-lg font-bold text-slate-900">Hub content</h2>
        <p className="text-sm text-slate-500">Resources and announcements from your bootcamp manager.</p>
        {resources.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
            No content posted yet — check back soon.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {resources.map((resource) => (
              <li key={resource.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${typeBadge(resource.type)}`}>{resource.type}</span>
                  <p className="font-semibold text-slate-900">{resource.title}</p>
                </div>
                {resource.description && <p className="mt-1 text-sm text-slate-600">{resource.description}</p>}
                {resource.content && <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{resource.content}</p>}
                {resource.url && (
                  <a href={resource.url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-sm font-medium text-indigo-600 hover:underline">
                    Open resource →
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {competitions.length > 0 && (
        <section className="rounded-3xl bg-white p-6 shadow-lg">
          <h2 className="text-lg font-bold text-slate-900">🏆 Competitions & winners</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {competitions.map((competition) => (
              <div key={competition.id} className="overflow-hidden rounded-2xl border border-slate-200">
                {competition.image_url && <img src={competition.image_url} alt={competition.title} className="h-28 w-full object-cover" />}
                <div className="p-4">
                  <p className="font-semibold text-slate-900">{competition.title}</p>
                  {competition.description && <p className="mt-1 text-sm text-slate-600">{competition.description}</p>}
                  {competition.winners.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {competition.winners.map((winner, index) => (
                        <span key={winner.id ?? index} className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                          🏆 {winner.name}{winner.prize ? ` · ${winner.prize}` : ''}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default StudentBootcampDetail;
