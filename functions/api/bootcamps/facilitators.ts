import { getAuthUser } from '../../_shared/auth';
import { canManageBootcamp, canViewBootcamp } from '../../_shared/bootcamp';

interface Env {
  DB: D1Database;
}

// GET /api/bootcamps/facilitators?bootcamp=ID — view a bootcamp's team.
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const bootcampId = Number(url.searchParams.get('bootcamp'));
  if (!bootcampId) return Response.json({ error: 'A bootcamp id is required.' }, { status: 400 });

  if (!(await canViewBootcamp(env.DB, user, bootcampId))) {
    return Response.json({ error: 'You cannot view this bootcamp.' }, { status: 403 });
  }

  const { results } = await env.DB.prepare(
    `SELECT id, bootcamp_id, user_id, name, email, role, industry, expertise, country, linkedin_url, bio, avatar_url, created_at
     FROM bootcamp_facilitators WHERE bootcamp_id = ? ORDER BY role, name`,
  ).bind(bootcampId).all();

  return Response.json({ facilitators: results });
};

// PATCH /api/bootcamps/facilitators — update a team member's profile.
export const onRequestPatch: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json<{
    id?: number; role?: string; industry?: string; expertise?: string; country?: string; linkedin_url?: string; bio?: string; avatar_url?: string;
  }>();
  if (!body.id) return Response.json({ error: 'An id is required.' }, { status: 400 });

  const row = await env.DB.prepare('SELECT bootcamp_id FROM bootcamp_facilitators WHERE id = ?').bind(body.id).first<{ bootcamp_id: number }>();
  if (!row) return Response.json({ error: 'Not found.' }, { status: 404 });
  if (!(await canManageBootcamp(env.DB, user, row.bootcamp_id))) {
    return Response.json({ error: 'You cannot manage this bootcamp.' }, { status: 403 });
  }

  const updates: string[] = [];
  const binds: unknown[] = [];
  const set = (col: string, val: unknown) => { updates.push(`${col} = ?`); binds.push(val); };
  if (body.role !== undefined) set('role', body.role === 'mentor' ? 'mentor' : 'facilitator');
  if (body.industry !== undefined) set('industry', body.industry);
  if (body.expertise !== undefined) set('expertise', body.expertise);
  if (body.country !== undefined) set('country', body.country);
  if (body.linkedin_url !== undefined) set('linkedin_url', body.linkedin_url);
  if (body.bio !== undefined) set('bio', body.bio);
  if (body.avatar_url !== undefined) set('avatar_url', body.avatar_url);
  if (updates.length === 0) return Response.json({ message: 'Nothing to update.' });
  binds.push(body.id);
  await env.DB.prepare(`UPDATE bootcamp_facilitators SET ${updates.join(', ')} WHERE id = ?`).bind(...binds).run();
  return Response.json({ message: 'Profile updated.' });
};

// POST /api/bootcamps/facilitators — manager/super admin appoints a facilitator or mentor.
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json<{ bootcamp_id?: number; user_id?: number; name?: string; email?: string; role?: string }>();
  if (!body.bootcamp_id) return Response.json({ error: 'bootcamp_id is required.' }, { status: 400 });

  if (!(await canManageBootcamp(env.DB, user, body.bootcamp_id))) {
    return Response.json({ error: 'You cannot manage this bootcamp.' }, { status: 403 });
  }

  const role = body.role === 'mentor' ? 'mentor' : 'facilitator';

  // Resolve name/email from the registrant account if a user_id is supplied.
  let name = body.name?.trim() || '';
  let email = body.email?.trim() || '';
  if (body.user_id && (!name || !email)) {
    const u = await env.DB.prepare('SELECT name, email FROM users WHERE id = ?').bind(body.user_id).first<{ name: string; email: string }>();
    if (u) {
      name = name || u.name;
      email = email || u.email;
    }
  }

  if (!name) return Response.json({ error: 'A name is required.' }, { status: 400 });

  await env.DB.prepare(
    `INSERT OR IGNORE INTO bootcamp_facilitators (bootcamp_id, user_id, name, email, role, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).bind(body.bootcamp_id, body.user_id ?? null, name, email, role, user.id).run();

  return Response.json({ message: `${role === 'mentor' ? 'Mentor' : 'Facilitator'} appointed.` }, { status: 201 });
};

// DELETE /api/bootcamps/facilitators?id= — remove a team member.
export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const id = Number(url.searchParams.get('id'));
  if (!id) return Response.json({ error: 'An id is required.' }, { status: 400 });

  const row = await env.DB.prepare('SELECT bootcamp_id FROM bootcamp_facilitators WHERE id = ?').bind(id).first<{ bootcamp_id: number }>();
  if (!row) return Response.json({ error: 'Not found.' }, { status: 404 });

  if (!(await canManageBootcamp(env.DB, user, row.bootcamp_id))) {
    return Response.json({ error: 'You cannot manage this bootcamp.' }, { status: 403 });
  }

  await env.DB.prepare('DELETE FROM bootcamp_facilitators WHERE id = ?').bind(id).run();
  return Response.json({ message: 'Removed.' });
};
