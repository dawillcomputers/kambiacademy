interface LiveHoursPolicy {
  mode: 'open' | 'limited';
  limitHours: number;
}

export interface TeacherLiveHoursUsage {
  mode: 'open' | 'limited';
  source: 'default' | 'override';
  defaultMode: 'open' | 'limited';
  defaultLimitHours: number;
  monthlyLimitHours: number | null;
  hoursUsedThisMonth: number;
  remainingHours: number | null;
  blocked: boolean;
  resetAt: string;
}

const DEFAULT_LIMIT_HOURS = 20;

const roundHours = (value: number) => Math.round(value * 10) / 10;

const parseMode = (value: string | null | undefined): 'open' | 'limited' =>
  value === 'limited' ? 'limited' : 'open';

const parseLimit = (value: string | null | undefined) => {
  const numeric = Number(value ?? DEFAULT_LIMIT_HOURS);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return DEFAULT_LIMIT_HOURS;
  }

  return roundHours(numeric);
};

async function readSetting(db: D1Database, key: string) {
  const row = await db.prepare('SELECT value FROM platform_settings WHERE key = ?').bind(key).first<{ value: string }>();
  return row?.value ?? null;
}

function getNextResetDate() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
}

export async function getDefaultLiveHoursPolicy(db: D1Database): Promise<LiveHoursPolicy> {
  const [modeValue, limitValue] = await Promise.all([
    readSetting(db, 'teacher_live_hours_default_mode'),
    readSetting(db, 'teacher_live_hours_default_limit'),
  ]);

  return {
    mode: parseMode(modeValue),
    limitHours: parseLimit(limitValue),
  };
}

export async function getTeacherLiveHoursUsage(db: D1Database, teacherId: number): Promise<TeacherLiveHoursUsage> {
  const defaultPolicy = await getDefaultLiveHoursPolicy(db);
  const [overrideModeValue, overrideLimitValue, usageRow] = await Promise.all([
    readSetting(db, `teacher_live_hours_mode:${teacherId}`),
    readSetting(db, `teacher_live_hours_limit:${teacherId}`),
    db.prepare(
      `SELECT COALESCE(SUM(
        CASE
          WHEN started_at IS NULL THEN 0
          WHEN COALESCE(ended_at, datetime('now')) <= started_at THEN 0
          ELSE (julianday(COALESCE(ended_at, datetime('now'))) - julianday(started_at)) * 24
        END
      ), 0) as hours_used
      FROM live_sessions
      WHERE tutor_id = ?
        AND started_at >= datetime('now', 'start of month')
        AND started_at < datetime('now', 'start of month', '+1 month')`,
    ).bind(teacherId).first<{ hours_used: number }>(),
  ]);

  const overrideMode = overrideModeValue ? parseMode(overrideModeValue) : null;
  const mode = overrideMode ?? defaultPolicy.mode;
  const monthlyLimitHours = mode === 'limited'
    ? parseLimit(overrideLimitValue ?? String(defaultPolicy.limitHours))
    : null;
  const hoursUsedThisMonth = roundHours(Number(usageRow?.hours_used ?? 0));
  const remainingHours = monthlyLimitHours === null ? null : roundHours(Math.max(0, monthlyLimitHours - hoursUsedThisMonth));

  return {
    mode,
    source: overrideModeValue || overrideLimitValue ? 'override' : 'default',
    defaultMode: defaultPolicy.mode,
    defaultLimitHours: defaultPolicy.limitHours,
    monthlyLimitHours,
    hoursUsedThisMonth,
    remainingHours,
    blocked: monthlyLimitHours !== null && remainingHours <= 0,
    resetAt: getNextResetDate(),
  };
}