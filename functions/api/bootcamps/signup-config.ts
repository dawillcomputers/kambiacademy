interface Env {
  DB: D1Database;
}

const parseArray = (value: unknown): any[] => {
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

// Default optional sections when a manager hasn't configured anything yet
// (keeps the form short). Personal + consent are always present.
const DEFAULT_SECTIONS = ['location'];

const DEFAULT_BENEFITS = [
  'Learn from industry experts',
  'Build real, hands-on projects',
  'Network with peers and mentors',
  'Earn a certificate of completion',
];

// GET /api/bootcamps/signup-config?slug=… — public registration config for the wizard.
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const slug = url.searchParams.get('slug');
  const idParam = url.searchParams.get('id');
  if (!slug && !idParam) return Response.json({ error: 'A bootcamp slug or id is required.' }, { status: 400 });

  const bootcamp = slug
    ? await env.DB.prepare('SELECT * FROM bootcamps WHERE slug = ?').bind(slug).first<any>()
    : await env.DB.prepare('SELECT * FROM bootcamps WHERE id = ?').bind(Number(idParam)).first<any>();

  if (!bootcamp) return Response.json({ error: 'Bootcamp not found.' }, { status: 404 });

  const enrollment = await env.DB.prepare(
    "SELECT COUNT(*) AS c FROM bootcamp_enrollments WHERE bootcamp_id = ? AND status = 'active'",
  ).bind(bootcamp.id).first<{ c: number }>();
  const facilitatorCount = await env.DB.prepare(
    'SELECT COUNT(*) AS c FROM bootcamp_facilitators WHERE bootcamp_id = ?',
  ).bind(bootcamp.id).first<{ c: number }>();

  const enrolled = Number(enrollment?.c || 0);
  const initial = Number(bootcamp.initial_participants || 0);
  const participants = initial + enrolled;

  const benefits = parseArray(bootcamp.signup_benefits);
  const customStats = parseArray(bootcamp.signup_stats);
  const sections = parseArray(bootcamp.signup_sections);
  const interests = parseArray(bootcamp.signup_interests).filter((s) => typeof s === 'string');

  // Live "Participants" stat first, then any custom stats the manager added.
  const stats = [
    { label: 'Participants', value: participants.toLocaleString() },
    ...(Number(facilitatorCount?.c || 0) > 0 ? [{ label: 'Facilitators & Mentors', value: String(facilitatorCount?.c) }] : []),
    ...customStats.filter((s) => s && typeof s.label === 'string' && typeof s.value === 'string'),
  ];

  return Response.json(
    {
      bootcampId: bootcamp.id,
      slug: bootcamp.slug,
      title: bootcamp.title,
      status: bootcamp.status,
      headline: (bootcamp.signup_headline || '').trim() || `Join ${bootcamp.title}`,
      subtitle: (bootcamp.signup_subtitle || '').trim(),
      benefits: benefits.length ? benefits.filter((b) => typeof b === 'string') : DEFAULT_BENEFITS,
      stats,
      sections: sections.length ? sections.filter((s) => typeof s === 'string') : DEFAULT_SECTIONS,
      interests,
    },
    { headers: { 'Cache-Control': 'public, max-age=30' } },
  );
};
