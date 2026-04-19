import { useState } from 'react';

const DEFAULT_EXCHANGE_RATE = 1495;

type Plan = {
  id: string;
  name: string;
  baseUsd: number;
  teacherSellPrice: number;
  active: boolean;
};

type Addon = {
  id: string;
  name: string;
  baseUsd: number;
  sellNgn: number;
  unit: string;
};

const defaultPlans: Plan[] = [
  { id: 'starter', name: 'Starter', baseUsd: 5, teacherSellPrice: 7500, active: true },
  { id: 'growth', name: 'Growth', baseUsd: 12, teacherSellPrice: 18000, active: true },
  { id: 'pro', name: 'Pro', baseUsd: 25, teacherSellPrice: 37500, active: true },
];

const defaultAddons: Addon[] = [
  { id: 'recording', name: 'Recording', baseUsd: 2, sellNgn: 4500, unit: '/month' },
  { id: 'hd_video', name: 'HD Video', baseUsd: 2, sellNgn: 4500, unit: '/month' },
  { id: 'extra_hours', name: 'Extra Hours (+10h)', baseUsd: 1.5, sellNgn: 3000, unit: 'one-time' },
  { id: 'more_students', name: 'More Students (+20)', baseUsd: 3, sellNgn: 5000, unit: '/month' },
  { id: 'storage_boost', name: 'Storage Boost (+50GB)', baseUsd: 2, sellNgn: 3500, unit: '/month' },
];

const fmtNgn = (v: number) => `₦${v.toLocaleString()}`;
const fmtUsd = (v: number) => `$${v.toFixed(2)}`;

