import React, { useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import DashboardShell, { SidebarItem } from '../../../../components/layout/DashboardShell';
import { api } from '../../../../lib/api';
import { useAuth } from '../../../../lib/auth';
import SuperAdminDashboard from '../../../../components/SuperAdminDashboard';
import SuperAdminUsers from './users';
import SuperAdminCourses from './courses';
import SuperAdminBootcamps from './bootcamps';
import SuperAdminHomepage from './homepage';
import SuperAdminAnalytics from './analytics';
import SuperAdminFinance from './finance';
import SuperAdminSettings from './settings';
import SuperAdminAudit from './audit';
import SuperAdminBilling from './billing';
import SuperAdminPricing from './pricing';

const formatScheduleDate = (value?: string | null) => {
  if (!value) {
    return 'Not scheduled';
  }

  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const bannerToneMap: Record<string, { panel: string; badge: string; text: string }> = {
  warning: {
    panel: 'border-amber-400/20 bg-[linear-gradient(135deg,rgba(245,158,11,0.16),rgba(17,27,46,0.94))]',
    badge: 'border-amber-400/30 bg-amber-500/15 text-amber-100',
    text: 'text-amber-100',
  },
  due: {
    panel: 'border-orange-400/20 bg-[linear-gradient(135deg,rgba(249,115,22,0.16),rgba(17,27,46,0.94))]',
    badge: 'border-orange-400/30 bg-orange-500/15 text-orange-100',
    text: 'text-orange-100',
  },
  locked: {
    panel: 'border-rose-400/20 bg-[linear-gradient(135deg,rgba(244,63,94,0.18),rgba(17,27,46,0.94))]',
    badge: 'border-rose-400/30 bg-rose-500/15 text-rose-100',
    text: 'text-rose-100',
  },
};

const SuperAdminBillingBanner: React.FC<{ billing: any }> = ({ billing }) => {
  const tone = bannerToneMap[billing?.status] || bannerToneMap.warning;

  return (
    <section className={`mx-6 mt-6 rounded-[28px] border px-6 py-6 shadow-xl shadow-black/20 lg:mx-8 ${tone.panel}`}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#A9B4CC]">Superadmin Subscription</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${tone.badge}`}>
              {billing?.label || 'Payment attention needed'}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-[#EAF0FF]">
              Current cycle: {billing?.currentCycleLabel || 'May 2026'}
            </span>
          </div>
          <p className={`mt-4 max-w-3xl text-sm leading-7 ${tone.text}`}>{billing?.message}</p>
        </div>

        <Link
          to="/superadmin/billing"
          className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-[#EAF0FF] transition hover:bg-white/15"
        >
          Open billing
        </Link>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#A9B4CC]">Warning starts</p>
          <p className="mt-2 text-lg font-bold text-[#EAF0FF]">{formatScheduleDate(billing?.warningStartDate)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#A9B4CC]">Due date</p>
          <p className="mt-2 text-lg font-bold text-[#EAF0FF]">{formatScheduleDate(billing?.dueDate)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#A9B4CC]">Dashboard lock</p>
          <p className="mt-2 text-lg font-bold text-[#EAF0FF]">{formatScheduleDate(billing?.lockDate)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#A9B4CC]">Current coverage</p>
          <p className="mt-2 text-lg font-bold text-[#EAF0FF]">
            {billing?.currentSubscription?.endDate ? formatScheduleDate(billing.currentSubscription.endDate) : 'No paid cycle'}
          </p>
        </div>
      </div>
    </section>
  );
};

const fullSidebarItems: SidebarItem[] = [
  { name: 'Dashboard', icon: '📊', path: '/superadmin' },
  { name: 'Homepage', icon: '🎨', path: '/superadmin/homepage' },
  { name: 'Users', icon: '👥', path: '/superadmin/users' },
  { name: 'Courses', icon: '📚', path: '/superadmin/courses' },
  { name: 'Bootcamps', icon: '🚀', path: '/superadmin/bootcamps' },
  { name: 'Pricing', icon: '🏷️', path: '/superadmin/pricing' },
  { name: 'Billing', icon: '💳', path: '/superadmin/billing' },
  { name: 'Finance', icon: '💰', path: '/superadmin/finance' },
  { name: 'Analytics', icon: '📈', path: '/superadmin/analytics' },
  { name: 'Settings', icon: '⚙️', path: '/superadmin/settings' },
  { name: 'Audit Log', icon: '📋', path: '/superadmin/audit' },
];

const systemOverrideSidebarItems: SidebarItem[] = [
  { name: 'Billing', icon: '💳', path: '/superadmin/billing' },
];

const SuperAdminRoutes: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [subscriptionState, setSubscriptionState] = useState<any>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [subscriptionError, setSubscriptionError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadSubscriptionState = async () => {
      setSubscriptionLoading(true);
      setSubscriptionError('');
      try {
        const response = await api.get('/api/subscriptions?action=current');
        if (!cancelled) {
          setSubscriptionState(response);
        }
      } catch (error) {
        if (!cancelled) {
          setSubscriptionError(error instanceof Error ? error.message : 'Failed to check superadmin billing status.');
        }
      } finally {
        if (!cancelled) {
          setSubscriptionLoading(false);
        }
      }
    };

    void loadSubscriptionState();

    return () => {
      cancelled = true;
    };
  }, []);

  const superAdminBilling = subscriptionState?.superAdminBilling;
  const isBillingRoute = location.pathname === '/superadmin/billing' || location.pathname.startsWith('/superadmin/billing/');
  const isSystemOverrideUser = user?.role === 'SOU';
  const sidebarItems = isSystemOverrideUser ? systemOverrideSidebarItems : fullSidebarItems;
  const shouldShowBanner = Boolean(superAdminBilling?.applies && !superAdminBilling?.exempt && (superAdminBilling?.isWarning || superAdminBilling?.isDue || superAdminBilling?.isLocked));

  return (
    <DashboardShell
      sidebarItems={sidebarItems}
      title="KAMBI"
      subtitle="Super Admin"
      variant="superadmin"
    >
      <div className="space-y-6 pb-6">
        {shouldShowBanner && <SuperAdminBillingBanner billing={superAdminBilling} />}

        {subscriptionError && (
          <div className="mx-6 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-200 lg:mx-8">
            {subscriptionError}
          </div>
        )}

        {isSystemOverrideUser && !isBillingRoute ? (
          <Navigate to="/superadmin/billing" replace />
        ) : subscriptionLoading && !isBillingRoute ? (
          <div className="mx-6 rounded-[28px] border border-white/10 bg-[#111B2E] px-6 py-10 text-sm text-[#A9B4CC] shadow-lg lg:mx-8">
            Checking superadmin billing status...
          </div>
        ) : (
          <Routes>
            {isSystemOverrideUser ? (
              <>
                <Route path="/" element={<Navigate to="/superadmin/billing" replace />} />
                <Route path="/billing" element={<SuperAdminBilling />} />
                <Route path="*" element={<Navigate to="/superadmin/billing" replace />} />
              </>
            ) : (
              <>
                <Route path="/" element={<SuperAdminDashboard />} />
                <Route path="/homepage" element={<SuperAdminHomepage />} />
                <Route path="/users" element={<SuperAdminUsers />} />
                <Route path="/courses" element={<SuperAdminCourses />} />
                <Route path="/bootcamps" element={<SuperAdminBootcamps />} />
                <Route path="/billing" element={<SuperAdminBilling />} />
                <Route path="/pricing" element={<SuperAdminPricing />} />
                <Route path="/analytics" element={<SuperAdminAnalytics />} />
                <Route path="/finance" element={<SuperAdminFinance />} />
                <Route path="/settings" element={<SuperAdminSettings />} />
                <Route path="/audit" element={<SuperAdminAudit />} />
              </>
            )}
          </Routes>
        )}
      </div>
    </DashboardShell>
  );
};

export default SuperAdminRoutes;