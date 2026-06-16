// Shared discount-code helpers used by the management API and the registration flow.

export interface DiscountCodeRow {
  id: number;
  code: string;
  description: string;
  type: 'percent' | 'fixed';
  value: number;
  scope: 'global' | 'bootcamp';
  bootcamp_id: number | null;
  max_uses: number | null;
  used_count: number;
  single_use_per_email: number;
  expires_at: string | null;
  active: number;
}

export interface DiscountEvaluation {
  valid: boolean;
  reason?: string;
  code?: DiscountCodeRow;
  amountBefore: number;
  amountAfter: number;
  discount: number;
  isFree: boolean;
}

const round = (n: number) => Math.round(n * 100) / 100;

export const normalizeCode = (code: string) => (code || '').trim().toUpperCase();

export function computeDiscountedAmount(code: DiscountCodeRow, amount: number): number {
  if (code.type === 'fixed') {
    return round(Math.max(0, amount - Math.max(0, code.value)));
  }
  const pct = Math.min(100, Math.max(0, code.value));
  return round(amount * (1 - pct / 100));
}

// Validate a code against a bootcamp + amount + (optional) email. Read-only — the
// caller records the redemption once the registration is actually completed.
export async function evaluateDiscount(
  db: D1Database,
  rawCode: string,
  options: { bootcampId?: number | null; amount: number; email?: string },
): Promise<DiscountEvaluation> {
  const code = normalizeCode(rawCode);
  const base = { amountBefore: options.amount, amountAfter: options.amount, discount: 0, isFree: options.amount <= 0 };

  if (!code) return { valid: false, reason: 'Enter a code.', ...base };

  const row = await db.prepare('SELECT * FROM discount_codes WHERE code = ?').bind(code).first<DiscountCodeRow>();
  if (!row || !row.active) return { valid: false, reason: 'This code is not valid.', ...base };

  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
    return { valid: false, reason: 'This code has expired.', ...base };
  }
  if (row.scope === 'bootcamp' && Number(row.bootcamp_id) !== Number(options.bootcampId)) {
    return { valid: false, reason: 'This code does not apply to this bootcamp.', ...base };
  }
  if (row.max_uses != null && row.used_count >= row.max_uses) {
    return { valid: false, reason: 'This code has reached its usage limit.', ...base };
  }
  if (row.single_use_per_email && options.email) {
    const used = await db
      .prepare('SELECT id FROM discount_redemptions WHERE code_id = ? AND email = ? LIMIT 1')
      .bind(row.id, options.email.trim().toLowerCase())
      .first();
    if (used) return { valid: false, reason: 'You have already used this code.', ...base };
  }

  const amountAfter = computeDiscountedAmount(row, options.amount);
  return {
    valid: true,
    code: row,
    amountBefore: options.amount,
    amountAfter,
    discount: round(options.amount - amountAfter),
    isFree: amountAfter <= 0,
  };
}

// Record a successful redemption and bump the usage counter.
export async function recordRedemption(
  db: D1Database,
  code: DiscountCodeRow,
  data: { email?: string; userId?: number; bootcampId?: number | null; amountBefore: number; amountAfter: number; context?: string },
): Promise<void> {
  await db.batch([
    db.prepare(
      `INSERT INTO discount_redemptions (code_id, code, email, user_id, bootcamp_id, amount_before, amount_after, context)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      code.id, code.code, (data.email || '').trim().toLowerCase(), data.userId ?? null,
      data.bootcampId ?? null, data.amountBefore, data.amountAfter, data.context || 'bootcamp_registration',
    ),
    db.prepare('UPDATE discount_codes SET used_count = used_count + 1 WHERE id = ?').bind(code.id),
  ]);
}
