import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ActivityItem, Bootcamp, BootcampCompetition, BootcampResource, Facilitator, LiveSession,
  activityApi, bootcampApi, formatBootcampDate, liveApi,
} from '../../../../lib/bootcamp';

const typeBadge = (type: string) => {
  if (type === 'announcement') return 'bg-amber-100 text-amber-700';
  if (type === 'text') return 'bg-slate-100 text-slate-600';
  return 'bg-indigo-100 text-indigo-700';
};

const PROVIDER_LABEL: Record<string, string> = { zoom: 'Zoom', meet: 'Google Meet', teams: 'Microsoft Teams', other: 'Live' };

// Build a Google Calendar "add event" link for a live session.
const calendarUrl = (s: LiveSession): string => {
  const start = s.starts_at ? new Date(s.starts_at) : new Date();
  const end = new Date(start.getTime() + (s.duration_minutes || 60) * 60000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: s.title,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: `${s.description || ''}${s.url ? `\nJoin: ${s.url}` : ''}${s.meeting_id ? `\nMeeting ID: ${s.meeting_id}` : ''}${s.passcode ? `\nPasscode: ${s.passcode}` : ''}`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

const StudentBootcampDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [bootcamp, setBootcamp] = useState<Bootcamp | null>(null);
  const [resources, setResources] = useState<BootcampResource[]>([]);
  const [competitions, setCompetitions] = useState<BootcampCompetition[]>([]);
  const [team, setTeam] = useState<Facilitator[]>([]);
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [teamFilter, setTeamFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const filteredTeam = team.filter((m) => {
    const q = teamFilter.trim().toLowerCase();
    if (!q) return true;
    return [m.name, m.email, m.expertise, m.industry, m.country, m.role].some((v) => (v || '').toLowerCase().includes(q));
  });

  const load = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const mine = await bootcampApi.myEnrollments();
      const match = (mine.bootcamps || []).find((b) => b.slug === slug) || null;
      setBootcamp(match);

      if (match) {
        const [resourceRes, competitionRes, teamRes, liveRes, activityRes] = await Promise.all([
          bootcampApi.resources(match.id).catch(() => ({ resources: [] as BootcampResource[] })),
          bootcampApi.publicCompetitions().catch(() => ({ competitions: [] as BootcampCompetition[] })),
          bootcampApi.facilitators(match.id).catch(() => ({ facilitators: [] as Facilitator[] })),
          liveApi.list(match.id).catch(() => ({ sessions: [] as LiveSession[] })),
          activityApi.list(match.id).catch(() => ({ activity: [] as ActivityItem[] })),
        ]);
        setResources(resourceRes.resources || []);
        setCompetitions((competitionRes.competitions || []).filter((c) => c.bootcamp_slug === slug));
        setTeam(teamRes.facilitators || []);
        setSessions(liveRes.sessions || []);
        setActivity(activityRes.activity || []);
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

  const react = async (item: ActivityItem, kind: 'like' | 'save') => {
    // Optimistic toggle.
    setActivity((prev) => prev.map((a) => {
      if (a.id !== item.id) return a;
      if (kind === 'like') return { ...a, liked: !a.liked, like_count: a.like_count + (a.liked ? -1 : 1) };
      return { ...a, saved: !a.saved, save_count: a.save_count + (a.saved ? -1 : 1) };
    }));
    try { await activityApi.react(item.id, kind); }
    catch { void load(); }
  };

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

  const upcoming = sessions.filter((s) => s.status !== 'ended');

  const navChips = [
    { href: '#overview', label: 'Overview' },
    { href: '#live', label: `Live${upcoming.length ? ` (${upcoming.length})` : ''}` },
    { href: '#materials', label: 'Materials' },
    { href: '#community', label: 'Community' },
  ];

  return (
    <div className="space-y-8" id="overview">
      {/* Bootcamp-area section nav — works as quick navigation on mobile and desktop */}
      <div className="sticky top-0 z-20 -mx-4 flex gap-2 overflow-x-auto border-b border-white/10 bg-slate-950/80 px-4 py-2 backdrop-blur md:-mx-6 md:px-6">
        {navChips.map((c) => (
          <a key={c.href} href={c.href} className="shrink-0 rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold text-white/80 transition hover:bg-white/20 hover:text-white">
            {c.label}
          </a>
        ))}
      </div>

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

      {team.length > 0 && (
        <section className="rounded-3xl bg-white p-6 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900">Facilitators & mentors</h2>
            <input
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              placeholder="Search name, expertise, industry…"
              className="w-full max-w-xs rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTeam.map((m) => (
              <div key={m.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-600 text-sm font-bold text-white">
                    {m.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{m.name}</p>
                    <p className="text-xs font-medium capitalize text-indigo-600">{m.role}</p>
                  </div>
                </div>
                {(m.expertise || m.industry || m.country) && (
                  <p className="mt-2 text-xs text-slate-500">{[m.expertise, m.industry, m.country].filter(Boolean).join(' · ')}</p>
                )}
                {m.bio && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{m.bio}</p>}
                {m.linkedin_url && <a href={m.linkedin_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-semibold text-indigo-600 hover:underline">LinkedIn ↗</a>}
              </div>
            ))}
            {filteredTeam.length === 0 && <p className="text-sm text-slate-500">No team members match “{teamFilter}”.</p>}
          </div>
        </section>
      )}

      <section id="live" className="scroll-mt-16 rounded-3xl bg-white p-6 shadow-lg">
        <h2 className="text-lg font-bold text-slate-900">🎥 Live classes</h2>
        <p className="text-sm text-slate-500">Join scheduled sessions and add them to your calendar.</p>
        {sessions.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
            No live sessions scheduled yet.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {sessions.map((s) => (
              <li key={s.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-indigo-600">{PROVIDER_LABEL[s.provider] || 'Live'}</span>
                      {s.status === 'live' && <span className="flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-rose-700"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-600" />Live now</span>}
                      {s.status === 'ended' && <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-500">Ended</span>}
                    </div>
                    <p className="mt-1 font-semibold text-slate-900">{s.title}</p>
                    <p className="text-xs text-slate-500">{s.starts_at ? new Date(s.starts_at).toLocaleString() : 'Time TBA'} · {s.duration_minutes} min</p>
                    {(s.meeting_id || s.passcode) && (
                      <p className="mt-1 text-xs text-slate-500">{s.meeting_id && <>ID: <span className="font-mono">{s.meeting_id}</span></>}{s.meeting_id && s.passcode ? ' · ' : ''}{s.passcode && <>Passcode: <span className="font-mono">{s.passcode}</span></>}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {s.url && s.status !== 'ended' && (
                      <a href={s.url} target="_blank" rel="noreferrer" className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700">
                        Join
                      </a>
                    )}
                    <a href={calendarUrl(s)} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50">
                      + Calendar
                    </a>
                  </div>
                </div>
                {s.description && <p className="mt-2 text-sm text-slate-600">{s.description}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="materials" className="scroll-mt-16 rounded-3xl bg-white p-6 shadow-lg">
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
                {resource.category && resource.category !== 'General' && (
                  <span className="ml-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-indigo-600">{resource.category}</span>
                )}
                {resource.description && <p className="mt-1 text-sm text-slate-600">{resource.description}</p>}
                {resource.content && <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{resource.content}</p>}
                {resource.url && (
                  <a href={resource.url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-sm font-medium text-indigo-600 hover:underline">
                    Open resource →
                  </a>
                )}
                {resource.type === 'file' && resource.file_name && (
                  <a href={bootcampApi.resourceDownloadUrl(resource.id)} className="mt-1 inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:underline">
                    ⬇ Download {resource.file_name}
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
                  {competition.prizes && competition.prizes.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {competition.prizes.map((p, i) => (
                        <p key={p.id ?? i} className="text-xs text-slate-600"><span className="font-semibold text-amber-600">{p.title || `Prize ${i + 1}`}:</span> {p.reward}</p>
                      ))}
                    </div>
                  )}
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

      <section id="community" className="scroll-mt-16 rounded-3xl bg-white p-6 shadow-lg">
        <h2 className="text-lg font-bold text-slate-900">📣 Community activity</h2>
        <p className="text-sm text-slate-500">Everything happening in your bootcamp — materials, competitions, live sessions and announcements.</p>
        {activity.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
            No activity yet.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {activity.map((a) => (
              <li key={a.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl leading-none">{a.icon || '✨'}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900">{a.title}</p>
                    {a.body && <p className="mt-0.5 text-sm text-slate-600">{a.body}</p>}
                    <p className="mt-1 text-xs text-slate-400">
                      {a.author_name ? `${a.author_name} · ` : ''}{formatBootcampDate(a.created_at)}
                    </p>
                    <div className="mt-2 flex items-center gap-3">
                      <button onClick={() => react(a, 'like')} className={`flex items-center gap-1 text-xs font-semibold transition ${a.liked ? 'text-rose-600' : 'text-slate-500 hover:text-slate-700'}`}>
                        {a.liked ? '❤️' : '🤍'} {a.like_count > 0 ? a.like_count : ''} Like
                      </button>
                      <button onClick={() => react(a, 'save')} className={`flex items-center gap-1 text-xs font-semibold transition ${a.saved ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>
                        {a.saved ? '🔖' : '📑'} Save
                      </button>
                      {a.link && a.link.startsWith('http') && (
                        <a href={a.link} target="_blank" rel="noreferrer" className="text-xs font-semibold text-indigo-600 hover:underline">Open →</a>
                      )}
                      {a.link && a.link.startsWith('#') && (
                        <a href={a.link} className="text-xs font-semibold text-indigo-600 hover:underline">View →</a>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default StudentBootcampDetail;
