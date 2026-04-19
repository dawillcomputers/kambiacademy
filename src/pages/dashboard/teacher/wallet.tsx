import React, { useEffect, useState } from 'react';
import { api } from '../../../../lib/api';
import TeacherDashboardLayout from '../../../components/layout/TeacherDashboardLayout';

export default function TeacherWalletPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [overview, setOverview] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const r = await api.getBillingOverview();
        if (!cancelled) setOverview(r.teacher || null);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load wallet data.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  const revenue = overview?.revenue;
  const costs = overview?.costs;
  const profitability = overview?.profitability;
  const usage = overview?.usage;
  const history = overview?.paymentHistory || [];
  const events = overview?.systemEvents || [];

  const fmt = (v: number) => `₦${(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtUSD = (v: number) => `$${(v || 0).toFixed(2)}`;

  return (
    <TeacherDashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Wallet</h1>
          <p className="mt-1 text-sm text-slate-500">Track your teaching revenue, platform costs, and profitability.</p>
        </div>

        {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500">Loading wallet...</div>
        ) : (
          <>
            {/* Earnings Summary */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-green-200 bg-gradient-to-br from-green-100 via-emerald-50 to-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-green-700/70">Total Earnings</p>
                <p className="mt-3 text-3xl font-bold text-green-900">{fmt(revenue?.estimatedRevenue || 0)}</p>
                <p className="mt-2 text-xs text-green-700/70">Gross revenue from all sources</p>
              </div>
              <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-100 via-sky-50 to-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-700/70">Course Revenue</p>
                <p className="mt-3 text-3xl font-bold text-blue-900">{fmt(revenue?.platformCourseRevenue || 0)}</p>
                <p className="mt-2 text-xs text-blue-700/70">From student course enrollments</p>
              </div>
              <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-100 via-purple-50 to-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-violet-700/70">Subscription Revenue</p>
                <p className="mt-3 text-3xl font-bold text-violet-900">{fmt(revenue?.subscriptionRevenue || 0)}</p>
                <p className="mt-2 text-xs text-violet-700/70">From paid subscriptions</p>
              </div>
            </div>

            {/* Profitability */}
            {profitability && (
              <div className={`rounded-2xl border p-5 shadow-sm ${
                profitability.status === 'healthy' ? 'border-emerald-200 bg-emerald-50' :
                profitability.status === 'warning' ? 'border-amber-200 bg-amber-50' :
                'border-rose-200 bg-rose-50'
              }`}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Profitability</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      Profit: <strong>{fmt(profitability.profit)}</strong> • Margin: <strong>{(profitability.margin * 100).toFixed(1)}%</strong>
                    </p>
                  </div>
                  <span className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
                    profitability.status === 'healthy' ? 'bg-emerald-100 text-emerald-700' :
                    profitability.status === 'warning' ? 'bg-amber-100 text-amber-700' :
                    'bg-rose-100 text-rose-700'
                  }`}>{profitability.label}</span>
                </div>
              </div>
            )}

            {/* Usage & Costs */}
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="mb-4 text-lg font-bold text-slate-900">Platform Usage</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Courses', value: usage?.coursesCount || 0 },
                    { label: 'Classes', value: usage?.classesCount || 0 },
                    { label: 'Materials', value: usage?.materialsCount || 0 },
                    { label: 'Live Sessions', value: usage?.liveSessionsCount || 0 },
                    { label: 'Storage Used', value: `${(usage?.storageGB || 0).toFixed(2)} GB` },
                    { label: 'Video Bandwidth', value: `${(usage?.videoGB || 0).toFixed(2)} GB` },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-2.5">
                      <span className="text-sm text-slate-600">{item.label}</span>
                      <span className="text-sm font-semibold text-slate-900">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="mb-4 text-lg font-bold text-slate-900">Estimated Costs</h3>
                <div className="space-y-3">
                  {costs && [
                    { label: 'SFU / Video', value: fmtUSD(costs.sfuCost || 0) },
                    { label: 'Storage', value: fmtUSD(costs.storageCost || 0) },
                    { label: 'Workers', value: fmtUSD(costs.workerCost || 0) },
                    { label: 'Total Estimated', value: fmtUSD(costs.totalCost || 0), bold: true },
                  ].map(item => (
                    <div key={item.label} className={`flex items-center justify-between rounded-lg px-4 py-2.5 ${item.bold ? 'bg-slate-900 text-white' : 'bg-slate-50'}`}>
                      <span className={`text-sm ${item.bold ? 'font-semibold' : 'text-slate-600'}`}>{item.label}</span>
                      <span className={`text-sm font-semibold ${item.bold ? '' : 'text-slate-900'}`}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-lg font-bold text-slate-900">Recent Transactions</h3>
              {history.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                        <th className="px-3 py-2">Type</th>
                        <th className="px-3 py-2">Plan</th>
                        <th className="px-3 py-2">Amount</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">Gateway</th>
                        <th className="px-3 py-2">Reference</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.slice(0, 12).map((h: any, i: number) => (
                        <tr key={`${h.transactionRef}-${i}`} className="border-b border-slate-100">
                          <td className="px-3 py-2 font-medium text-slate-900">
                            {h.subscriptionType === 'live_class' ? 'Live Class' : h.subscriptionType === 'storage' ? 'Storage' : 'Platform'}
                          </td>
                          <td className="px-3 py-2 text-slate-600">{h.planType}</td>
                          <td className="px-3 py-2 font-semibold text-slate-900">{fmtUSD(Number(h.amount || 0))}</td>
                          <td className="px-3 py-2">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                              h.status === 'success' ? 'bg-emerald-100 text-emerald-700' :
                              h.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                              'bg-slate-100 text-slate-600'
                            }`}>{h.status}</span>
                          </td>
                          <td className="px-3 py-2 text-slate-500">{h.paymentGateway || 'flutterwave'}</td>
                          <td className="px-3 py-2 text-xs text-slate-500">{h.transactionRef || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-slate-500">No transactions yet.</p>
              )}
            </div>

            {/* System Events */}
            {events.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="mb-4 text-lg font-bold text-slate-900">Activity Log</h3>
                <div className="space-y-2">
                  {events.slice(0, 8).map((e: any, i: number) => (
                    <div key={`${e.timestamp}-${i}`} className="flex items-start gap-3 rounded-lg bg-slate-50 px-4 py-3">
                      <span className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full bg-slate-400" />
                      <div>
                        <p className="text-sm text-slate-700">{e.description}</p>
                        <p className="text-xs text-slate-400">{e.action} • {new Date(e.timestamp).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </TeacherDashboardLayout>
  );
}
