// Shared billing currency + accumulate configuration, read from platform_settings.
// Internal fees/accounting stay in USD; these helpers decide how the gateway
// charge is presented (e.g. NGN at a configurable FX rate) and whether unpaid
// superadmin cycles lock the dashboard or accumulate as a running balance.

export type BillingCurrency = 'NGN' | 'USD';

export interface BillingCurrencyConfig {
  currency: BillingCurrency;
  rate: number; // USD -> NGN
}

export interface AccumulateConfig {
  enabled: boolean;
  clearedThrough: string | null; // ISO date; baseline for accumulation
}

const DEFAULT_RATE = 1600;

async function readSettings(db: D1Database, keys: string[]): Promise<Record<string, string>> {
  try {
    const placeholders = keys.map(() => '?').join(',');
    const { results } = await db
      .prepare(`SELECT key, value FROM platform_settings WHERE key IN (${placeholders})`)
      .bind(...keys)
      .all<{ key: string; value: string }>();
    const map: Record<string, string> = {};
    for (const row of results || []) map[row.key] = row.value;
    return map;
  } catch {
    return {};
  }
}

export async function getBillingCurrencyConfig(db: D1Database): Promise<BillingCurrencyConfig> {
  const settings = await readSettings(db, ['billing_currency', 'usd_to_ngn_rate']);
  const currency: BillingCurrency = settings.billing_currency === 'USD' ? 'USD' : 'NGN';
  const parsedRate = Number(settings.usd_to_ngn_rate);
  const rate = Number.isFinite(parsedRate) && parsedRate > 0 ? parsedRate : DEFAULT_RATE;
  return { currency, rate };
}

export async function getAccumulateConfig(db: D1Database): Promise<AccumulateConfig> {
  const settings = await readSettings(db, ['system_billing_accumulate', 'system_billing_cleared_through']);
  return {
    enabled: settings.system_billing_accumulate === 'true',
    clearedThrough: settings.system_billing_cleared_through || null,
  };
}

// Amount to charge at the gateway, in the active billing currency.
export function toChargeAmount(usdAmount: number, config: BillingCurrencyConfig): number {
  if (config.currency === 'NGN') {
    return Math.round(usdAmount * config.rate); // NGN has no minor units in practice for Flutterwave
  }
  return Math.round(usdAmount * 100) / 100;
}

export function formatCharge(usdAmount: number, config: BillingCurrencyConfig): string {
  if (config.currency === 'NGN') {
    return `₦${toChargeAmount(usdAmount, config).toLocaleString()}`;
  }
  return `$${usdAmount.toFixed(2)}`;
}