export default function SuperAdminPricing() {
  const [rate, setRate] = useState(DEFAULT_EXCHANGE_RATE);
  const [rateInput, setRateInput] = useState(String(DEFAULT_EXCHANGE_RATE));
  const [plans, setPlans] = useState(defaultPlans);
  const [addons, setAddons] = useState(defaultAddons);
  const [freeHoursInput, setFreeHoursInput] = useState<Record<string, string>>({});
  const [commissionRate, setCommissionRate] = useState(15);

  const toNaira = (usd: number) => usd * rate;

  const updatePlanPrice = (id: string, newPrice: number) => {
    setPlans((prev) => prev.map((p) => (p.id === id ? { ...p, teacherSellPrice: newPrice } : p)));
  };

  const togglePlan = (id: string) => {
    setPlans((prev) => prev.map((p) => (p.id === id ? { ...p, active: !p.active } : p)));
  };

  const updateAddonPrice = (id: string, newPrice: number) => {
    setAddons((prev) => prev.map((a) => (a.id === id ? { ...a, sellNgn: newPrice } : a)));
  };

  const totalSystemCost = plans.filter((p) => p.active).reduce((s, p) => s + p.baseUsd, 0);
  const totalRevenue = plans.filter((p) => p.active).reduce((s, p) => s + p.teacherSellPrice, 0);
  const totalMargin = totalRevenue - plans.filter((p) => p.active).reduce((s, p) => s + toNaira(p.baseUsd), 0);
  const marginPct = totalRevenue > 0 ? Math.round((totalMargin / totalRevenue) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="rounded-[32px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.18),transparent_28%),linear-gradient(135deg,#ffffff,#f8fafc_50%,#ecfeff)] px-6 py-8 shadow-xl shadow-slate-200/70">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">Pricing Engine</p>
        <h1 className="mt-3 text-4xl font-bold text-slate-950">SuperAdmin Pricing & Override Control</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
          Control system pricing, exchange rates, teacher plan prices (NGN), add-on costs, free-hour allocations, commission rates, and emergency overrides. Teachers only see NGN pricing.
        </p>
      </div>

      {/* SYSTEM ECONOMICS OVERVIEW */}
      <div className="grid gap-4 xl:grid-cols-4">
        <div className="rounded-[28px] border border-emerald-200 bg-gradient-to-br from-emerald-100 via-teal-50 to-white px-5 py-5 shadow-lg shadow-slate-200/60">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-800/70">Total Revenue (NGN)</p>
          <p className="mt-4 text-3xl font-bold text-emerald-950">{fmtNgn(totalRevenue)}</p>
          <p className="mt-2 text-sm text-emerald-900/75">From all active plan sell prices</p>
        </div>
        <div className="rounded-[28px] border border-amber-200 bg-gradient-to-br from-amber-100 via-orange-50 to-white px-5 py-5 shadow-lg shadow-slate-200/60">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-800/70">System Cost (USD)</p>
          <p className="mt-4 text-3xl font-bold text-amber-950">{fmtUsd(totalSystemCost)}</p>
          <p className="mt-2 text-sm text-amber-900/75">= {fmtNgn(toNaira(totalSystemCost))} at current rate</p>
        </div>
        <div className="rounded-[28px] border border-blue-200 bg-gradient-to-br from-blue-100 via-sky-50 to-white px-5 py-5 shadow-lg shadow-slate-200/60">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-800/70">Profit Margin</p>
          <p className="mt-4 text-3xl font-bold text-blue-950">{fmtNgn(totalMargin)}</p>
          <p className="mt-2 text-sm text-blue-900/75">{marginPct}% margin across plans</p>
        </div>
        <div className="rounded-[28px] border border-purple-200 bg-gradient-to-br from-purple-100 via-fuchsia-50 to-white px-5 py-5 shadow-lg shadow-slate-200/60">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-purple-800/70">Exchange Rate</p>
          <p className="mt-4 text-3xl font-bold text-purple-950">$1 = ₦{rate.toLocaleString()}</p>
          <p className="mt-2 text-sm text-purple-900/75">Manually controlled by SuperAdmin</p>
        </div>
      </div>

      {/* EXCHANGE RATE + COMMISSION */}
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-lg shadow-slate-200/60">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Currency Control</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-950">Exchange Rate</h2>
          <p className="mt-2 text-sm text-slate-600">Set the USD → NGN conversion rate. This affects how internal costs translate to teacher-facing prices.</p>
          <div className="mt-5 flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-700">$1 = ₦</span>
            <input
              type="number"
              value={rateInput}
              onChange={(e) => setRateInput(e.target.value)}
              className="w-40 rounded-xl border border-slate-300 px-4 py-2.5 text-lg font-bold text-slate-900 focus:border-slate-900 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => {
                const v = Number(rateInput);
                if (v > 0) setRate(v);
              }}
              className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Update Rate
            </button>
          </div>
          <p className="mt-3 text-xs text-slate-500">Current: $1 = ₦{rate.toLocaleString()}</p>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-lg shadow-slate-200/60">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Revenue Split</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-950">Platform Commission</h2>
          <p className="mt-2 text-sm text-slate-600">Percentage Kambi takes from every student → teacher payment transaction before crediting the teacher wallet.</p>
          <div className="mt-5 flex items-center gap-3">
            <input
              type="number"
              min={0}
              max={100}
              value={commissionRate}
              onChange={(e) => setCommissionRate(Math.min(100, Math.max(0, Number(e.target.value))))}
              className="w-28 rounded-xl border border-slate-300 px-4 py-2.5 text-lg font-bold text-slate-900 focus:border-slate-900 focus:outline-none"
            />
            <span className="text-lg font-bold text-slate-700">%</span>
          </div>
          <p className="mt-3 text-xs text-slate-500">Student pays → Kambi wallet → {commissionRate}% platform fee → {100 - commissionRate}% to teacher</p>
        </div>
      </div>

      {/* PLAN PRICING CONTROL */}
      <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-lg shadow-slate-200/60">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Plan Management</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-950">Teacher Plan Pricing (NGN)</h2>
          </div>
          <p className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">Rate: $1 = ₦{rate.toLocaleString()}</p>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-3">
          {plans.map((plan) => {
            const costNgn = toNaira(plan.baseUsd);
            const margin = plan.teacherSellPrice - costNgn;
            const marginPctPlan = plan.teacherSellPrice > 0 ? Math.round((margin / plan.teacherSellPrice) * 100) : 0;
            const isLow = marginPctPlan < 40;

            return (
              <div
                key={plan.id}
                className={`rounded-3xl border px-5 py-5 transition ${plan.active ? 'border-slate-200 bg-gradient-to-br from-white to-slate-50' : 'border-dashed border-slate-300 bg-slate-50 opacity-60'}`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                  <button
                    type="button"
                    onClick={() => togglePlan(plan.id)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${plan.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}
                  >
                    {plan.active ? 'Active' : 'Disabled'}
                  </button>
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">System Cost (USD)</span>
                    <span className="font-semibold text-slate-900">{fmtUsd(plan.baseUsd)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">System Cost (NGN)</span>
                    <span className="font-semibold text-slate-700">{fmtNgn(costNgn)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Teacher Sell Price</span>
                    <span className="font-bold text-emerald-700">{fmtNgn(plan.teacherSellPrice)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Profit Margin</span>
                    <span className={`font-bold ${isLow ? 'text-red-600' : 'text-blue-700'}`}>
                      {fmtNgn(margin)} ({marginPctPlan}%)
                    </span>
                  </div>
                  {isLow && (
                    <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                      ⚠ Margin below 40% — consider raising sell price
                    </p>
                  )}
                </div>

                <div className="mt-4">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Override Sell Price (₦)</label>
                  <input
                    type="number"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-lg font-bold text-slate-900 focus:border-slate-900 focus:outline-none"
                    value={plan.teacherSellPrice}
                    onChange={(e) => updatePlanPrice(plan.id, Number(e.target.value))}
                  />
                </div>

                <button
                  type="button"
                  className="mt-4 w-full rounded-xl bg-slate-950 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Save Price Override
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ADD-ON PRICING */}
      <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-lg shadow-slate-200/60">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Add-on Management</p>
        <h2 className="mt-2 text-2xl font-bold text-slate-950">Add-on Pricing (NGN)</h2>

        <div className="mt-6 grid gap-4 xl:grid-cols-3">
          {addons.map((addon) => {
            const costNgn = toNaira(addon.baseUsd);
            const margin = addon.sellNgn - costNgn;

            return (
              <div key={addon.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900">{addon.name}</h4>
                  <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-600">{addon.unit}</span>
                </div>
                <div className="mt-3 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Base cost</span>
                    <span className="text-slate-700">{fmtUsd(addon.baseUsd)} ({fmtNgn(costNgn)})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Sell price</span>
                    <span className="font-bold text-emerald-700">{fmtNgn(addon.sellNgn)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Margin</span>
                    <span className={`font-semibold ${margin < 0 ? 'text-red-600' : 'text-blue-700'}`}>{fmtNgn(margin)}</span>
                  </div>
                </div>
                <div className="mt-3">
                  <input
                    type="number"
                    value={addon.sellNgn}
                    onChange={(e) => updateAddonPrice(addon.id, Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-900 focus:border-slate-900 focus:outline-none"
                  />
                </div>
                <button type="button" className="mt-3 w-full rounded-lg bg-slate-950 py-2 text-sm font-semibold text-white hover:bg-slate-800">
                  Update Price
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* FREE HOURS DISTRIBUTION */}
      <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-lg shadow-slate-200/60">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Teacher Incentives</p>
        <h2 className="mt-2 text-2xl font-bold text-slate-950">Free Hours Distribution</h2>
        <p className="mt-2 text-sm text-slate-600">Strategically allocate free live-class hours to specific teachers. These bypass the plan hour limits.</p>

        <div className="mt-6 grid gap-4 xl:grid-cols-3">
          {['Teacher A', 'Teacher B', 'Teacher C'].map((teacher) => (
            <div key={teacher} className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
              <p className="font-bold text-slate-900">{teacher}</p>
              <p className="mt-1 text-xs text-slate-500">Currently: 0 bonus hours</p>
              <input
                type="number"
                placeholder="Hours to allocate"
                value={freeHoursInput[teacher] || ''}
                onChange={(e) => setFreeHoursInput((prev) => ({ ...prev, [teacher]: e.target.value }))}
                className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
              />
              <button type="button" className="mt-3 w-full rounded-lg bg-emerald-700 py-2 text-sm font-semibold text-white hover:bg-emerald-600">
                Allocate Free Hours
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* EMERGENCY CONTROLS */}
      <div className="rounded-[28px] border border-red-200 bg-gradient-to-br from-red-50 to-rose-50 px-6 py-6 shadow-lg">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-red-600">Emergency Override</p>
        <h2 className="mt-2 text-2xl font-bold text-red-900">System Kill Switches</h2>
        <p className="mt-2 text-sm text-red-700/80">Use these controls to immediately throttle the system when costs spike or profit margins drop below safe levels.</p>

        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" className="rounded-xl bg-red-700 px-5 py-3 text-sm font-semibold text-white hover:bg-red-600">
            🎥 Force 240p Mode
          </button>
          <button type="button" className="rounded-xl bg-red-700 px-5 py-3 text-sm font-semibold text-white hover:bg-red-600">
            📵 Disable Student Video
          </button>
          <button type="button" className="rounded-xl bg-red-700 px-5 py-3 text-sm font-semibold text-white hover:bg-red-600">
            ⏸ Pause New Classes
          </button>
          <button type="button" className="rounded-xl bg-red-700 px-5 py-3 text-sm font-semibold text-white hover:bg-red-600">
            🔒 Pause All Recording
          </button>
          <button type="button" className="rounded-xl bg-red-700 px-5 py-3 text-sm font-semibold text-white hover:bg-red-600">
            🚫 Block New Signups
          </button>
        </div>
      </div>

      {/* MONEY FLOW DIAGRAM */}
      <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-lg shadow-slate-200/60">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Platform Economics</p>
        <h2 className="mt-2 text-2xl font-bold text-slate-950">Money Flow</h2>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm font-semibold">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700">System Cost (USD)</div>
          <span className="text-slate-400">→</span>
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">SuperAdmin Markup (NGN)</div>
          <span className="text-slate-400">→</span>
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-blue-800">Teacher Buys Plan</div>
          <span className="text-slate-400">→</span>
          <div className="rounded-xl border border-purple-200 bg-purple-50 px-4 py-3 text-purple-800">Student Pays Teacher</div>
          <span className="text-slate-400">→</span>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">Kambi Takes {commissionRate}%</div>
          <span className="text-slate-400">→</span>
          <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-teal-800">Teacher Gets {100 - commissionRate}%</div>
        </div>
      </div>
    </div>
  );
}
