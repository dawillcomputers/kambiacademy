import { getAuthUser } from '../_shared/auth';
import { canManageBootcamp, isSuperAdminRole } from '../_shared/bootcamp';
import { evaluateDiscount, normalizeCode } from '../_shared/discounts';

interface Env {
  DB: D1Database;
}

interface DiscountBody {
  action?: 'create' | 'validate';
  id?: number;
  code?: string;
  description?: string;
  type?: 'percent' | 'fixed';
  value?: number;
  scope?: 'global' | 'bootcamp';
  bootcamp_id?: number | null;
  max_uses?: number | null;
  single_use_per_email?: boolean;
  expires_at?: string | null;
  active?: boolean;
  // validate-only
  bootcampId?: number;
  amount?: number;
  email?: string;
}

// GET /api/discounts            -> superadmin: all codes
// GET /api/discounts?bootcamp=ID -> manager/superadmin: that bootcamp's codes + global
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const bootcampParam = url.searchParams.get('bootcamp');

  if (bootcampParam) {
    const bootcampId = Number(bootcampParam);
    if (!(await canManageBootcamp(env.DB, user, bootcampId))) {
      return Response.json({ error: 'You cannot manage this bootcamp.' }, { status: 403 });
    }
    const { results } = await env.DB.prepare(
      `SELECT * FROM discount_codes
       WHERE bootcamp_id = ? OR scope = 'global'
       ORDER BY created_at DESC`,
    ).bind(bootcampId).all();
    return Response.json({ codes: results });
  }

  if (!isSuperAdminRole(user)) {
    return Response.json({ error: 'A bootcamp id is required.' }, { status: 400 });
  }

  const { results } = await env.DB.prepare(
    `SELECT d.*, b.title AS bootcamp_title
     FROM discount_codes d LEFT JOIN bootcamps b ON b.id = d.bootcamp_id
     ORDER BY d.created_at DESC`,
  ).all();
  return Response.json({ codes: results });
};

// POST /api/discounts
//   { action: 'validate', code, bootcampId, amount, email } -> public live preview
//   { action: 'create', ... }                                -> manager/superadmin
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = await request.json<DiscountBody>();

  if (body.action === 'validate') {
    const result = await evaluateDiscount(env.DB, body.code || '', {
      bootcampId: body.bootcampId ?? null,
      amount: Number(body.amount || 0),
      email: body.email,
    });
    return Response.json({
      valid: result.valid,
      reason: result.reason,
      amount_before: result.amountBefore,
      amount_after: result.amountAfter,
      discount: result.discount,
      is_free: result.isFree,
      type: result.code?.type,
      value: result.code?.value,
    });
  }

  const user = await getAuthUser(request, env.DB);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const code = normalizeCode(body.code || '');
  if (!code) return Response.json({ error: 'A code is required.' }, { status: 400 });

  const type = body.type === 'fixed' ? 'fixed' : 'percent';
  const superAdmin = isSuperAdminRole(user);
  let scope: 'global' | 'bootcamp' = body.scope === 'global' ? 'global' : 'bootcamp';
  let bootcampId = body.bootcamp_id ? Number(body.bootcamp_id) : null;

  // Managers can only create codes scoped to a bootcamp they manage.
  if (!superAdmin) {
    scope = 'bootcamp';
    if (!bootcampId || !(await canManageBootcamp(env.DB, user, bootcampId))) {
      return Response.json({ error: 'You can only create codes for bootcamps you manage.' }, { status: 403 });
    }
  } else if (scope === 'bootcamp' && !bootcampId) {
    return Response.json({ error: 'Select a bootcamp for a bootcamp-scoped code.' }, { status: 400 });
  }
  if (scope === 'global') bootcampId = null;

  const value = type === 'percent' ? Math.min(100, Math.max(0, Number(body.value || 0))) : Math.max(0, Number(body.value || 0));

  try {
    const result = await env.DB.prepare(
      `INSERT INTO discount_codes (code, description, type, value, scope, bootcamp_id, max_uses, single_use_per_email, expires_at, active, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    ).bind(
      code, body.description || '', type, value, scope, bootcampId,
      body.max_uses != null && body.max_uses !== ('' as any) ? Number(body.max_uses) : null,
      body.single_use_per_email ? 1 : 0,
      body.expires_at || null,
      user.id,
    ).run();
    return Response.json({ message: 'Discount code created.', id: result.meta.last_row_id }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error && /UNIQUE/.test(err.message) ? 'That code already exists.' : 'Failed to create code.';
    return Response.json({ error: message }, { status: 400 });
  }
};

// PATCH /api/discounts — toggle active (and basic edits).
export const onRequestPatch: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json<DiscountBody>();
  if (!body.id) return Response.json({ error: 'A code id is required.' }, { status: 400 });

  const existing = await env.DB.prepare('SELECT * FROM discount_codes WHERE id = ?').bind(body.id).first<any>();
  if (!existing) return Response.json({ error: 'Code not found.' }, { status: 404 });

  const allowed = isSuperAdminRole(user) || (existing.bootcamp_id && (await canManageBootcamp(env.DB, user, Number(existing.bootcamp_id))));
  if (!allowed) return Response.json({ error: 'You cannot manage this code.' }, { status: 403 });

  if (body.active !== undefined) {
    await env.DB.prepare('UPDATE discount_codes SET active = ? WHERE id = ?').bind(body.active ? 1 : 0, body.id).run();
  }
  return Response.json({ message: 'Code updated.' });
};

// DELETE /api/discounts?id=
export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const id = Number(url.searchParams.get('id'));
  if (!id) return Response.json({ error: 'A code id is required.' }, { status: 400 });

  const existing = await env.DB.prepare('SELECT * FROM discount_codes WHERE id = ?').bind(id).first<any>();
  if (!existing) return Response.json({ error: 'Code not found.' }, { status: 404 });

  const allowed = isSuperAdminRole(user) || (existing.bootcamp_id && (await canManageBootcamp(env.DB, user, Number(existing.bootcamp_id))));
  if (!allowed) return Response.json({ error: 'You cannot manage this code.' }, { status: 403 });

  await env.DB.prepare('DELETE FROM discount_codes WHERE id = ?').bind(id).run();
  return Response.json({ message: 'Code deleted.' });
};
