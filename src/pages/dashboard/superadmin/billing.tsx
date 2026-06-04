import React, { useEffect, useState } from 'react';
import { api } from '../../../../lib/api';

type PlanType = 'monthly' | 'yearly';
type BillingTab = 'students' | 'teachers' | 'system';

const BILLING_TABS: Array<{ key: BillingTab; label: string; description: string }> = [
  {
    key: 'students',
    label: 'Students Payments',
    description: 'Track course purchases, platform revenue, and teacher payouts separately.',
  },
  {
    key: 'teachers',
    label: 'Teachers Payments',
    description: 'Track teacher subscription collections, pending renewals, and profitability.',
  },
  {
    key: 'system',
    label: 'System Payments',
    description: 'Track the base stack, prepaid live hours, and per-teacher hour allocations.',
  },
];

const formatMoney = (value: number) => `$${value.toFixed(2)}`;
const formatHours = (value: number) => `${value.toFixed(Number.isInteger(value) ? 0 : 1)}h`;

const formatScheduleDate = (value?: string | null) => {
  if (!value) {
    return 'Not scheduled';
  }

  return new Date(value).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return 'Not recorded';
  }

  return new Date(value).toLocaleString();
};

const statusStyles: Record<string, string> = {
  healthy: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20',
  warning: 'bg-amber-500/15 text-amber-300 border border-amber-500/20',
  danger: 'bg-rose-500/15 text-rose-300 border border-rose-500/20',
};

const dueLineToneMap: Record<string, string> = {
  covered: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100',
  due: 'border-amber-400/20 bg-amber-500/10 text-amber-100',
};

const scheduleToneMap: Record<string, { panel: string; badge: string }> = {
  upcoming: {
    panel: 'border-indigo-400/20 bg-indigo-500/10',
    badge: 'border-indigo-400/30 bg-indigo-500/15 text-indigo-100',
  },
  current: {
    panel: 'border-emerald-400/20 bg-emerald-500/10',
    badge: 'border-emerald-400/30 bg-emerald-500/15 text-emerald-100',
  },
  warning: {
    panel: 'border-amber-400/20 bg-amber-500/10',
    badge: 'border-amber-400/30 bg-amber-500/15 text-amber-100',
  },
  due: {
    panel: 'border-orange-400/20 bg-orange-500/10',
    badge: 'border-orange-400/30 bg-orange-500/15 text-orange-100',
  },
  locked: {
    panel: 'border-rose-400/20 bg-rose-500/10',
    badge: 'border-rose-400/30 bg-rose-500/15 text-rose-100',
  },
};

