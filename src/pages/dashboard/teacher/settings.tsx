import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import TeacherDashboardLayout from '../../../components/layout/TeacherDashboardLayout';
import { api } from '../../../../lib/api';
import { useAuth } from '../../../../lib/auth';

const badgeStyles: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  inactive: 'bg-slate-100 text-slate-600',
  cancelled: 'bg-rose-100 text-rose-700',
  expired: 'bg-rose-100 text-rose-700',
};

export default function TeacherSettings() {
  const { refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [overview, setOverview] = useState<any>(null);
  const [form, setForm] = useState({
    name: '',
    bio: '',
    avatar_url: '',
    country: '',
    certificate_name: '',
  });

  useEffect(() => {
    let cancelled = false;

    const loadSettings = async () => {
      setLoading(true);
      setError('');

      const [profileResult, billingResult] = await Promise.allSettled([
        api.getProfile(),
        api.getBillingOverview(),
      ]);

      if (cancelled) {
        return;
      }

      if (profileResult.status === 'fulfilled') {
        const profile = profileResult.value.profile;
        setEmail(profile.email || '');
        setForm({
          name: profile.name || '',
          bio: profile.bio || '',
          avatar_url: profile.avatar_url || '',
          country: profile.country || '',
          certificate_name: profile.certificate_name || '',
        });
      } else {
        setError(profileResult.reason instanceof Error ? profileResult.reason.message : 'Unable to load your teaching profile.');
      }

      if (billingResult.status === 'fulfilled') {
        setOverview(billingResult.value.teacher || null);
      }

      setLoading(false);
    };

    void loadSettings();

    return () => {
      cancelled = true;
    };
  }, []);

  const subscriptions = useMemo(() => {
    if (!overview?.subscriptions) {
      return [] as Array<{ key: string; label: string; status: string; plan: string; active: boolean }>;
    }

    return [
      { key: 'platform', data: overview.subscriptions.platform },
      { key: 'storage', data: overview.subscriptions.storage },
      { key: 'liveClass', data: overview.subscriptions.liveClass },
    ].map((entry) => ({
      key: entry.key,
      label: entry.data?.label || entry.key,
      status: entry.data?.subscription?.status || (entry.data?.hasActiveSubscription ? 'active' : entry.data?.pendingPayments?.length ? 'pending' : 'inactive'),
      plan: entry.data?.subscription?.planType || 'not set',
      active: Boolean(entry.data?.hasActiveSubscription),
    }));
  }, [overview]);

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setError('Your display name is required.');
      return;
    }

    setSaving(true);
    setMessage('');
    setError('');

    try {
      await api.updateProfile({
        name: form.name.trim(),
        bio: form.bio.trim(),
        avatar_url: form.avatar_url.trim(),
        country: form.country.trim(),
        certificate_name: form.certificate_name.trim(),
      });

      if (form.avatar_url.trim()) {
        localStorage.setItem('student_profile_avatar', form.avatar_url.trim());
      } else {
        localStorage.removeItem('student_profile_avatar');
      }

      window.dispatchEvent(new Event('profile-updated'));
      await refreshUser();
      setMessage('Teaching profile updated successfully.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save your teaching profile.');
    } finally {
      setSaving(false);
    }
  };

  const liveHours = overview?.liveHours;

  return (
    <TeacherDashboardLayout>
      <div className="space-y-8">
        <section className="rounded-[32px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(244,114,182,0.18),transparent_28%),linear-gradient(135deg,#ffffff,#f8fafc_45%,#fef2f2)] px-6 py-8 shadow-xl shadow-slate-200/70">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">Teaching Settings</p>
          <h1 className="mt-3 text-4xl font-bold text-slate-950">Manage your teacher profile and service access</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            Update the profile students see, keep your avatar in sync across the dashboard, and monitor which paid teacher services are active.
          </p>
        </section>

        {message && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{message}</div>}
        {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div>}

        {loading ? (
          <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-10 text-sm text-slate-500 shadow-lg">Loading teacher settings...</div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-lg shadow-slate-200/60">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Profile</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-950">Teacher identity and classroom details</h2>

              <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700">Display name</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(event) => handleChange('name', event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700">Email address</label>
                    <input
                      type="email"
                      value={email}
                      disabled
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700">Bio</label>
                  <textarea
                    value={form.bio}
                    onChange={(event) => handleChange('bio', event.target.value)}
                    rows={5}
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900"
                    placeholder="Tell students what you teach, how you teach, and what outcomes they can expect."
                  />
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700">Country</label>
                    <input
                      type="text"
                      value={form.country}
                      onChange={(event) => handleChange('country', event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900"
                      placeholder="Nigeria"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700">Certificate name</label>
                    <input
                      type="text"
                      value={form.certificate_name}
                      onChange={(event) => handleChange('certificate_name', event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900"
                      placeholder="Name shown on teacher certificates"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700">Avatar URL</label>
                  <input
                    type="url"
                    value={form.avatar_url}
                    onChange={(event) => handleChange('avatar_url', event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900"
                    placeholder="https://example.com/avatar.jpg"
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? 'Saving profile...' : 'Save teacher settings'}
                </button>
              </form>
            </section>

            <section className="space-y-6">
              <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-lg shadow-slate-200/60">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Preview</p>
                <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 px-5 py-5">
                  <div className="flex items-center gap-4">
                    <img
                      src={form.avatar_url || 'https://ui-avatars.com/api/?name=Teacher&background=0f172a&color=ffffff'}
                      alt="Teacher avatar preview"
                      className="h-20 w-20 rounded-3xl border border-slate-200 object-cover"
                    />
                    <div>
                      <h3 className="text-xl font-bold text-slate-950">{form.name || 'Teacher name'}</h3>
                      <p className="mt-1 text-sm text-slate-600">{form.country || 'Country not set'} • {form.certificate_name || 'Certificate name not set'}</p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-slate-600">{form.bio || 'Your teacher bio will appear here once you add it.'}</p>
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-lg shadow-slate-200/60">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Service Status</p>
                    <h2 className="mt-2 text-2xl font-bold text-slate-950">Teacher access services</h2>
                  </div>
                  <Link to="/teacher/billing" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    Open billing
                  </Link>
                </div>

                <div className="mt-5 space-y-3">
                  {subscriptions.map((subscription) => (
                    <div key={subscription.key} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">{subscription.label}</p>
                          <p className="mt-1 text-sm text-slate-500">Plan: {subscription.plan}</p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeStyles[subscription.status] || badgeStyles.inactive}`}>
                          {subscription.status}
                        </span>
                      </div>
                    </div>
                  ))}
                  {!subscriptions.length && (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                      No subscription data is available yet.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-lg shadow-slate-200/60">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Live Hours</p>
                <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 px-5 py-5">
                  <p className="text-lg font-semibold text-slate-950">
                    {liveHours?.mode === 'limited'
                      ? `${liveHours.remainingHours ?? 0} hours remaining`
                      : 'Open live classroom access'}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {liveHours?.mode === 'limited'
                      ? `You have used ${liveHours.hoursUsedThisMonth ?? 0} hours this month out of ${liveHours.monthlyLimitHours ?? 0}.`
                      : 'There is no live-hour cap on your current teacher setup.'}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">Reset date: {liveHours?.resetAt ? new Date(liveHours.resetAt).toLocaleString() : 'Not available'}</p>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </TeacherDashboardLayout>
  );
}