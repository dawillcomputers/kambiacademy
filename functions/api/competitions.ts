import { getAuthUser } from '../_shared/auth';
import { canManageBootcamp, getCompetitionBootcampId } from '../_shared/bootcamp';
import { recordActivity } from '../_shared/activity';

interface Env {
  DB: D1Database;
}

interface WinnerInput {
  name?: string;
  image_url?: string;
  prize?: string;
  position?: number;
  note?: string;
}

interface CompetitionBody {
  id?: number;
  bootcamp_id?: number;
  title?: string;
  description?: string;
  image_url?: string;
  event_date?: string;
  published?: boolean;
  winners?: WinnerInput[];
}

// Attach winners to a set of competitions.
async function withWinners(db: D1Database, competitions: any[]): Promise<any[]> {
  if (competitions.length === 0) return [];
  const ids = competitions.map((c) => Number(c.id));
  const placeholders = ids.map(() => '?').join(',');
  const { results } = await db.prepare(
    `SELECT id, competition_id, name, image_url, prize, position, note
     FROM bootcamp_competition_winners WHERE competition_id IN (${placeholders})
     ORDER BY position ASC, id ASC`,
  ).bind(...ids).all<any>();

  const byCompetition = new Map<number, any[]>();
  for (const w of results || []) {
    const key = Number(w.competition_id);
    if (!byCompetition.has(key)) byCompetition.set(key, []);
    byCompetition.get(key)!.push(w);
  }

  return competitions.map((c) => ({ ...c, published: !!c.published, winners: byCompetition.get(Number(c.id)) || [] }));
}

// GET /api/competitions
//   (default)        -> public: published competitions + winners across all bootcamps
//   ?bootcamp=ID     -> manager/super admin: every competition for that bootcamp
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const bootcampParam = url.searchParams.get('bootcamp');

  if (bootcampParam) {
    const bootcampId = Number(bootcampParam);
    const user = await getAuthUser(request, env.DB);
    if (!(await canManageBootcamp(env.DB, user, bootcampId))) {
      return Response.json({ error: 'You cannot manage this bootcamp.' }, { status: 403 });
    }
    const { results } = await env.DB.prepare(
      `SELECT * FROM bootcamp_competitions WHERE bootcamp_id = ? ORDER BY created_at DESC`,
    ).bind(bootcampId).all<any>();
    return Response.json({ competitions: await withWinners(env.DB, results || []) });
  }

  // Public showcase for the Kambi Academy website.
  const { results } = await env.DB.prepare(
    `SELECT c.id, c.bootcamp_id, c.title, c.description, c.image_url, c.event_date, c.published, c.created_at,
            b.title AS bootcamp_title, b.slug AS bootcamp_slug
     FROM bootcamp_competitions c
     JOIN bootcamps b ON c.bootcamp_id = b.id
     WHERE c.published = 1
     ORDER BY COALESCE(c.event_date, c.created_at) DESC`,
  ).all<any>();

  return Response.json(
    { competitions: await withWinners(env.DB, results || []) },
    { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300' } },
  );
};

// POST /api/competitions — manager/super admin creates a competition (with winners).
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json<CompetitionBody>();
  if (!body.bootcamp_id || !body.title) {
    return Response.json({ error: 'bootcamp_id and title are required.' }, { status: 400 });
  }

  if (!(await canManageBootcamp(env.DB, user, body.bootcamp_id))) {
    return Response.json({ error: 'You cannot manage this bootcamp.' }, { status: 403 });
  }

  const result = await env.DB.prepare(
    `INSERT INTO bootcamp_competitions (bootcamp_id, title, description, image_url, event_date, published, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      body.bootcamp_id,
      body.title,
      body.description || '',
      body.image_url || '',
      body.event_date || null,
      body.published ? 1 : 0,
      user.id,
    )
    .run();

  const competitionId = Number(result.meta.last_row_id);
  await replaceWinners(env.DB, competitionId, body.winners);

  await recordActivity(env.DB, {
    bootcampId: body.bootcamp_id,
    type: 'competition',
    title: `New competition: ${body.title}`,
    body: body.description || '',
    link: '/competitions',
    refId: competitionId,
    createdBy: user.id,
  });

  return Response.json({ message: 'Competition posted.', id: competitionId }, { status: 201 });
};

// PATCH /api/competitions — update a competition; replaces winners when provided.
export const onRequestPatch: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json<CompetitionBody>();
  if (!body.id) return Response.json({ error: 'A competition id is required.' }, { status: 400 });

  const bootcampId = await getCompetitionBootcampId(env.DB, body.id);
  if (!bootcampId) return Response.json({ error: 'Competition not found.' }, { status: 404 });
  if (!(await canManageBootcamp(env.DB, user, bootcampId))) {
    return Response.json({ error: 'You cannot manage this bootcamp.' }, { status: 403 });
  }

  const updates: string[] = [];
  const binds: unknown[] = [];
  const set = (column: string, value: unknown) => {
    updates.push(`${column} = ?`);
    binds.push(value);
  };

  if (body.title !== undefined) set('title', body.title);
  if (body.description !== undefined) set('description', body.description);
  if (body.image_url !== undefined) set('image_url', body.image_url);
  if (body.event_date !== undefined) set('event_date', body.event_date || null);
  if (body.published !== undefined) set('published', body.published ? 1 : 0);

  if (updates.length > 0) {
    set('updated_at', new Date().toISOString());
    binds.push(body.id);
    await env.DB.prepare(`UPDATE bootcamp_competitions SET ${updates.join(', ')} WHERE id = ?`).bind(...binds).run();
  }

  if (Array.isArray(body.winners)) {
    await replaceWinners(env.DB, body.id, body.winners);
  }

  return Response.json({ message: 'Competition updated.' });
};

// DELETE /api/competitions?id= — remove a competition and its winners.
export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const id = Number(url.searchParams.get('id'));
  if (!id) return Response.json({ error: 'A competition id is required.' }, { status: 400 });

  const bootcampId = await getCompetitionBootcampId(env.DB, id);
  if (!bootcampId) return Response.json({ error: 'Competition not found.' }, { status: 404 });
  if (!(await canManageBootcamp(env.DB, user, bootcampId))) {
    return Response.json({ error: 'You cannot manage this bootcamp.' }, { status: 403 });
  }

  await env.DB.batch([
    env.DB.prepare('DELETE FROM bootcamp_competition_winners WHERE competition_id = ?').bind(id),
    env.DB.prepare('DELETE FROM bootcamp_competitions WHERE id = ?').bind(id),
  ]);

  return Response.json({ message: 'Competition removed.' });
};

// Replace the winner list for a competition atomically.
async function replaceWinners(db: D1Database, competitionId: number, winners?: WinnerInput[]): Promise<void> {
  if (!Array.isArray(winners)) return;
  const valid = winners.filter((w) => w && (w.name || '').trim());
  const statements = [db.prepare('DELETE FROM bootcamp_competition_winners WHERE competition_id = ?').bind(competitionId)];
  valid.forEach((w, index) => {
    statements.push(
      db.prepare(
        `INSERT INTO bootcamp_competition_winners (competition_id, name, image_url, prize, position, note)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).bind(competitionId, (w.name || '').trim(), w.image_url || '', w.prize || '', Number(w.position ?? index + 1), w.note || ''),
    );
  });
  await db.batch(statements);
}
