import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../../../../lib/api';
import TeacherDashboardLayout from '../../../components/layout/TeacherDashboardLayout';

type PlanType = 'monthly' | 'yearly';
type ServiceKey = 'storage' | 'liveClass';

const serviceOrder: ServiceKey[] = ['storage', 'liveClass'];

const cardStyles: Record<ServiceKey, string> = {
  storage: 'from-sky-100 via-cyan-50 to-white border-sky-200 text-sky-950',
  liveClass: 'from-rose-100 via-pink-50 to-white border-rose-200 text-rose-950',
};

const badgeStyles: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  inactive: 'bg-slate-100 text-slate-600',
  cancelled: 'bg-rose-100 text-rose-700',
  expired: 'bg-rose-100 text-rose-700',
};

const formatMoney = (value: number) => `$${value.toFixed(2)}`;

const toRequestType = (service: ServiceKey) => service === 'liveClass' ? 'liveClass' : service;

export default function TeacherBillingPage() {
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [selectedPlans, setSelectedPlans] = useState<Record<ServiceKey, PlanType>>({
    storage: 'monthly',
    liveClass: 'monthly',
  });
  const [selectedItems, setSelectedItems] = useState<Partial<Record<ServiceKey, boolean>>>({});

  useEffect(() => {
    let cancelled = false;

    const loadOverview = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await api.getBillingOverview();
        if (cancelled) {
          return;
        }

        setOverview(response.teacher || null);
        setSelectedPlans({
          storage: response?.teacher?.subscriptions?.storage?.subscription?.planType || 'monthly',
          liveClass: response?.teacher?.subscriptions?.liveClass?.subscription?.planType || 'monthly',
        });
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load add-ons.');
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

  const services = useMemo(() => {
    if (!overview?.subscriptions) {
      return [];
    }

    return serviceOrder.map((service) => {
      const key = service === 'liveClass' ? 'liveClass' : service;
      const state = overview.subscriptions[key];
      const plan = selectedPlans[service];
      return {
        key: service,
        label: state?.label || service,
        amount: Number(state?.fees?.[plan] ?? 0),
        monthly: Number(state?.fees?.monthly ?? 0),
        yearly: Number(state?.fees?.yearly ?? 0),
        plan,
        hasActiveSubscription: Boolean(state?.hasActiveSubscription),
        status: state?.subscription?.status || (state?.hasActiveSubscription ? 'active' : state?.pendingPayments?.length ? 'pending' : 'inactive'),
        pendingPayments: state?.pendingPayments || [],
        subscription: state?.subscription || null,
      };
    });
  }, [overview, selectedPlans]);

  const availableAddOns = services.filter((service) => !service.hasActiveSubscription && !service.pendingPayments.length);
  const selectedAddOns = availableAddOns.filter((service) => selectedItems[service.key] ?? true);
  const selectedTotal = selectedAddOns.reduce((sum, service) => sum + service.amount, 0);
  const activeAddOns = services.filter((service) => service.hasActiveSubscription).length;
  const history = overview?.paymentHistory || [];
  const liveHours = overview?.liveHours;

  const handleSingleCheckout = async (service: ServiceKey) => {
    setMessage('');
    setError('');
    setCheckoutLoading(true);
    try {
      const response = await api.createTeacherSubscription(selectedPlans[service], toRequestType(service));
      if (response.payment_url) {
        window.location.href = response.payment_url;
        return;
      }
      setMessage(response.message || 'Checkout created.');
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : 'Failed to start checkout.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleBundleCheckout = async () => {
    if (!selectedAddOns.length) {
      setError('Select at least one add-on first.');
      return;
    }

    setMessage('');
    setError('');
    setCheckoutLoading(true);
    try {
      const response = await api.createTeacherSubscriptionBundle(
        selectedAddOns.map((service) => ({
          subscriptionType: toRequestType(service.key),
          planType: selectedPlans[service.key],
        })),
      );
      if (response.payment_url) {
        window.location.href = response.payment_url;
        return;
      }
      setMessage(response.message || 'Combined add-on checkout created.');
    } catch (bundleError) {
      setError(bundleError instanceof Error ? bundleError.message : 'Failed to start the combined add-on checkout.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <TeacherDashboardLayout>
      <div className="space-y-8">
        <section className="rounded-[32px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.18),transparent_28%),linear-gradient(135deg,#ffffff,#f8fafc_50%,#ecfeff)] px-6 py-8 shadow-xl shadow-slate-200/70">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">Teacher Add-ons</p>
          <h1 className="mt-3 text-4xl font-bold text-slate-950">Core access stays open. Buy add-ons only when you need them.</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            Teachers no longer pay a base subscription here. Storage and live classes are optional add-ons, and you can pay for one or both in a single checkout.
          </p>
        </section>

        {message && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{message}</div>}
        {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div>}

        {loading ? (
          <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-10 text-sm text-slate-500 shadow-lg">Loading add-ons...</div>
        ) : (
          <>
            <div className="grid gap-4 xl:grid-cols-3">
              <div className="rounded-[28px] border border-amber-200 bg-gradient-to-br from-amber-100 via-orange-50 to-white px-5 py-5 shadow-lg shadow-slate-200/60">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-800/70">Selected Add-ons</p>
                <p className="mt-4 text-3xl font-bold text-amber-950">{formatMoney(selectedTotal)}</p>
                <p className="mt-4 text-sm text-amber-900/75">{selectedAddOns.length} add-on{selectedAddOns.length === 1 ? '' : 's'} selected for checkout.</p>
              </div>
              <div className="rounded-[28px] border border-sky-200 bg-gradient-to-br from-sky-100 via-cyan-50 to-white px-5 py-5 shadow-lg shadow-slate-200/60">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-800/70">Live Hours</p>
                <p className="mt-4 text-3xl font-bold text-sky-950">{liveHours?.mode === 'limited' ? `${liveHours.remainingHours ?? 0}h` : 'Open'}</p>
                <p className="mt-4 text-sm text-sky-900/75">
                  {liveHours?.mode === 'limited'
                    ? `Used ${liveHours.hoursUsedThisMonth ?? 0}h this month. Resets ${liveHours.resetAt ? new Date(liveHours.resetAt).toLocaleString() : 'soon'}.`
                    : 'Your live classroom access is currently open with no monthly limit.'}
                </p>
              </div>
              <div className="rounded-[28px] border border-emerald-200 bg-gradient-to-br from-emerald-100 via-teal-50 to-white px-5 py-5 shadow-lg shadow-slate-200/60">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-800/70">Active Add-ons</p>
                <p className="mt-4 text-3xl font-bold text-emerald-950">{activeAddOns}</p>
                <p className="mt-4 text-sm text-emerald-900/75">Current optional services attached to this teacher account.</p>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-lg shadow-slate-200/60">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Available Add-ons</p>
                    <h2 className="mt-2 text-2xl font-bold text-slate-950">Optional tools for storage and live teaching</h2>
                  </div>
                  <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">No base teacher subscription required</div>
                </div>

                <div className="mt-6 space-y-4">
                  {services.map((service) => (
                    <div key={service.key} className={`rounded-3xl border bg-gradient-to-br px-5 py-5 ${cardStyles[service.key]}`}>
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="text-lg font-bold">{service.label}</h3>
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeStyles[service.status] || badgeStyles.inactive}`}>
                              {service.status}
                            </span>
                            {!service.hasActiveSubscription && !service.pendingPayments.length && (
                              <label className="inline-flex items-center gap-2 rounded-full bg-white/75 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
                                <input
                                  type="checkbox"
                                  checked={selectedItems[service.key] ?? true}
                                  onChange={(event) => setSelectedItems((current) => ({ ...current, [service.key]: event.target.checked }))}
                                  className="h-4 w-4 rounded border-slate-300 text-slate-900"
                                />
                                Include in bundle
                              </label>
                            )}
                          </div>
                          <p className="mt-3 text-sm opacity-80">{formatMoney(service.monthly)} monthly or {formatMoney(service.yearly)} yearly.</p>
                          {service.subscription?.endDate && (
                            <p className="mt-2 text-sm opacity-80">Active through {new Date(service.subscription.endDate).toLocaleDateString()}.</p>
                          )}
                          <p className="mt-2 text-sm opacity-80">
                            {service.pendingPayments.length ? `${service.pendingPayments.length} payment record${service.pendingPayments.length === 1 ? '' : 's'} are still pending confirmation.` : 'Buy only if you want this extra capability.'}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          <select
                            value={service.plan}
                            onChange={(event) => setSelectedPlans((current) => ({ ...current, [service.key]: event.target.value as PlanType }))}
                            className="rounded-full border border-white/70 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700"
                          >
                            <option value="monthly">Monthly</option>
                            <option value="yearly">Yearly</option>
                          </select>
                          {!service.hasActiveSubscription && !service.pendingPayments.length ? (
                            <button
                              type="button"
                              onClick={() => { void handleSingleCheckout(service.key); }}
                              disabled={checkoutLoading}
                              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Buy add-on
                            </button>
                          ) : service.pendingPayments.length ? (
                            <div className="rounded-full bg-white/80 px-4 py-3 text-sm font-semibold text-slate-700">
                              Pending
                            </div>
                          ) : (
                            <div className="rounded-full bg-white/80 px-4 py-3 text-sm font-semibold text-slate-700">
                              Active
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-6">
                <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-lg shadow-slate-200/60">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Combined Checkout</p>
                  <h2 className="mt-2 text-2xl font-bold text-slate-950">Pay selected add-ons together</h2>
                  <p className="mt-3 text-sm leading-6 text-slate-600">Select one or both add-ons and complete them in a single checkout.</p>
                  <p className="mt-4 text-3xl font-bold text-slate-950">{formatMoney(selectedTotal)}</p>
                  <p className="mt-2 text-sm text-slate-600">{selectedAddOns.length} selected add-on{selectedAddOns.length === 1 ? '' : 's'}.</p>
                  <button
                    type="button"
                    onClick={() => { void handleBundleCheckout(); }}
                    disabled={checkoutLoading || !selectedAddOns.length}
                    className="mt-5 w-full rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Pay selected add-ons
                  </button>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-lg shadow-slate-200/60">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Payment History</p>
                  <h2 className="mt-2 text-2xl font-bold text-slate-950">Recent records</h2>
                  <div className="mt-5 space-y-3">
                    {history.length ? history.slice(0, 8).map((item: any) => (
                      <div key={`${item.transactionRef}-${item.createdAt}`} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-900">{item.subscriptionType === 'live_class' ? 'Live Classes Add-on' : 'Storage Add-on'}</p>
                            <p className="mt-1 text-sm text-slate-500">{item.planType} • {item.paymentGateway || 'flutterwave'} • {item.transactionRef || 'no reference'}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-slate-900">{formatMoney(Number(item.amount || 0))}</p>
                            <span className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badgeStyles[item.status] || badgeStyles.inactive}`}>{item.status}</span>
                          </div>
                        </div>
                      </div>
                    )) : (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600">No add-on payments recorded yet.</div>
                    )}
                  </div>
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </TeacherDashboardLayout>
  );
}
