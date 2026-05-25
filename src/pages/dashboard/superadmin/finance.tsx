import React, { useState, useEffect } from 'react';
import { api } from '../../../../lib/api';

const SuperAdminFinance: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [payoutOverview, setPayoutOverview] = useState<any>(null);
  const [verificationQueue, setVerificationQueue] = useState<any[]>([]);
  const [reviewNotes, setReviewNotes] = useState<Record<number, string>>({});
  const [actionMessage, setActionMessage] = useState('');
  const [workingTeacherId, setWorkingTeacherId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [statsResponse, payoutsResponse, reviewResponse] = await Promise.all([
          api.adminGetStats(),
          api.getFinancePayouts(),
          api.getPayoutVerificationQueue(),
        ]);
        setStats(statsResponse);
        setPayoutOverview(payoutsResponse);
        setVerificationQueue(reviewResponse.requests || []);
      } catch (error) {
        console.error('Failed to load finance data:', error);
      } finally {
        setLoading(false);
      }
    };
    void loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900" />
      </div>
    );
  }

  const totalRevenue = stats?.totalRevenue ?? 0;
  const pendingCount = stats?.pendingPaymentsDueCount ?? 0;
  const pendingAmount = stats?.pendingPaymentsDueAmount ?? 0;
  const totalEnrollments = stats?.totalEnrollments ?? 0;
  const readyPayoutTeachers = (payoutOverview?.tutors_with_balance || []).filter((teacher: any) => teacher.payout_ready);
  const blockedPayoutTeachers = (payoutOverview?.tutors_with_balance || []).filter((teacher: any) => !teacher.payout_ready);
  const readyPayoutAmount = readyPayoutTeachers.reduce((sum: number, teacher: any) => sum + Number(teacher.balance || 0), 0);

  const cards = [
    { label: 'Total Revenue', value: `$${Number(totalRevenue).toLocaleString()}`, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Total Enrollments', value: String(totalEnrollments), color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Pending Payments', value: `$${Number(pendingAmount).toLocaleString()}`, sub: `${pendingCount} pending`, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Ready Payouts', value: `₦${readyPayoutAmount.toLocaleString()}`, sub: `${readyPayoutTeachers.length} teachers ready`, color: 'text-orange-600', bg: 'bg-orange-50' },
  ];

  const recentEnrollments = stats?.recentEnrollments || [];
  const topCourses = stats?.topCourses || [];
  const topTeachers = stats?.topTeachers || [];
  const recentPayouts = payoutOverview?.payouts || [];

  const handleReview = async (teacherId: number, action: 'approve' | 'reject') => {
    setWorkingTeacherId(teacherId);
    setActionMessage('');

    try {
      const response = await api.reviewPayoutVerification(teacherId, action, reviewNotes[teacherId] || '');
      setVerificationQueue(response.requests || []);
      setActionMessage(response.message || 'Payout verification updated.');
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Failed to update payout verification.');
    } finally {
      setWorkingTeacherId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Finance</h1>
        <p className="mt-1 text-sm text-slate-500">Revenue tracking and financial overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className={`rounded-2xl border border-slate-200 ${card.bg} p-5`}>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{card.label}</p>
            <p className={`mt-2 text-2xl font-bold ${card.color}`}>{card.value}</p>
            {card.sub && <p className="mt-1 text-xs text-slate-500">{card.sub}</p>}
          </div>
        ))}
      </div>

      {actionMessage && (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm">
          {actionMessage}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Teacher Payout Verification Queue</h2>
              <p className="mt-1 text-xs text-slate-500">Manual KYC approval is required before automatic payouts can run.</p>
            </div>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
              {verificationQueue.filter((request) => request.verification_status !== 'approved').length} pending
            </span>
          </div>

          <div className="max-h-[720px] space-y-4 overflow-y-auto px-6 py-5">
            {verificationQueue.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                No payout verification requests yet.
              </div>
            ) : verificationQueue.map((request) => (
              <div key={request.teacher_id} className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{request.name}</h3>
                    <p className="mt-1 text-sm text-slate-500">{request.email}</p>
                    <p className="mt-2 text-sm text-slate-600">
                      Available balance: <strong>₦{Number(request.available_balance || 0).toLocaleString()}</strong>
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Bank: {request.bank_name || 'Not set'} • {request.bank_code || 'No code'} • {request.account_number_masked || 'No account'}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${request.verification_status === 'approved' ? 'bg-emerald-100 text-emerald-700' : request.verification_status === 'rejected' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                    {request.verification_status.replace('_', ' ')}
                  </span>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div className="space-y-3">
                    {request.documents.map((document: any) => (
                      <div key={document.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-900">{document.document_label || document.document_type}</p>
                            <p className="mt-1 text-xs text-slate-500">{document.file_name}</p>
                          </div>
                          <a
                            href={api.getTeacherPayoutDocumentUrl(document.id)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-semibold text-slate-700 underline decoration-slate-300 underline-offset-4 hover:text-slate-950"
                          >
                            View
                          </a>
                        </div>
                        <p className="mt-2 text-xs text-slate-500">Uploaded {new Date(document.uploaded_at).toLocaleString()}</p>
                      </div>
                    ))}
                    {!request.documents.length && (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-5 text-sm text-slate-500">
                        No verification documents uploaded.
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                      <p className="text-sm font-semibold text-slate-900">Blocking reasons</p>
                      <div className="mt-3 space-y-2">
                        {request.blocking_reasons?.length ? request.blocking_reasons.map((reason: string) => (
                          <div key={reason} className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">
                            {reason}
                          </div>
                        )) : (
                          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-700">
                            No blockers remain. This teacher is ready for automatic payouts.
                          </div>
                        )}
                      </div>
                    </div>

                    <textarea
                      value={reviewNotes[request.teacher_id] || ''}
                      onChange={(event) => setReviewNotes((current) => ({ ...current, [request.teacher_id]: event.target.value }))}
                      rows={3}
                      placeholder="Add review notes for approval or rejection"
                      className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                    />

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => { void handleReview(request.teacher_id, 'approve'); }}
                        disabled={workingTeacherId === request.teacher_id || !request.ready_for_approval}
                        className="inline-flex rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Approve for payouts
                      </button>
                      <button
                        type="button"
                        onClick={() => { void handleReview(request.teacher_id, 'reject'); }}
                        disabled={workingTeacherId === request.teacher_id}
                        className="inline-flex rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900">Payout Readiness</h2>
            </div>
            <div className="space-y-3 px-6 py-5">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700/70">Ready Teachers</p>
                <p className="mt-2 text-2xl font-bold text-emerald-900">{readyPayoutTeachers.length}</p>
                <p className="mt-2 text-sm text-emerald-800">These teachers can be paid immediately based on their approved payout settings.</p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-700/70">Blocked Teachers</p>
                <p className="mt-2 text-2xl font-bold text-amber-900">{blockedPayoutTeachers.length}</p>
                <p className="mt-2 text-sm text-amber-800">These teachers still have missing bank details or pending verification review.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Processing Payouts</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{payoutOverview?.summary?.total_processing || 0}</p>
                <p className="mt-2 text-sm text-slate-600">Live Flutterwave transfers currently awaiting reconciliation.</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900">Recent Payout Transfers</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {recentPayouts.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-500">No payout transfers yet</div>
              ) : recentPayouts.slice(0, 8).map((payout: any) => (
                <div key={payout.id} className="flex items-center justify-between gap-4 px-6 py-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{payout.id}</p>
                    <p className="mt-1 text-xs text-slate-500">Teacher #{payout.tutor_id} • {new Date(payout.created_at).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900">₦{Number(payout.amount || 0).toLocaleString()}</p>
                    <span className={`mt-1 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${payout.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : payout.status === 'failed' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                      {payout.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">Top Earning Courses</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {topCourses.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500">No course data yet</div>
            ) : topCourses.map((course: any, i: number) => (
              <div key={i} className="flex items-center justify-between px-6 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">{course.course_slug}</p>
                  <p className="text-xs text-slate-500">{course.enrollment_count} enrollments</p>
                </div>
                <span className="text-sm font-bold text-green-600">${Number(course.total_revenue).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">Top Teachers by Revenue</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {topTeachers.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500">No teacher data yet</div>
            ) : topTeachers.map((teacher: any, i: number) => (
              <div key={i} className="flex items-center justify-between px-6 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">{teacher.name}</p>
                  <p className="text-xs text-slate-500">{teacher.course_count} courses · {teacher.enrollment_count} enrollments</p>
                </div>
                <span className="text-sm font-bold text-green-600">${Number(teacher.total_revenue).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">Recent Enrollments</h2>
        </div>
        {recentEnrollments.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500">No recent enrollments</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Course</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentEnrollments.map((enrollment: any, i: number) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-6 py-3 text-sm text-slate-900">{enrollment.user_name}</td>
                    <td className="px-6 py-3 text-sm text-slate-700">{enrollment.course_slug}</td>
                    <td className="px-6 py-3 text-sm font-medium text-slate-900">
                      {enrollment.amount_paid > 0 ? `$${enrollment.amount_paid}` : 'Free'}
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-500">
                      {new Date(enrollment.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SuperAdminFinance;