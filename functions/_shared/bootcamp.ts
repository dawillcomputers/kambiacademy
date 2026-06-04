// Shared access-control helpers for the Bootcamp Hub feature.

export interface BootcampUser {
  id: number;
  role?: string;
  [key: string]: unknown;
}

export const isSuperAdminRole = (user: BootcampUser | null | undefined): boolean =>
  user?.role === 'super_admin' || user?.role === 'SOU';

export const isBootcampManagerRole = (user: BootcampUser | null | undefined): boolean =>
  user?.role === 'bootcamp_manager';

// Super admins manage every bootcamp; managers only manage bootcamps assigned to them.
export async function canManageBootcamp(
  db: D1Database,
  user: BootcampUser | null | undefined,
  bootcampId: number,
): Promise<boolean> {
  if (!user) return false;
  if (isSuperAdminRole(user)) return true;
  if (!isBootcampManagerRole(user)) return false;
  const row = await db
    .prepare('SELECT id FROM bootcamps WHERE id = ? AND manager_id = ?')
    .bind(bootcampId, user.id)
    .first();
  return !!row;
}

export async function isEnrolledInBootcamp(
  db: D1Database,
  userId: number,
  bootcampId: number,
): Promise<boolean> {
  const row = await db
    .prepare("SELECT id FROM bootcamp_enrollments WHERE bootcamp_id = ? AND user_id = ? AND status = 'active'")
    .bind(bootcampId, userId)
    .first();
  return !!row;
}

// A user may view a bootcamp hub if they manage it, are a super admin, or are enrolled.
export async function canViewBootcamp(
  db: D1Database,
  user: BootcampUser | null | undefined,
  bootcampId: number,
): Promise<boolean> {
  if (!user) return false;
  if (await canManageBootcamp(db, user, bootcampId)) return true;
  return isEnrolledInBootcamp(db, user.id, bootcampId);
}

export async function getCompetitionBootcampId(
  db: D1Database,
  competitionId: number,
): Promise<number | null> {
  const row = await db
    .prepare('SELECT bootcamp_id FROM bootcamp_competitions WHERE id = ?')
    .bind(competitionId)
    .first<{ bootcamp_id: number }>();
  return row ? Number(row.bootcamp_id) : null;
}

export const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || `bootcamp-${Date.now()}`;
