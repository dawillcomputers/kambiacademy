import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../../../../lib/api';
import DashboardLayout from '../../../components/layout/DashboardLayout';

type PlanType = 'monthly' | 'yearly';
type ServiceKey = 'platform' | 'storage' | 'liveClass';
const serviceOrder: ServiceKey[] = ['platform', 'storage', 'liveClass'];

const badgeStyles: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  inactive: 'bg-slate-100 text-slate-600',
  cancelled: 'bg-rose-100 text-rose-700',
  expired: 'bg-rose-100 text-rose-700',
};

const serviceIcons: Record<ServiceKey, string> = {
  platform: '🖥️',
  storage: '☁️',
  liveClass: '🎥',
};

const formatMoney = (v: number) => `$${v.toFixed(2)}`;
const toRequestType = (s: ServiceKey) => s === 'liveClass' ? 'liveClass' : s;

export default function TeacherSubscriptionsPage() {
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [selectedPlans, setSelectedPlans] = useState<Record<ServiceKey, PlanType>>({ platform: 'monthly', storage: 'monthly', liveClass: 'monthly' });
  const [selectedItems, setSelectedItems] = useState<Partial<Record<ServiceKey, boolean>>>({});

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const r = await api.getBillingOverview();
        if (!cancelled) {
          setOverview(r.teacher || null);
          setSelectedPlans({
            platform: r?.teacher?.subscriptions?.platform?.subscription?.planType || 'monthly',
            storage: r?.teacher?.subscriptions?.storage?.subscription?.planType || 'monthly',
            liveClass: r?.teacher?.subscriptions?.liveClass?.subscription?.planType || 'monthly',
          });
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load subscriptions.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  const services = useMemo(() => {
    if (!overview?.subscriptions) return [];
    return serviceOrder.map(key => {
      const state = overview.subscriptions[key];
      const plan = selectedPlans[key];
      return {
        key,
        label: state?.label || key,
        amount: Number(state?.fees?.[plan] ?? 0),
        monthly: Number(state?.fees?.monthly ?? 0),
        yearly: Number(state?.fees?.yearly ?? 0),
        plan,
        requiresSubscription: Boolean(state?.requiresSubscription),
        hasActiveSubscription: Boolean(state?.hasActiveSubscription),
        status: state?.subscription?.status || (state?.hasActiveSubscription ? 'active' : state?.pendingPayments?.length ? 'pending' : 'inactive'),
        pendingPayments: state?.pendingPayments || [],
      };
    });
  }, [overview, selectedPlans]);

  const dueServices = services.filter(s => s.requiresSubscription && !s.hasActiveSubscription);
  const selectedDue = dueServices.filter(s => selectedItems[s.key] ?? true);
  const totalDue = selectedDue.reduce((sum, s) => sum + s.amount, 0);
  const liveHours = overview?.liveHours;

  const handleCheckout = async (service: ServiceKey) => {
    setMessage(''); setError(''); setCheckoutLoading(true);
    try {
      const r = await api.createTeacherSubscription(selectedPlans[service], toRequestType(service));
      if (r.payment_url) { window.location.href = r.payment_url; return; }
      setMessage(r.message || 'Checkout started.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Checkout failed.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleBundle = async () => {
    if (!selectedDue.length) { setError('Select at least one service.'); return; }
    setMessage(''); setError(''); setCheckoutLoading(true);
    try {
      const r = await api.createTeacherSubscriptionBundle(
        selectedDue.map(s => ({ subscriptionType: toRequestType(s.key), planType: selectedPlans[s.key] }))
      );
      if (r.payment_url) { window.location.href = r.payment_url; return; }
      setMessage(r.message || 'Bundle checkout started.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Bundle checkout failed.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const history = overview?.paymentHistory || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Subscriptions</h1>
          <p className="mt-1 text-sm text-slate-500">Manage your platform access subscriptions. Pay individually or bundle payments together.</p>
        </div>

        {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}
        {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500">Loading subscriptions...</div>
        ) : (
          <>
            {/* Pricing Cards */}
            <div className="grid gap-4 lg:grid-cols-3">
              {services.map(s => (
                <div key={s.key} className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className={`px-5 py-4 ${s.hasActiveSubscription ? 'bg-emerald-50' : 'bg-slate-50'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{serviceIcons[s.key]}</span>
                        <h3 className="text-lg font-bold text-slate-900">{s.label}</h3>
                      </div>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeStyles[s.status] || badgeStyles.inactive}`}>{s.status}</span>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-slate-900">{formatMoney(s.plan === 'monthly' ? s.monthly : s.yearly)}</span>
                      <span className="text-sm text-slate-500">/{s.plan === 'monthly' ? 'mo' : 'yr'}</span>
                    </div>
                    {s.plan === 'monthly' && s.yearly > 0 && (
                      <p className="mt-1 text-xs text-slate-500">or {formatMoney(s.yearly)}/year (save {Math.round((1 - s.yearly / (s.monthly * 12)) * 100)}%)</p>
                    )}

                    <div className="mt-4 flex gap-2">
                      <select
                        value={s.plan}
                        onChange={e => setSelectedPlans(p => ({ ...p, [s.key]: e.target.value as PlanType }))}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      >
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                    </div>

                    <div className="mt-4">
                      {!s.hasActiveSubscription && s.requiresSubscription ? (
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={selectedItems[s.key] ?? true} onChange={e => setSelectedItems(p => ({ ...p, [s.key]: e.target.checked }))} className="h-4 w-4 rounded border-slate-300" />
                            Include in bundle
                          </label>
                          <button onClick={() => { void handleCheckout(s.key); }} disabled={checkoutLoading} className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                            {checkoutLoading ? 'Processing...' : 'Subscribe Now'}
                          </button>
                        </div>
                      ) : (
                        <div className="rounded-lg bg-emerald-100 py-2.5 text-center text-sm font-semibold text-emerald-700">Active ✓</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Bundle Checkout */}
            {dueServices.length > 0 && (
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-blue-900">Bundle Checkout</h3>
                    <p className="mt-1 text-sm text-blue-700">{selectedDue.length} service{selectedDue.length !== 1 ? 's' : ''} selected • Total: <strong>{formatMoney(totalDue)}</strong></p>
                  </div>
                  <button onClick={() => { void handleBundle(); }} disabled={checkoutLoading || !selectedDue.length} className="rounded-lg bg-blue-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50">
                    Pay All Selected
                  </button>
                </div>
              </div>
            )}

            {/* Live Hours */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900">Live Class Hours</h3>
              <div className="mt-3 flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-2xl font-bold text-rose-700">
                  {liveHours?.mode === 'limited' ? `${liveHours.remainingHours ?? 0}h` : '∞'}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {liveHours?.mode === 'limited' ? `${liveHours.remainingHours ?? 0} hours remaining this month` : 'Unlimited live classroom access'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {liveHours?.mode === 'limited' ? `Used ${liveHours.hoursUsedThisMonth ?? 0}h of ${liveHours.monthlyLimitHours ?? 0}h` : 'No monthly limit'}
                    {liveHours?.resetAt && ` • Resets ${new Date(liveHours.resetAt).toLocaleDateString()}`}
                  </p>
                </div>
              </div>
            </div>

            {/* Payment History */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-lg font-bold text-slate-900">Payment History</h3>
              {history.length ? (
                <div className="space-y-3">
                  {history.slice(0, 10).map((h: any, i: number) => (
                    <div key={`${h.transactionRef}-${i}`} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {h.subscriptionType === 'live_class' ? 'Live Class Access' : h.subscriptionType === 'storage' ? 'Cloud Storage' : 'Platform Access'}
                        </p>
                        <p className="text-xs text-slate-500">{h.planType} • {h.paymentGateway || 'flutterwave'} • {h.transactionRef || 'N/A'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-900">{formatMoney(Number(h.amount || 0))}</p>
                        <span className={`text-xs font-semibold ${badgeStyles[h.status] || badgeStyles.inactive}`}>{h.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No payment records yet.</p>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
