import { getAuthUser } from '../_shared/auth';
import { isSuperAdminRole, isBootcampManagerRole, canManageBootcamp, slugify } from '../_shared/bootcamp';

interface Env {
  DB: D1Database;
}

interface BootcampBody {
  id?: number;
  title?: string;
  slug?: string;
  tagline?: string;
  description?: string;
  cover_image_url?: string;
  category?: string;
  status?: 'open' | 'closed' | 'draft';
  price?: number;
  start_date?: string;
  end_date?: string;
  managerEmail?: string;
  action?: 'close' | 'open';
}

// GET /api/bootcamps
//   ?scope=admin   -> super admin: every bootcamp (incl. drafts) with manager + counts
//   ?scope=manage  -> bootcamp manager: bootcamps assigned to them with counts
//   (default)      -> public list of open/closed bootcamps, with `enrolled` flag when logged in
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const scope = url.searchParams.get('scope');
  const user = await getAuthUser(request, env.DB);

  if (scope === 'admin') {
    if (!isSuperAdminRole(user)) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }
    const { results } = await env.DB.prepare(
      `SELECT b.*, m.name AS manager_name, m.email AS manager_email,
              (SELECT COUNT(*) FROM bootcamp_enrollments e WHERE e.bootcamp_id = b.id AND e.status = 'active') AS enrollment_count
       FROM bootcamps b
       LEFT JOIN users m ON b.manager_id = m.id
       ORDER BY b.created_at DESC`,
    ).all();
    return Response.json({ bootcamps: results });
  }

  if (scope === 'manage') {
    if (!isBootcampManagerRole(user) && !isSuperAdminRole(user)) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }
    const query = isSuperAdminRole(user)
      ? env.DB.prepare(
          `SELECT b.*, m.name AS manager_name, m.email AS manager_email,
                  (SELECT COUNT(*) FROM bootcamp_enrollments e WHERE e.bootcamp_id = b.id AND e.status = 'active') AS enrollment_count
           FROM bootcamps b LEFT JOIN users m ON b.manager_id = m.id
           ORDER BY b.created_at DESC`,
        )
      : env.DB.prepare(
          `SELECT b.*, m.name AS manager_name, m.email AS manager_email,
                  (SELECT COUNT(*) FROM bootcamp_enrollments e WHERE e.bootcamp_id = b.id AND e.status = 'active') AS enrollment_count
           FROM bootcamps b LEFT JOIN users m ON b.manager_id = m.id
           WHERE b.manager_id = ?
           ORDER BY b.created_at DESC`,
        ).bind(user!.id);
    const { results } = await query.all();
    return Response.json({ bootcamps: results });
  }

  // Public / participant listing — only visible (non-draft) bootcamps.
  const { results } = await env.DB.prepare(
    `SELECT id, slug, title, tagline, description, cover_image_url, category, status, price, start_date, end_date,
            (SELECT COUNT(*) FROM bootcamp_enrollments e WHERE e.bootcamp_id = bootcamps.id AND e.status = 'active') AS enrollment_count
     FROM bootcamps
     WHERE status IN ('open', 'closed')
     ORDER BY CASE status WHEN 'open' THEN 0 ELSE 1 END, created_at DESC`,
  ).all<any>();

  let enrolledIds = new Set<number>();
  if (user) {
    const enr = await env.DB.prepare(
      "SELECT bootcamp_id FROM bootcamp_enrollments WHERE user_id = ? AND status = 'active'",
    ).bind(user.id).all<{ bootcamp_id: number }>();
    enrolledIds = new Set((enr.results || []).map((r) => Number(r.bootcamp_id)));
  }

  const bootcamps = (results || []).map((b: any) => ({ ...b, enrolled: enrolledIds.has(Number(b.id)) }));
  return Response.json({ bootcamps });
};

