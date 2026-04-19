import React, { useEffect, useState } from 'react';
import { api } from '../../../../lib/api';

const formatMoney = (value: number) => `$${value.toFixed(2)}`;

const statusStyles: Record<string, string> = {
  healthy: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20',
  warning: 'bg-amber-500/15 text-amber-300 border border-amber-500/20',
  danger: 'bg-rose-500/15 text-rose-300 border border-rose-500/20',
};

export default function SuperAdminBillingPage() {
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadOverview = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await api.getBillingOverview();
        if (!cancelled) {
          setOverview(response);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load billing intelligence.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadOverview();

    return () => {
      cancelled = true;
    };
  }, []);

  const summary = overview?.system?.totals;
  const catalog = overview?.catalog;
  const viewer = overview?.viewer;

  return (
    <div className="space-y-8 p-6 lg:p-8">
      <section className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.24),transparent_28%),linear-gradient(135deg,#111b2e,#0b1220_60%,#111827)] px-6 py-8 shadow-2xl shadow-black/30">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#A9B4CC]">Billing Intelligence</p>
            <h1 className="mt-3 text-4xl font-bold text-[#EAF0FF]">Superadmin subscription and enforcement console</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[#A9B4CC]">
              This page translates the billing blueprint in billing.md into an operational control room: pricing surfaces, enforcement paths, estimated Cloudflare cost, teacher profitability, and System Override visibility in one place.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-indigo-400/30 bg-indigo-500/15 px-4 py-2 text-sm font-semibold text-indigo-100">
              Billing start: May 1, 2026
            </span>
            {viewer?.systemOverride && (
              <span className="rounded-full border border-emerald-400/30 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-100">
                System Override tracking enabled
              </span>
            )}
          </div>
        </div>
      </section>

      {error && <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-200">{error}</div>}

      {loading ? (
        <div className="rounded-[28px] border border-white/10 bg-[#111B2E] px-6 py-10 text-sm text-[#A9B4CC] shadow-lg">Loading billing intelligence…</div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[24px] border border-white/10 bg-[#111B2E] px-5 py-5 shadow-lg shadow-black/20">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#6B7A99]">Estimated Revenue</p>
              <p className="mt-4 text-3xl font-bold text-[#EAF0FF]">{formatMoney(Number(summary?.totalEstimatedRevenue || 0))}</p>
              <p className="mt-4 text-sm text-[#A9B4CC]">Platform fee revenue plus subscription collections across teacher billing.</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-[#111B2E] px-5 py-5 shadow-lg shadow-black/20">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#6B7A99]">Estimated Cost</p>
              <p className="mt-4 text-3xl font-bold text-[#EAF0FF]">{formatMoney(Number(summary?.totalEstimatedCost || 0))}</p>
              <p className="mt-4 text-sm text-[#A9B4CC]">Derived from storage GB, live-session video GB, and worker request estimates.</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-[#111B2E] px-5 py-5 shadow-lg shadow-black/20">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#6B7A99]">Estimated Profit</p>
              <p className="mt-4 text-3xl font-bold text-[#EAF0FF]">{formatMoney(Number(summary?.estimatedProfit || 0))}</p>
              <p className="mt-4 text-sm text-[#A9B4CC]">Average teacher margin {(Number(summary?.averageMargin || 0) * 100).toFixed(1)}%.</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-[#111B2E] px-5 py-5 shadow-lg shadow-black/20">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#6B7A99]">Payments Due</p>
              <p className="mt-4 text-3xl font-bold text-[#EAF0FF]">{formatMoney(Number(summary?.dueAmount || 0))}</p>
              <p className="mt-4 text-sm text-[#A9B4CC]">{summary?.dueCount || 0} billable teacher service{summary?.dueCount === 1 ? '' : 's'} are currently due.</p>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <section className="rounded-[28px] border border-white/10 bg-[#111B2E] px-6 py-6 shadow-xl shadow-black/20">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#6B7A99]">Teacher Profit Table</p>
                  <h2 className="mt-2 text-2xl font-bold text-[#EAF0FF]">Per-teacher billing, costs, and enforcement</h2>
                </div>
                <div className="rounded-full bg-[#16233A] px-4 py-2 text-sm font-semibold text-[#EAF0FF]">
                  {summary?.teachers || 0} teachers tracked
                </div>
              </div>

              <div className="mt-6 overflow-x-auto">
                <table className="w-full min-w-[920px] text-left text-sm text-[#A9B4CC]">
                  <thead>
                    <tr className="border-b border-white/10 text-xs uppercase tracking-[0.18em] text-[#6B7A99]">
                      <th className="px-3 py-3">Teacher</th>
                      <th className="px-3 py-3">Services Due</th>
                      <th className="px-3 py-3">Revenue</th>
                      <th className="px-3 py-3">Cost</th>
                      <th className="px-3 py-3">Profit</th>
                      <th className="px-3 py-3">Margin</th>
                      <th className="px-3 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview?.system?.teachers?.map((row: any) => (
                      <tr key={row.teacher.id} className="border-b border-white/5 align-top">
                        <td className="px-3 py-4">
                          <p className="font-semibold text-[#EAF0FF]">{row.teacher.name}</p>
                          <p className="text-xs text-[#6B7A99]">{row.teacher.email}</p>
                        </td>
                        <td className="px-3 py-4">
                          {row.dueItems.length ? (
                            <div className="flex flex-wrap gap-2">
                              {row.dueItems.map((item: any) => (
                                <span key={item.key} className="rounded-full bg-[#16233A] px-3 py-1 text-xs font-semibold text-[#EAF0FF]">
                                  {item.label}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">All active</span>
                          )}
                        </td>
                        <td className="px-3 py-4 text-[#EAF0FF]">{formatMoney(Number(row.revenue.estimatedRevenue || 0))}</td>
                        <td className="px-3 py-4 text-[#EAF0FF]">{formatMoney(Number(row.costs.totalCost || 0))}</td>
                        <td className="px-3 py-4 text-[#EAF0FF]">{formatMoney(Number(row.profitability.profit || 0))}</td>
                        <td className="px-3 py-4 text-[#EAF0FF]">{(Number(row.profitability.margin || 0) * 100).toFixed(1)}%</td>
                        <td className="px-3 py-4">
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[row.profitability.status] || statusStyles.warning}`}>
                            {row.profitability.label}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="space-y-6">
              <div className="rounded-[28px] border border-white/10 bg-[#111B2E] px-6 py-6 shadow-xl shadow-black/20">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#6B7A99]">Tracking Coverage</p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl bg-[#16233A] px-4 py-4">
                    <p className="text-sm text-[#6B7A99]">Usage events table</p>
                    <p className="mt-2 text-2xl font-bold text-[#EAF0FF]">{overview?.tracking?.usageEvents || 0}</p>
                  </div>
                  <div className="rounded-2xl bg-[#16233A] px-4 py-4">
                    <p className="text-sm text-[#6B7A99]">Cost log rows</p>
                    <p className="mt-2 text-2xl font-bold text-[#EAF0FF]">{overview?.tracking?.costLogs || 0}</p>
                  </div>
                  <div className="rounded-2xl bg-[#16233A] px-4 py-4">
                    <p className="text-sm text-[#6B7A99]">Active overrides</p>
                    <p className="mt-2 text-2xl font-bold text-[#EAF0FF]">{overview?.tracking?.activeOverrides || 0}</p>
                  </div>
                  <div className="rounded-2xl bg-[#16233A] px-4 py-4">
                    <p className="text-sm text-[#6B7A99]">Active add-ons</p>
                    <p className="mt-2 text-2xl font-bold text-[#EAF0FF]">{overview?.tracking?.activeAddons || 0}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-[#111B2E] px-6 py-6 shadow-xl shadow-black/20">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#6B7A99]">Pricing Surfaces</p>
                <div className="mt-5 space-y-3">
                  {catalog?.services?.map((service: any) => (
                    <div key={service.key} className="rounded-2xl border border-white/10 bg-[#16233A] px-4 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-[#EAF0FF]">{service.label}</p>
                          <p className="mt-1 text-sm text-[#A9B4CC]">{service.description}</p>
                        </div>
                        <div className="text-right text-sm text-[#EAF0FF]">
                          <p>{formatMoney(Number(service.monthly || 0))}/mo</p>
                          <p>{formatMoney(Number(service.yearly || 0))}/yr</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-5 rounded-3xl border border-white/10 bg-[#16233A] px-5 py-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#6B7A99]">Add-ons</p>
                  <div className="mt-4 grid gap-3">
                    {catalog?.addons?.map((addon: any) => (
                      <div key={addon.key} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#111B2E] px-4 py-3">
                        <div>
                          <p className="font-semibold text-[#EAF0FF]">{addon.label}</p>
                          <p className="text-sm text-[#A9B4CC]">{addon.description}</p>
                        </div>
                        <strong className="text-[#EAF0FF]">{formatMoney(Number(addon.price || 0))}{addon.unit}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <section className="rounded-[28px] border border-white/10 bg-[#111B2E] px-6 py-6 shadow-xl shadow-black/20">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#6B7A99]">Enforcement Pipeline</p>
              <div className="mt-5 space-y-3">
                {catalog?.enforcementPipeline?.map((item: string) => (
                  <div key={item} className="rounded-2xl border border-white/10 bg-[#16233A] px-4 py-3 text-sm text-[#EAF0FF]">
                    {item}
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-3xl border border-amber-500/20 bg-amber-500/10 px-5 py-5 text-sm text-amber-100">
                <p className="font-semibold uppercase tracking-[0.2em]">Profit guardrails</p>
                <p className="mt-2 leading-6">
                  Warning below {(Number(catalog?.profitGuards?.warningMargin || 0) * 100).toFixed(0)}% margin. Restrict below {(Number(catalog?.profitGuards?.dangerMargin || 0) * 100).toFixed(0)}% margin.
                </p>
              </div>
            </section>

            <section className="rounded-[28px] border border-white/10 bg-[#111B2E] px-6 py-6 shadow-xl shadow-black/20">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#6B7A99]">System Override Log</p>
                  <h2 className="mt-2 text-2xl font-bold text-[#EAF0FF]">Tracked billing and profit events</h2>
                </div>
                <div className="rounded-full bg-[#16233A] px-4 py-2 text-sm font-semibold text-[#EAF0FF]">
                  {overview?.system?.systemEvents?.length || 0} recent events
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {overview?.system?.systemEvents?.length ? overview.system.systemEvents.map((event: any) => (
                  <div key={`${event.action}-${event.timestamp}`} className="rounded-2xl border border-white/10 bg-[#16233A] px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B7A99]">{event.action}</p>
                    <p className="mt-2 text-sm leading-6 text-[#EAF0FF]">{event.description}</p>
                    <p className="mt-2 text-xs text-[#6B7A99]">{new Date(event.timestamp).toLocaleString()}</p>
                  </div>
                )) : (
                  <div className="rounded-2xl border border-white/10 bg-[#16233A] px-4 py-6 text-sm text-[#A9B4CC]">No System Override events recorded yet.</div>
                )}
              </div>

              <div className="mt-5 rounded-3xl border border-white/10 bg-[#16233A] px-5 py-5">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#6B7A99]">Active pricing overrides</p>
                <div className="mt-4 space-y-3">
                  {overview?.system?.pricingOverrides?.length ? overview.system.pricingOverrides.map((override: any) => (
                    <div key={override.id} className="rounded-2xl border border-white/10 bg-[#111B2E] px-4 py-3 text-sm text-[#EAF0FF]">
                      <p className="font-semibold">{override.target} • {override.target_id}</p>
                      <p className="mt-1 text-[#A9B4CC]">New price {formatMoney(Number(override.new_price || 0))}</p>
                    </div>
                  )) : (
                    <div className="rounded-2xl border border-white/10 bg-[#111B2E] px-4 py-6 text-sm text-[#A9B4CC]">No active pricing overrides found.</div>
                  )}
                </div>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}