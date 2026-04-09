import { CourseTone, SessionStatus } from '../types';

const courseToneMap = {
  amber: {
    gradient: 'from-amber-300 via-orange-500 to-rose-600',
    badge: 'border-amber-200 bg-amber-50 text-amber-700',
    accent: 'text-amber-700',
    border: 'border-amber-100',
  },
  indigo: {
    gradient: 'from-sky-400 via-indigo-500 to-violet-700',
    badge: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    accent: 'text-indigo-700',
    border: 'border-indigo-100',
  },
  rose: {
    gradient: 'from-fuchsia-300 via-rose-500 to-red-700',
    badge: 'border-rose-200 bg-rose-50 text-rose-700',
    accent: 'text-rose-700',
    border: 'border-rose-100',
  },
  teal: {
    gradient: 'from-emerald-300 via-teal-500 to-cyan-700',
    badge: 'border-teal-200 bg-teal-50 text-teal-700',
    accent: 'text-teal-700',
    border: 'border-teal-100',
  },
} as const satisfies Record<
  CourseTone,
  {
    gradient: string;
    badge: string;
    accent: string;
    border: string;
  }
>;

const sessionStatusMap = {
  open: 'bg-emerald-100 text-emerald-700',
  upcoming: 'bg-amber-100 text-amber-700',
} as const satisfies Record<SessionStatus, string>;

export const primaryLinkClass =
  'inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800';

export const secondaryLinkClass =
  'inline-flex items-center justify-center rounded-full border border-slate-300 bg-white/70 px-5 py-3 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5 hover:border-slate-400 hover:bg-white';

export const getCourseTone = (tone: CourseTone) => courseToneMap[tone];

export const getSessionStatusClasses = (status: SessionStatus) => sessionStatusMap[status];

export const getInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

export const formatSessionDate = (isoTimestamp: string) =>
  new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(isoTimestamp));

export const formatDuration = (durationMinutes: number) => {
  if (durationMinutes < 60) {
    return `${durationMinutes} minutes`;
  }

  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;

  if (minutes === 0) {
    return `${hours} hour${hours === 1 ? '' : 's'}`;
  }

  return `${hours}h ${minutes}m`;
};