export default function SuperAdminBillingPage() {
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState<BillingTab>('students');
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [globalHoursInput, setGlobalHoursInput] = useState('2');
  const [allocationOnlyEnabled, setAllocationOnlyEnabled] = useState(false);
  const [reserveHoursInput, setReserveHoursInput] = useState('10');
  const [allocationInputs, setAllocationInputs] = useState<Record<string, string>>({});
  const [savingTarget, setSavingTarget] = useState<string | null>(null);

  const loadOverview = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.getBillingOverview();
      setOverview(response);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load billing intelligence.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    void (async () => {
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
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const allocations = overview?.system?.systemPayments?.allocations;
    if (!allocations?.length) {
      return;
    }

    setAllocationInputs(
      Object.fromEntries(
        allocations.map((entry: any) => [String(entry.teacherId), String(entry.allocatedHours ?? 0)]),
      ),
    );
  }, [overview?.system?.systemPayments?.allocations]);

  useEffect(() => {
    const liveHoursPolicy = overview?.system?.liveHoursPolicy;
    if (!liveHoursPolicy) {
      return;
    }

    setGlobalHoursInput(String(liveHoursPolicy.limitHours ?? 2));
    setAllocationOnlyEnabled(Boolean(liveHoursPolicy.allocationOnlyEnabled));
  }, [overview?.system?.liveHoursPolicy]);

  useEffect(() => {
    if (overview?.viewer?.systemOnly) {
      setActiveTab('system');
    }
  }, [overview?.viewer?.systemOnly]);

  const summary = overview?.system?.totals;
  const catalog = overview?.catalog;
  const viewer = overview?.viewer;
  const superAdminBilling = overview?.superAdminBilling;
  const studentPayments = overview?.system?.studentPayments;
  const teacherPayments = overview?.system?.teacherPayments;
  const systemPayments = overview?.system?.systemPayments;
  const liveHoursPolicy = overview?.system?.liveHoursPolicy;
  const systemYearlyDueAmount = Number(
    (systemPayments?.baseDueItems || []).reduce((sum: number, item: any) => sum + Number(item.yearly || 0), 0),
  );
  const platformService = catalog?.services?.find((service: any) => service.key === 'platform');
  const currentSubscription = superAdminBilling?.currentSubscription;
  const scheduleTone = scheduleToneMap[superAdminBilling?.status || 'upcoming'] || scheduleToneMap.upcoming;
  const nextDueDate = currentSubscription?.endDate || superAdminBilling?.nextCycleDueDate || superAdminBilling?.dueDate;
  const systemBillingOwner = systemPayments?.billingOwner;
  const visibleTabs = viewer?.systemOnly ? BILLING_TABS.filter((tab) => tab.key === 'system') : BILLING_TABS;
  const currentTab = visibleTabs.some((tab) => tab.key === activeTab)
    ? activeTab
    : ((visibleTabs[0]?.key || 'system') as BillingTab);

  const handlePlatformCheckout = async (planType: PlanType) => {
    setMessage('');
    setError('');
    setCheckoutLoading(`platform-${planType}`);
    try {
      const response = await api.createTeacherSubscription(planType, 'platform');
      if (response.payment_url) {
        window.location.href = response.payment_url;
        return;
      }

      setMessage(response.message || 'Checkout created.');
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : 'Failed to start superadmin checkout.');
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleSystemCheckout = async (planType: PlanType) => {
    const dueItems = (systemPayments?.baseDueItems || []) as Array<{ key: 'platform' | 'storage' | 'live_class' }>;
    if (!dueItems.length) {
      setMessage('All base system services are already covered for this cycle.');
      return;
    }

    setMessage('');
    setError('');
    setCheckoutLoading(`system-${planType}`);
    try {
      const response = dueItems.length === 1
        ? await api.createTeacherSubscription(planType, dueItems[0].key)
        : await api.createTeacherSubscriptionBundle(
            dueItems.map((item) => ({ subscriptionType: item.key, planType })),
          );

      if (response.payment_url) {
        window.location.href = response.payment_url;
        return;
      }

      setMessage(response.message || 'System checkout created.');
      await loadOverview();
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : 'Failed to start the system checkout.');
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleManualSystemGrant = async (planType: PlanType) => {
    setMessage('');
    setError('');
    setSavingTarget(`manual-grant-${planType}`);
    try {
      const response = await api.adminGrantSystemSubscription(planType);
      setMessage(response?.message || 'Main subscription marked as paid and access granted.');
      await loadOverview();
    } catch (grantError) {
      setError(grantError instanceof Error ? grantError.message : 'Failed to grant manual billing access.');
    } finally {
      setSavingTarget(null);
    }
  };

  const handleReserveTopUp = async () => {
    const hoursToAdd = Number(reserveHoursInput);
    if (!Number.isFinite(hoursToAdd) || hoursToAdd <= 0) {
      setError('Enter a positive number of live hours to add to the prepaid reserve.');
      return;
    }

    setMessage('');
    setError('');
    setSavingTarget('reserve');
    try {
      const currentBalance = Number(systemPayments?.prepaidBalance || 0);
      const nextBalance = Math.round((currentBalance + hoursToAdd) * 10) / 10;
      await api.adminUpdateSetting('system_live_hours_prepaid_balance', String(nextBalance));
      setMessage(`Prepaid live-hour reserve updated to ${formatHours(nextBalance)}.`);
      await loadOverview();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to update the prepaid live-hour reserve.');
    } finally {
      setSavingTarget(null);
    }
  };

  const handleGlobalHoursPolicySave = async () => {
    const nextHours = Number(globalHoursInput);
    if (!Number.isFinite(nextHours) || nextHours <= 0) {
      setError('Default monthly hours must be a positive number.');
      return;
    }

    setMessage('');
    setError('');
    setSavingTarget('global-hours');
    try {
      const normalizedHours = Math.round(nextHours * 10) / 10;
      await api.adminUpdateSetting('teacher_live_hours_default_mode', 'limited');
      await api.adminUpdateSetting('teacher_live_hours_default_limit', String(normalizedHours));
      await api.adminUpdateSetting('teacher_live_hours_allocation_only_enabled', allocationOnlyEnabled ? 'true' : 'false');
      setMessage(`Default live-hours policy saved at ${formatHours(normalizedHours)} per teacher each month.`);
      await loadOverview();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save the global live-hours policy.');
    } finally {
      setSavingTarget(null);
    }
  };

  const handleAllocationSave = async (teacherId: number) => {
    const rawValue = allocationInputs[String(teacherId)] ?? '0';
    const nextHours = Number(rawValue);
    if (!Number.isFinite(nextHours) || nextHours < 0) {
      setError('Allocated hours must be zero or a positive number.');
      return;
    }

    setMessage('');
    setError('');
    setSavingTarget(`allocation-${teacherId}`);
    try {
      const normalizedHours = Math.round(nextHours * 10) / 10;
      await api.adminUpdateSetting(`system_live_hours_allocation:${teacherId}`, String(normalizedHours));
      setMessage(`Saved ${formatHours(normalizedHours)} of extra time for the teacher.`);
      await loadOverview();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save the teacher allocation.');
    } finally {
      setSavingTarget(null);
    }
  };

  return (
    <div className="space-y-8 p-6 lg:p-8">
      <section className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.24),transparent_28%),linear-gradient(135deg,#111b2e,#0b1220_60%,#111827)] px-6 py-8 shadow-2xl shadow-black/30">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#A9B4CC]">Billing Intelligence</p>
            <h1 className="mt-3 text-4xl font-bold text-[#EAF0FF]">Main subscription, teacher add-ons, and live-hours control</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[#A9B4CC]">
              Manage the $9 monthly or $100 yearly main subscription, track optional teacher add-ons, and control live-hours capacity from one place.
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

      {message && <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-100">{message}</div>}
      {error && <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-200">{error}</div>}

      {loading ? (
        <div className="rounded-[28px] border border-white/10 bg-[#111B2E] px-6 py-10 text-sm text-[#A9B4CC] shadow-lg">Loading billing intelligence…</div>
      ) : (
        <>
          {viewer?.role === 'super_admin' && superAdminBilling?.applies && (
            <section className="rounded-[28px] border border-white/10 bg-[#111B2E] px-6 py-6 shadow-xl shadow-black/20">
              <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#6B7A99]">Main subscription schedule</p>
                  <h2 className="mt-2 text-2xl font-bold text-[#EAF0FF]">Due on the 18th, warning from the 6th, lock on the 20th</h2>
                  <div className={`mt-5 rounded-3xl border px-5 py-5 ${scheduleTone.panel}`}>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${scheduleTone.badge}`}>
                        {superAdminBilling?.label || 'Billing schedule active'}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-[#EAF0FF]">
                        Cycle: {superAdminBilling?.currentCycleLabel || 'May 2026'}
                      </span>
                    </div>
                    <p className="mt-4 text-sm leading-7 text-[#EAF0FF]">{superAdminBilling?.message}</p>
                    <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#A9B4CC]">Warning starts</p>
                        <p className="mt-2 text-lg font-bold text-[#EAF0FF]">{formatScheduleDate(superAdminBilling?.warningStartDate)}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#A9B4CC]">Due date</p>
                        <p className="mt-2 text-lg font-bold text-[#EAF0FF]">{formatScheduleDate(superAdminBilling?.dueDate)}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#A9B4CC]">Dashboard lock</p>
                        <p className="mt-2 text-lg font-bold text-[#EAF0FF]">{formatScheduleDate(superAdminBilling?.lockDate)}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#A9B4CC]">Coverage through</p>
                        <p className="mt-2 text-lg font-bold text-[#EAF0FF]">
                          {currentSubscription?.endDate ? formatScheduleDate(currentSubscription.endDate) : 'No paid cycle'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-[#16233A] px-5 py-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#6B7A99]">Renew main subscription</p>
                  <h3 className="mt-3 text-xl font-bold text-[#EAF0FF]">Keep the admin console covered</h3>
                  <p className="mt-3 text-sm leading-7 text-[#A9B4CC]">
                    A successful monthly payment moves the next due date to the next 18th. The yearly plan covers the full year in one payment.
                  </p>

                  <div className="mt-5 rounded-2xl border border-white/10 bg-[#111B2E] px-4 py-4 text-sm text-[#EAF0FF]">
                    <p className="font-semibold">Current plan</p>
                    <p className="mt-2 text-[#A9B4CC]">
                      {currentSubscription?.planType ? `${currentSubscription.planType} plan active until ${formatScheduleDate(currentSubscription.endDate)}` : 'No current paid cycle recorded.'}
                    </p>
                  </div>

                  {superAdminBilling?.requiresRenewal ? (
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => handlePlatformCheckout('monthly')}
                        disabled={Boolean(checkoutLoading)}
                        className="rounded-2xl border border-indigo-400/30 bg-indigo-500/15 px-4 py-4 text-left text-[#EAF0FF] transition hover:bg-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-100">Monthly</p>
                        <p className="mt-2 text-2xl font-bold">{formatMoney(Number(platformService?.monthly || 9))}</p>
                        <p className="mt-2 text-sm text-[#A9B4CC]">
                          {checkoutLoading === 'platform-monthly' ? 'Opening checkout...' : 'Clear the current month and keep billing aligned to the 18th.'}
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => handlePlatformCheckout('yearly')}
                        disabled={Boolean(checkoutLoading)}
                        className="rounded-2xl border border-emerald-400/30 bg-emerald-500/15 px-4 py-4 text-left text-[#EAF0FF] transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100">Yearly</p>
                        <p className="mt-2 text-2xl font-bold">{formatMoney(Number(platformService?.yearly || 100))}</p>
                        <p className="mt-2 text-sm text-[#A9B4CC]">
                          {checkoutLoading === 'platform-yearly' ? 'Opening checkout...' : 'Cover the full year in one payment.'}
                        </p>
                      </button>
                    </div>
                  ) : (
                    <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-100">
                      This cycle is already covered. The next due date is {formatScheduleDate(nextDueDate)}.
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {!viewer?.systemOnly && (
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
              <p className="mt-4 text-sm text-[#A9B4CC]">Teacher add-ons are optional, so automatic teacher dues should stay at zero.</p>
            </div>
            </div>
          )}

          {visibleTabs.length > 1 ? (
            <div className="sticky top-3 z-20 rounded-[28px] border border-white/10 bg-[#0F172A]/95 px-2 py-2 shadow-xl shadow-black/20 backdrop-blur">
              <div className="grid gap-2 lg:grid-cols-3">
                {visibleTabs.map((tab) => {
                  const isActive = currentTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      className={`rounded-[22px] border px-4 py-4 text-left transition ${isActive ? 'border-indigo-400/30 bg-indigo-500/15 shadow-lg shadow-indigo-900/20' : 'border-white/5 bg-white/5 hover:bg-white/10'}`}
                    >
                      <p className="text-[20px] font-semibold text-[#EAF0FF]">{tab.label}</p>
                      <p className="mt-2 text-sm leading-6 text-[#A9B4CC]">{tab.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-[28px] border border-emerald-400/20 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-100 shadow-xl shadow-black/20">
              System Override view is limited to system subscriptions, access control, and add-on monitoring.
            </div>
          )}

          {currentTab === 'students' && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-[24px] border border-white/10 bg-[#111B2E] px-5 py-5 shadow-lg shadow-black/20">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#6B7A99]">Student Gross Paid</p>
                  <p className="mt-4 text-3xl font-bold text-[#EAF0FF]">{formatMoney(Number(studentPayments?.totals?.grossRevenue || 0))}</p>
                  <p className="mt-4 text-sm text-[#A9B4CC]">Total amount paid by students across completed course transactions.</p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-[#111B2E] px-5 py-5 shadow-lg shadow-black/20">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#6B7A99]">Platform Share</p>
                  <p className="mt-4 text-3xl font-bold text-[#EAF0FF]">{formatMoney(Number(studentPayments?.totals?.platformRevenue || 0))}</p>
                  <p className="mt-4 text-sm text-[#A9B4CC]">Revenue retained by Kambi from student course payments.</p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-[#111B2E] px-5 py-5 shadow-lg shadow-black/20">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#6B7A99]">Teacher Payouts</p>
                  <p className="mt-4 text-3xl font-bold text-[#EAF0FF]">{formatMoney(Number(studentPayments?.totals?.teacherPayout || 0))}</p>
                  <p className="mt-4 text-sm text-[#A9B4CC]">Total teacher-side payout created from student enrollments.</p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-[#111B2E] px-5 py-5 shadow-lg shadow-black/20">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#6B7A99]">Student Transactions</p>
                  <p className="mt-4 text-3xl font-bold text-[#EAF0FF]">{studentPayments?.totals?.transactionCount || 0}</p>
                  <p className="mt-4 text-sm text-[#A9B4CC]">{studentPayments?.totals?.paidStudents || 0} unique student account{studentPayments?.totals?.paidStudents === 1 ? '' : 's'} have paid so far.</p>
                </div>
              </div>

              <section className="rounded-[28px] border border-white/10 bg-[#111B2E] px-6 py-6 shadow-xl shadow-black/20">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#6B7A99]">Student Payments</p>
                    <h2 className="mt-2 text-2xl font-bold text-[#EAF0FF]">Latest course purchases</h2>
                  </div>
                  <div className="rounded-full bg-[#16233A] px-4 py-2 text-sm font-semibold text-[#EAF0FF]">
                    {studentPayments?.recent?.length || 0} recent payments
                  </div>
                </div>

                <div className="mt-6 overflow-x-auto">
                  <table className="w-full min-w-[980px] text-left text-sm text-[#A9B4CC]">
                    <thead>
                      <tr className="border-b border-white/10 text-xs uppercase tracking-[0.18em] text-[#6B7A99]">
                        <th className="px-3 py-3">Student</th>
                        <th className="px-3 py-3">Course</th>
                        <th className="px-3 py-3">Teacher</th>
                        <th className="px-3 py-3">Paid</th>
                        <th className="px-3 py-3">Platform</th>
                        <th className="px-3 py-3">Teacher</th>
                        <th className="px-3 py-3">Country</th>
                        <th className="px-3 py-3">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentPayments?.recent?.length ? studentPayments.recent.map((payment: any) => (
                        <tr key={payment.id} className="border-b border-white/5 align-top">
                          <td className="px-3 py-4">
                            <p className="font-semibold text-[#EAF0FF]">{payment.studentName || 'Student removed'}</p>
                            <p className="text-xs text-[#6B7A99]">{payment.studentEmail || 'No email'}</p>
                          </td>
                          <td className="px-3 py-4 text-[#EAF0FF]">{payment.courseTitle || payment.courseSlug}</td>
                          <td className="px-3 py-4">
                            <p className="font-semibold text-[#EAF0FF]">{payment.teacherName || 'Teacher removed'}</p>
                            <p className="text-xs text-[#6B7A99]">{payment.teacherEmail || 'No email'}</p>
                          </td>
                          <td className="px-3 py-4 text-[#EAF0FF]">{formatMoney(Number(payment.amount || 0))}</td>
                          <td className="px-3 py-4 text-[#EAF0FF]">{formatMoney(Number(payment.platformFee || 0))}</td>
                          <td className="px-3 py-4 text-[#EAF0FF]">{formatMoney(Number(payment.teacherPayout || 0))}</td>
                          <td className="px-3 py-4 text-[#EAF0FF]">{payment.studentCountry || 'Unknown'}</td>
                          <td className="px-3 py-4 text-[#EAF0FF]">{formatDateTime(payment.createdAt)}</td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={8} className="px-3 py-8 text-center text-sm text-[#A9B4CC]">No student payment records found yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}

          {currentTab === 'teachers' && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-[24px] border border-white/10 bg-[#111B2E] px-5 py-5 shadow-lg shadow-black/20">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#6B7A99]">Collected</p>
                  <p className="mt-4 text-3xl font-bold text-[#EAF0FF]">{formatMoney(Number(teacherPayments?.totals?.collectedAmount || 0))}</p>
                  <p className="mt-4 text-sm text-[#A9B4CC]">Successful teacher add-on payments plus any legacy subscription rows.</p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-[#111B2E] px-5 py-5 shadow-lg shadow-black/20">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#6B7A99]">Pending</p>
                  <p className="mt-4 text-3xl font-bold text-[#EAF0FF]">{formatMoney(Number(teacherPayments?.totals?.pendingAmount || 0))}</p>
                  <p className="mt-4 text-sm text-[#A9B4CC]">Pending add-on checkouts waiting for gateway confirmation.</p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-[#111B2E] px-5 py-5 shadow-lg shadow-black/20">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#6B7A99]">Due Now</p>
                  <p className="mt-4 text-3xl font-bold text-[#EAF0FF]">{formatMoney(Number(teacherPayments?.totals?.dueAmount || 0))}</p>
                  <p className="mt-4 text-sm text-[#A9B4CC]">Teacher add-ons are optional, so no automatic teacher dues are created.</p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-[#111B2E] px-5 py-5 shadow-lg shadow-black/20">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#6B7A99]">Payment Rows</p>
                  <p className="mt-4 text-3xl font-bold text-[#EAF0FF]">{teacherPayments?.totals?.successCount || 0}</p>
                  <p className="mt-4 text-sm text-[#A9B4CC]">{teacherPayments?.totals?.pendingCount || 0} pending teacher payment row{teacherPayments?.totals?.pendingCount === 1 ? '' : 's'} remain open.</p>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-3">
                {teacherPayments?.breakdown?.map((entry: any) => (
                  <div key={entry.service} className="rounded-[24px] border border-white/10 bg-[#111B2E] px-5 py-5 shadow-lg shadow-black/20">
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#6B7A99]">{entry.label}</p>
                    <p className="mt-4 text-3xl font-bold text-[#EAF0FF]">{formatMoney(Number(entry.successAmount || 0))}</p>
                    <div className="mt-4 flex items-center justify-between text-sm text-[#A9B4CC]">
                      <span>{entry.successCount || 0} successful</span>
                      <span>{formatMoney(Number(entry.pendingAmount || 0))} pending</span>
                    </div>
                  </div>
                ))}
              </div>

              <section className="rounded-[28px] border border-white/10 bg-[#111B2E] px-6 py-6 shadow-xl shadow-black/20">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#6B7A99]">Teacher Payments</p>
                    <h2 className="mt-2 text-2xl font-bold text-[#EAF0FF]">Latest subscription collections</h2>
                  </div>
                  <div className="rounded-full bg-[#16233A] px-4 py-2 text-sm font-semibold text-[#EAF0FF]">
                    {teacherPayments?.recent?.length || 0} recent payment rows
                  </div>
                </div>

                <div className="mt-6 overflow-x-auto">
                  <table className="w-full min-w-[940px] text-left text-sm text-[#A9B4CC]">
                    <thead>
                      <tr className="border-b border-white/10 text-xs uppercase tracking-[0.18em] text-[#6B7A99]">
                        <th className="px-3 py-3">Teacher</th>
                        <th className="px-3 py-3">Service</th>
                        <th className="px-3 py-3">Plan</th>
                        <th className="px-3 py-3">Amount</th>
                        <th className="px-3 py-3">Status</th>
                        <th className="px-3 py-3">Reference</th>
                        <th className="px-3 py-3">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teacherPayments?.recent?.length ? teacherPayments.recent.map((payment: any) => (
                        <tr key={`${payment.subscriptionType}-${payment.id}`} className="border-b border-white/5 align-top">
                          <td className="px-3 py-4">
                            <p className="font-semibold text-[#EAF0FF]">{payment.userName}</p>
                            <p className="text-xs text-[#6B7A99]">{payment.userEmail}</p>
                          </td>
                          <td className="px-3 py-4 text-[#EAF0FF]">{payment.label}</td>
                          <td className="px-3 py-4 text-[#EAF0FF]">{payment.planType}</td>
                          <td className="px-3 py-4 text-[#EAF0FF]">{formatMoney(Number(payment.amount || 0))}</td>
                          <td className="px-3 py-4">
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${payment.status === 'success' ? 'border border-emerald-500/20 bg-emerald-500/15 text-emerald-300' : 'border border-amber-500/20 bg-amber-500/15 text-amber-300'}`}>
                              {payment.status}
                            </span>
                          </td>
                          <td className="px-3 py-4 text-[#EAF0FF]">{payment.transactionRef || 'No reference'}</td>
                          <td className="px-3 py-4 text-[#EAF0FF]">{formatDateTime(payment.paymentDate || payment.createdAt)}</td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={7} className="px-3 py-8 text-center text-sm text-[#A9B4CC]">No teacher subscription payments have been recorded yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

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
                              <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">No required dues</span>
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
            </div>
          )}

          {currentTab === 'system' && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-[24px] border border-white/10 bg-[#111B2E] px-5 py-5 shadow-lg shadow-black/20">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#6B7A99]">Monthly Base Stack</p>
                  <p className="mt-4 text-3xl font-bold text-[#EAF0FF]">{formatMoney(Number(systemPayments?.monthlyBaseStack || 0))}</p>
                  <p className="mt-4 text-sm text-[#A9B4CC]">One main subscription at $9 monthly or $100 yearly.</p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-[#111B2E] px-5 py-5 shadow-lg shadow-black/20">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#6B7A99]">Due Right Now</p>
                  <p className="mt-4 text-3xl font-bold text-[#EAF0FF]">{formatMoney(Number(systemPayments?.totalDueAmount || 0))}</p>
                  <p className="mt-4 text-sm text-[#A9B4CC]">Base dues plus any extra live-hour overflow not covered by reserve.</p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-[#111B2E] px-5 py-5 shadow-lg shadow-black/20">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#6B7A99]">Prepaid Live Hours</p>
                  <p className="mt-4 text-3xl font-bold text-[#EAF0FF]">{formatHours(Number(systemPayments?.prepaidBalance || 0))}</p>
                  <p className="mt-4 text-sm text-[#A9B4CC]">Operational reserve the superadmin can buy in advance and resell to teachers.</p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-[#111B2E] px-5 py-5 shadow-lg shadow-black/20">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#6B7A99]">Available To Allocate</p>
                  <p className="mt-4 text-3xl font-bold text-[#EAF0FF]">{formatHours(Number(systemPayments?.availableToAllocate || 0))}</p>
                  <p className="mt-4 text-sm text-[#A9B4CC]">{formatHours(Number(systemPayments?.allocatedHours || 0))} of extra time is already committed to teacher accounts.</p>
                </div>
              </div>

              <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                <section className="rounded-[28px] border border-white/10 bg-[#111B2E] px-6 py-6 shadow-xl shadow-black/20">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#6B7A99]">System Dues</p>
                      <h2 className="mt-2 text-2xl font-bold text-[#EAF0FF]">Current system payment stack</h2>
                      {systemBillingOwner && (
                        <p className="mt-2 text-sm text-[#A9B4CC]">
                          Billing owner: {systemBillingOwner.name} ({systemBillingOwner.email})
                        </p>
                      )}
                    </div>
                    <div className="rounded-full bg-[#16233A] px-4 py-2 text-sm font-semibold text-[#EAF0FF]">
                      {formatMoney(Number(systemPayments?.totalDueAmount || 0))} total due
                    </div>
                  </div>

                  <div className="mt-6 space-y-3">
                    {systemPayments?.dueLines?.map((line: any) => (
                      <div key={line.key} className={`rounded-2xl border px-4 py-4 ${dueLineToneMap[line.status] || dueLineToneMap.due}`}>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-lg font-semibold">{line.label}</p>
                            <p className="mt-2 text-sm leading-6 text-inherit/80">{line.description}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold">{formatMoney(Number(line.amount || 0))}</p>
                            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-inherit/80">{line.status}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 rounded-3xl border border-white/10 bg-[#16233A] px-5 py-5 text-sm text-[#A9B4CC]">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B7A99]">Live usage this month</p>
                        <p className="mt-2 text-xl font-bold text-[#EAF0FF]">{formatHours(Number(systemPayments?.totalLiveHoursUsed || 0))}</p>
                        <p className="mt-2 leading-6">Base plan covers {formatHours(Number(systemPayments?.baseLiveHoursCovered || 16))}. Overflow currently stands at {formatHours(Number(systemPayments?.overflowHours || 0))}.</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B7A99]">Storage tracked</p>
                        <p className="mt-2 text-xl font-bold text-[#EAF0FF]">{Number(systemPayments?.totalStorageGB || 0).toFixed(2)} GB</p>
                        <p className="mt-2 leading-6">Billable overflow after prepaid reserve is {formatHours(Number(systemPayments?.billableOverflowHours || 0))}. Reserve is tracked separately from subscription checkout.</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => handleSystemCheckout('monthly')}
                      disabled={Boolean(checkoutLoading) || !(systemPayments?.baseDueItems?.length)}
                      className="rounded-2xl border border-indigo-400/30 bg-indigo-500/15 px-4 py-4 text-left text-[#EAF0FF] transition hover:bg-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-100">Pay Monthly Subscription</p>
                      <p className="mt-2 text-2xl font-bold">{formatMoney(Number(systemPayments?.baseDueAmount || 0))}</p>
                      <p className="mt-2 text-sm text-[#A9B4CC]">
                        {checkoutLoading === 'system-monthly' ? 'Opening checkout...' : 'Settle the current monthly main subscription.'}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSystemCheckout('yearly')}
                      disabled={Boolean(checkoutLoading) || !(systemPayments?.baseDueItems?.length)}
                      className="rounded-2xl border border-emerald-400/30 bg-emerald-500/15 px-4 py-4 text-left text-[#EAF0FF] transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100">Pay Yearly Subscription</p>
                      <p className="mt-2 text-2xl font-bold">{formatMoney(systemYearlyDueAmount)}</p>
                      <p className="mt-2 text-sm text-[#A9B4CC]">
                        {checkoutLoading === 'system-yearly' ? 'Opening checkout...' : 'Cover the yearly main subscription in one payment.'}
                      </p>
                    </button>
                  </div>

                  {(viewer?.role === 'super_admin' || viewer?.systemOverride) && (
                    <div className="mt-5 rounded-3xl border border-amber-400/20 bg-amber-500/10 px-5 py-5 text-sm text-amber-100">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-100">Manual Access Grant</p>
                      <p className="mt-3 leading-6">
                        Use this when the main subscription was paid outside the gateway and access should be granted immediately. Monthly grants cover through the next 18th. Yearly grants cover the full year.
                      </p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={() => handleManualSystemGrant('monthly')}
                          disabled={Boolean(savingTarget)}
                          className="rounded-2xl border border-indigo-400/30 bg-indigo-500/15 px-4 py-4 text-left text-[#EAF0FF] transition hover:bg-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-100">Manual Monthly Grant</p>
                          <p className="mt-2 text-2xl font-bold">{formatMoney(Number(platformService?.monthly || 9))}</p>
                          <p className="mt-2 text-sm text-[#A9B4CC]">
                            {savingTarget === 'manual-grant-monthly' ? 'Granting access...' : 'Mark monthly billing as paid and reopen access now.'}
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleManualSystemGrant('yearly')}
                          disabled={Boolean(savingTarget)}
                          className="rounded-2xl border border-emerald-400/30 bg-emerald-500/15 px-4 py-4 text-left text-[#EAF0FF] transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100">Manual Yearly Grant</p>
                          <p className="mt-2 text-2xl font-bold">{formatMoney(Number(platformService?.yearly || 100))}</p>
                          <p className="mt-2 text-sm text-[#A9B4CC]">
                            {savingTarget === 'manual-grant-yearly' ? 'Granting access...' : 'Mark yearly billing as paid and cover the full year.'}
                          </p>
                        </button>
                      </div>
                    </div>
                  )}
                </section>

                <section className="space-y-6">
                  <div className="rounded-[28px] border border-white/10 bg-[#111B2E] px-6 py-6 shadow-xl shadow-black/20">
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#6B7A99]">Global Live-Hours Policy</p>
                    <h2 className="mt-2 text-2xl font-bold text-[#EAF0FF]">Give every teacher 2 hours by default, then add more globally when needed</h2>
                    <p className="mt-3 text-sm leading-7 text-[#A9B4CC]">
                      The global switch forces the monthly allowance model on for all teachers. The default hours field is the base monthly allowance every teacher receives before any selective extra hours are added.
                    </p>

                    <div className="mt-5 rounded-3xl border border-white/10 bg-[#16233A] px-5 py-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div className="flex-1">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B7A99]">Default monthly hours per teacher</p>
                          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
                            <input
                              type="number"
                              min="0.5"
                              step="0.5"
                              value={globalHoursInput}
                              onChange={(event) => setGlobalHoursInput(event.target.value)}
                              className="w-full rounded-2xl border border-white/10 bg-[#111B2E] px-4 py-3 text-lg font-semibold text-[#EAF0FF] focus:border-indigo-400/40 focus:outline-none sm:max-w-[220px]"
                            />
                            <span className="text-sm text-[#A9B4CC]">Current base: {formatHours(Number(liveHoursPolicy?.limitHours || 0))}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setAllocationOnlyEnabled((current) => !current)}
                          className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${allocationOnlyEnabled ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-100' : 'border-amber-400/30 bg-amber-500/15 text-amber-100'}`}
                        >
                          {allocationOnlyEnabled ? 'Allocation-Only Enforcement On' : 'Allocation-Only Enforcement Off'}
                        </button>
                      </div>

                      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-[#A9B4CC]">
                          {allocationOnlyEnabled
                            ? 'All teachers are forced onto the monthly allowance model. Extra hours stack on top of the base allowance.'
                            : 'Teachers follow the normal live-hours policy, but you can still set the next base allowance here.'}
                        </p>
                        <button
                          type="button"
                          onClick={handleGlobalHoursPolicySave}
                          disabled={savingTarget === 'global-hours'}
                          className="rounded-2xl bg-[#EAF0FF] px-5 py-3 text-sm font-semibold text-[#0B1220] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {savingTarget === 'global-hours' ? 'Saving...' : 'Save Global Policy'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-white/10 bg-[#111B2E] px-6 py-6 shadow-xl shadow-black/20">
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#6B7A99]">Prepaid Reserve</p>
                    <h2 className="mt-2 text-2xl font-bold text-[#EAF0FF]">Buy extra live hours in advance</h2>
                    <p className="mt-3 text-sm leading-7 text-[#A9B4CC]">
                      Add extra live-hour reserve here when the superadmin prepays operational capacity. That reserve is separate from the global default and is used only for additional teacher hours.
                    </p>

                    <div className="mt-5 rounded-3xl border border-white/10 bg-[#16233A] px-5 py-5">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B7A99]">Current balance</p>
                          <p className="mt-2 text-2xl font-bold text-[#EAF0FF]">{formatHours(Number(systemPayments?.prepaidBalance || 0))}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B7A99]">Allocated</p>
                          <p className="mt-2 text-2xl font-bold text-[#EAF0FF]">{formatHours(Number(systemPayments?.allocatedHours || 0))}</p>
                        </div>
                      </div>

                      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={reserveHoursInput}
                          onChange={(event) => setReserveHoursInput(event.target.value)}
                          className="w-full rounded-2xl border border-white/10 bg-[#111B2E] px-4 py-3 text-lg font-semibold text-[#EAF0FF] focus:border-indigo-400/40 focus:outline-none"
                          placeholder="Hours to add"
                        />
                        <button
                          type="button"
                          onClick={handleReserveTopUp}
                          disabled={savingTarget === 'reserve'}
                          className="rounded-2xl bg-[#EAF0FF] px-5 py-3 text-sm font-semibold text-[#0B1220] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {savingTarget === 'reserve' ? 'Saving...' : 'Add To Reserve'}
                        </button>
                      </div>
                    </div>

                    {Number(systemPayments?.overAllocatedHours || 0) > 0 && (
                      <div className="mt-5 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-4 text-sm text-rose-100">
                        Teacher extra-hour allocations exceed the prepaid reserve by {formatHours(Number(systemPayments?.overAllocatedHours || 0))}. Top up the reserve or reduce allocations.
                      </div>
                    )}
                  </div>

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
                </section>
              </div>

              <section className="rounded-[28px] border border-white/10 bg-[#111B2E] px-6 py-6 shadow-xl shadow-black/20">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#6B7A99]">Teacher Extra-Hour Allocation</p>
                    <h2 className="mt-2 text-2xl font-bold text-[#EAF0FF]">Add extra hours on top of the global teacher allowance</h2>
                  </div>
                  <div className="rounded-full bg-[#16233A] px-4 py-2 text-sm font-semibold text-[#EAF0FF]">
                    {systemPayments?.allocations?.length || 0} teacher accounts tracked
                  </div>
                </div>

                <div className="mt-6 grid gap-4 xl:grid-cols-2">
                  {systemPayments?.allocations?.map((entry: any) => (
                    <div key={entry.teacherId} className="rounded-[24px] border border-white/10 bg-[#16233A] px-5 py-5">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-lg font-semibold text-[#EAF0FF]">{entry.teacherName}</p>
                          <p className="text-sm text-[#A9B4CC]">{entry.teacherEmail}</p>
                          <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[#6B7A99]">
                            Base allowance {formatHours(Number(entry.baseHours || 0))} • Total monthly limit {formatHours(Number(entry.totalHours || 0))}
                          </p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${entry.hasLiveClassAccess ? 'border border-emerald-500/20 bg-emerald-500/15 text-emerald-300' : 'border border-amber-500/20 bg-amber-500/15 text-amber-300'}`}>
                          {entry.hasLiveClassAccess ? 'Live class active' : 'Live class due'}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-4">
                        <div className="rounded-2xl bg-[#111B2E] px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B7A99]">Used</p>
                          <p className="mt-2 text-xl font-bold text-[#EAF0FF]">{formatHours(Number(entry.usedHours || 0))}</p>
                        </div>
                        <div className="rounded-2xl bg-[#111B2E] px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B7A99]">Extra</p>
                          <p className="mt-2 text-xl font-bold text-[#EAF0FF]">{formatHours(Number(entry.allocatedHours || 0))}</p>
                        </div>
                        <div className="rounded-2xl bg-[#111B2E] px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B7A99]">Total</p>
                          <p className="mt-2 text-xl font-bold text-[#EAF0FF]">{formatHours(Number(entry.totalHours || 0))}</p>
                        </div>
                        <div className="rounded-2xl bg-[#111B2E] px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B7A99]">Remaining</p>
                          <p className="mt-2 text-xl font-bold text-[#EAF0FF]">{formatHours(Number(entry.remainingHours || 0))}</p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={allocationInputs[String(entry.teacherId)] ?? '0'}
                          onChange={(event) => setAllocationInputs((current) => ({
                            ...current,
                            [String(entry.teacherId)]: event.target.value,
                          }))}
                          className="w-full rounded-2xl border border-white/10 bg-[#111B2E] px-4 py-3 text-lg font-semibold text-[#EAF0FF] focus:border-indigo-400/40 focus:outline-none"
                          placeholder="Extra hours"
                        />
                        <button
                          type="button"
                          onClick={() => handleAllocationSave(entry.teacherId)}
                          disabled={savingTarget === `allocation-${entry.teacherId}`}
                          className="rounded-2xl bg-[#EAF0FF] px-5 py-3 text-sm font-semibold text-[#0B1220] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {savingTarget === `allocation-${entry.teacherId}` ? 'Saving...' : 'Save Extra Hours'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
                <section className="rounded-[28px] border border-white/10 bg-[#111B2E] px-6 py-6 shadow-xl shadow-black/20">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#6B7A99]">System Payment History</p>
                  <div className="mt-5 space-y-3">
                    {systemPayments?.paymentHistory?.length ? systemPayments.paymentHistory.map((payment: any) => (
                      <div key={`${payment.subscriptionType}-${payment.transactionRef || payment.createdAt}`} className="rounded-2xl border border-white/10 bg-[#16233A] px-4 py-4">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="font-semibold text-[#EAF0FF]">{payment.subscriptionType === 'platform' ? 'Main Subscription' : payment.subscriptionType === 'live_class' ? 'Live Classes Add-on' : 'Storage Add-on'}</p>
                            <p className="mt-1 text-sm text-[#A9B4CC]">{payment.planType} plan • {payment.status}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-[#EAF0FF]">{formatMoney(Number(payment.amount || 0))}</p>
                            <p className="mt-1 text-xs text-[#6B7A99]">{formatDateTime(payment.paymentDate || payment.createdAt)}</p>
                          </div>
                        </div>
                      </div>
                    )) : (
                      <div className="rounded-2xl border border-white/10 bg-[#16233A] px-4 py-6 text-sm text-[#A9B4CC]">No system payment history is recorded for this account yet.</div>
                    )}
                  </div>
                </section>

                <section className="rounded-[28px] border border-white/10 bg-[#111B2E] px-6 py-6 shadow-xl shadow-black/20">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#6B7A99]">Add-on Liability Reference</p>
                  <p className="mt-2 text-sm leading-7 text-[#A9B4CC]">
                    These are the original system prices used to settle overflow and operational add-ons when teachers consume more capacity.
                  </p>
                  <div className="mt-5 grid gap-3">
                    {systemPayments?.addonCatalog?.map((addon: any) => (
                      <div key={addon.key} className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-[#16233A] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-semibold text-[#EAF0FF]">{addon.label}</p>
                          <p className="mt-1 text-sm text-[#A9B4CC]">{addon.description}</p>
                        </div>
                        <div className="text-right text-sm text-[#EAF0FF]">
                          <p>Base {formatMoney(Number(addon.basePrice || 0))}{addon.unit}</p>
                          <p className="text-[#A9B4CC]">Effective {formatMoney(Number(addon.effectivePrice || 0))}{addon.unit}</p>
                        </div>
                      </div>
                    ))}
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
                        <p className="mt-2 text-xs text-[#6B7A99]">{formatDateTime(event.timestamp)}</p>
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
            </div>
          )}
        </>
      )}
    </div>
  );
}