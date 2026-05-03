interface LiveHoursPolicy {
  mode: 'open' | 'limited';
  limitHours: number;
  allocationOnlyEnabled: boolean;
}

export interface TeacherLiveHoursUsage {
  mode: 'open' | 'limited';
  source: 'default' | 'override' | 'allocation';
  defaultMode: 'open' | 'limited';
  defaultLimitHours: number;
  allocationOnlyEnabled: boolean;
  baseMonthlyLimitHours: number | null;
  allocationHours: number | null;
  monthlyLimitHours: number | null;
  hoursUsedThisMonth: number;
  remainingHours: number | null;
  blocked: boolean;
  resetAt: string;
}

const DEFAULT_LIMIT_HOURS = 20;
const DEFAULT_ALLOCATION_ONLY_ENABLED = false;
const SYSTEM_LIVE_HOURS_ALLOCATION_PREFIX = 'system_live_hours_allocation:';
const TEACHER_LIVE_HOURS_ALLOCATION_ONLY_KEY = 'teacher_live_hours_allocation_only_enabled';

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

const parseAllocation = (value: string | null | undefined) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return null;
  }

  return roundHours(numeric);
};

const parseBoolean = (value: string | null | undefined, fallback = false) => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on', 'enabled'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no', 'off', 'disabled'].includes(normalized)) {
    return false;
  }

  return fallback;
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
  const [modeValue, limitValue, allocationOnlyValue] = await Promise.all([
    readSetting(db, 'teacher_live_hours_default_mode'),
    readSetting(db, 'teacher_live_hours_default_limit'),
    readSetting(db, TEACHER_LIVE_HOURS_ALLOCATION_ONLY_KEY),
  ]);

  return {
    mode: parseMode(modeValue),
    limitHours: parseLimit(limitValue),
    allocationOnlyEnabled: parseBoolean(allocationOnlyValue, DEFAULT_ALLOCATION_ONLY_ENABLED),
  };
}

export async function getTeacherLiveHoursUsage(db: D1Database, teacherId: number): Promise<TeacherLiveHoursUsage> {
  const defaultPolicy = await getDefaultLiveHoursPolicy(db);
  const [overrideModeValue, overrideLimitValue, allocationValue, usageRow] = await Promise.all([
    readSetting(db, `teacher_live_hours_mode:${teacherId}`),
    readSetting(db, `teacher_live_hours_limit:${teacherId}`),
    readSetting(db, `${SYSTEM_LIVE_HOURS_ALLOCATION_PREFIX}${teacherId}`),
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
  const allocationHours = parseAllocation(allocationValue);
  const baseMode = overrideMode ?? defaultPolicy.mode;
  // Allocation-only mode forces a monthly cap for every teacher, then selective hours stack on top.
  const baseMonthlyLimitHours = defaultPolicy.allocationOnlyEnabled || baseMode === 'limited'
    ? parseLimit(overrideLimitValue ?? String(defaultPolicy.limitHours))
    : null;
  const mode = baseMonthlyLimitHours !== null ? 'limited' : baseMode;
  const monthlyLimitHours = baseMonthlyLimitHours === null
    ? null
    : roundHours(baseMonthlyLimitHours + (allocationHours ?? 0));
  const hoursUsedThisMonth = roundHours(Number(usageRow?.hours_used ?? 0));
  const remainingHours = monthlyLimitHours === null ? null : roundHours(Math.max(0, monthlyLimitHours - hoursUsedThisMonth));

  return {
    mode,
    source: allocationHours !== null ? 'allocation' : overrideModeValue || overrideLimitValue ? 'override' : 'default',
    defaultMode: defaultPolicy.mode,
    defaultLimitHours: defaultPolicy.limitHours,
    allocationOnlyEnabled: defaultPolicy.allocationOnlyEnabled,
    baseMonthlyLimitHours,
    allocationHours,
    monthlyLimitHours,
    hoursUsedThisMonth,
    remainingHours,
    blocked: monthlyLimitHours !== null && remainingHours <= 0,
    resetAt: getNextResetDate(),
  };
}