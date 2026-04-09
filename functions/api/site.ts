interface Env {
  DB: D1Database;
}

const SECTION_KEYS = [
  'branding',
  'hero',
  'stats',
  'about',
  'contact',
  'tutorProgram',
  'meet',
  'instructors',
  'courses',
  'testimonials',
  'faqs',
  'sessions',
] as const;

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const { results } = await env.DB.prepare(
    'SELECT key, data FROM site_sections WHERE key IN (' +
      SECTION_KEYS.map(() => '?').join(',') +
      ')',
  )
    .bind(...SECTION_KEYS)
    .all<{ key: string; data: string }>();

  const siteData: Record<string, unknown> = {};

  for (const row of results) {
    try {
      siteData[row.key] = JSON.parse(row.data);
    } catch {
      siteData[row.key] = row.data;
    }
  }

  return Response.json(siteData, {
    headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300' },
  });
};