// POST /api/bootcamps — super admin creates a bootcamp.
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!isSuperAdminRole(user)) {
    return Response.json({ error: 'Only a super admin can create bootcamps.' }, { status: 403 });
  }

  const body = await request.json<BootcampBody>();
  if (!body.title || !body.title.trim()) {
    return Response.json({ error: 'A bootcamp title is required.' }, { status: 400 });
  }

  let slug = body.slug ? slugify(body.slug) : slugify(body.title);
  // Ensure slug uniqueness.
  const existing = await env.DB.prepare('SELECT id FROM bootcamps WHERE slug = ?').bind(slug).first();
  if (existing) {
    slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
  }

  let managerId: number | null = null;
  if (body.managerEmail && body.managerEmail.trim()) {
    managerId = await resolveManager(env.DB, body.managerEmail.trim());
    if (!managerId) {
      return Response.json({ error: `No user found with email ${body.managerEmail}. Ask them to create an account first.` }, { status: 400 });
    }
  }

  const status = body.status === 'draft' || body.status === 'closed' ? body.status : 'open';

  const result = await env.DB.prepare(
    `INSERT INTO bootcamps (slug, title, tagline, description, cover_image_url, category, status, price, start_date, end_date, manager_id, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      slug,
      body.title.trim(),
      body.tagline || '',
      body.description || '',
      body.cover_image_url || '',
      body.category || 'Fintech',
      status,
      Number(body.price || 0),
      body.start_date || null,
      body.end_date || null,
      managerId,
      user!.id,
    )
    .run();

  return Response.json({ message: 'Bootcamp created.', id: result.meta.last_row_id, slug }, { status: 201 });
};

// PATCH /api/bootcamps — super admin updates any bootcamp; manager updates their own.
export const onRequestPatch: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json<BootcampBody>();
  if (!body.id) {
    return Response.json({ error: 'A bootcamp id is required.' }, { status: 400 });
  }

  const allowed = await canManageBootcamp(env.DB, user, body.id);
  if (!allowed) {
    return Response.json({ error: 'You cannot manage this bootcamp.' }, { status: 403 });
  }

  const isSuper = isSuperAdminRole(user);

  // Resolve a status change (explicit action takes precedence).
  let status: string | undefined;
  if (body.action === 'close') status = 'closed';
  else if (body.action === 'open') status = 'open';
  else if (body.status) status = body.status;

  // Managers may not move a bootcamp into 'draft'.
  if (status === 'draft' && !isSuper) status = undefined;

  // Super admin may reassign the manager.
  let managerId: number | null | undefined;
  if (isSuper && body.managerEmail !== undefined) {
    if (body.managerEmail.trim() === '') {
      managerId = null;
    } else {
      managerId = await resolveManager(env.DB, body.managerEmail.trim());
      if (!managerId) {
        return Response.json({ error: `No user found with email ${body.managerEmail}.` }, { status: 400 });
      }
    }
  }

  const updates: string[] = [];
  const binds: unknown[] = [];
  const set = (column: string, value: unknown) => {
    updates.push(`${column} = ?`);
    binds.push(value);
  };

  if (body.title !== undefined) set('title', body.title);
  if (body.tagline !== undefined) set('tagline', body.tagline);
  if (body.description !== undefined) set('description', body.description);
  if (body.cover_image_url !== undefined) set('cover_image_url', body.cover_image_url);
  if (body.category !== undefined) set('category', body.category);
  if (body.price !== undefined && isSuper) set('price', Number(body.price || 0));
  if (body.start_date !== undefined) set('start_date', body.start_date || null);
  if (body.end_date !== undefined) set('end_date', body.end_date || null);
  if (status) set('status', status);
  if (managerId !== undefined) set('manager_id', managerId);

  if (updates.length === 0) {
    return Response.json({ error: 'Nothing to update.' }, { status: 400 });
  }

  set('updated_at', new Date().toISOString());
  binds.push(body.id);

  await env.DB.prepare(`UPDATE bootcamps SET ${updates.join(', ')} WHERE id = ?`).bind(...binds).run();

  return Response.json({ message: 'Bootcamp updated.' });
};

// DELETE /api/bootcamps?id= — super admin removes a bootcamp and its content.
export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!isSuperAdminRole(user)) {
    return Response.json({ error: 'Only a super admin can delete bootcamps.' }, { status: 403 });
  }

  const url = new URL(request.url);
  const id = Number(url.searchParams.get('id'));
  if (!id) {
    return Response.json({ error: 'A bootcamp id is required.' }, { status: 400 });
  }

  await env.DB.batch([
    env.DB.prepare(
      'DELETE FROM bootcamp_competition_winners WHERE competition_id IN (SELECT id FROM bootcamp_competitions WHERE bootcamp_id = ?)',
    ).bind(id),
    env.DB.prepare('DELETE FROM bootcamp_competitions WHERE bootcamp_id = ?').bind(id),
    env.DB.prepare('DELETE FROM bootcamp_resources WHERE bootcamp_id = ?').bind(id),
    env.DB.prepare('DELETE FROM bootcamp_enrollments WHERE bootcamp_id = ?').bind(id),
    env.DB.prepare('DELETE FROM bootcamps WHERE id = ?').bind(id),
  ]);

  return Response.json({ message: 'Bootcamp deleted.' });
};

// Find a user by email and promote them to the bootcamp_manager role.
async function resolveManager(db: D1Database, email: string): Promise<number | null> {
  const row = await db.prepare('SELECT id, role FROM users WHERE email = ?').bind(email).first<{ id: number; role: string }>();
  if (!row) return null;
  if (row.role !== 'bootcamp_manager' && row.role !== 'super_admin' && row.role !== 'SOU') {
    await db.prepare("UPDATE users SET role = 'bootcamp_manager', status = 'active' WHERE id = ?").bind(row.id).run();
  }
  return Number(row.id);
}
