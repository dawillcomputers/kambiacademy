import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

interface PayoutAnalytics {
  total_payouts: number;
  completed_amount: number;
  processing_amount: number;
  failed_amount: number;
  pending_amount: number;
  completed_count: number;
  processing_count: number;
  failed_count: number;
  pending_count: number;
  tutors_paid: number;
}

interface FailedPayout {
  id: string;
  tutor_id: number;
  name: string;
  email: string;
  amount: number;
  error_message: string;
  attempt_number: number;
  next_retry: string;
}

export const PayoutsDashboard: React.FC = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<PayoutAnalytics | null>(null);
  const [failedPayouts, setFailedPayouts] = useState<FailedPayout[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('30days');
  const [actionMsg, setActionMsg] = useState('');

  if (!user || user.role !== 'super_admin') {
    return <div className="text-center py-8">Access denied</div>;
  }

  useEffect(() => {
    loadPayoutsData();
  }, [timeframe]);

  const loadPayoutsData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/finance/payouts-reconciliation?timeframe=${timeframe}`);
      setAnalytics(response.analytics);
      setFailedPayouts(response.failed_payouts);
      setSettings(response.settings);
    } catch (error: any) {
      setActionMsg(`Error loading payouts: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async (payoutId: string) => {
    try {
      await api.post('/api/finance/payouts-reconciliation', {
        action: 'retry_failed',
        payout_id: payoutId
      });
      setActionMsg('Payout retry initiated');
      await loadPayoutsData();
    } catch (error: any) {
      setActionMsg(`Retry failed: ${error.message}`);
    }
  };

  const handleVerify = async (payoutId: string) => {
    try {
      await api.post('/api/finance/payouts-reconciliation', {
        action: 'verify_payout',
        payout_id: payoutId
      });
      setActionMsg('Payout verification complete');
      await loadPayoutsData();
    } catch (error: any) {
      setActionMsg(`Verification failed: ${error.message}`);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading payouts data...</div>;
  }

  const total = analytics ? analytics.completed_amount + analytics.processing_amount + 
                            analytics.failed_amount + analytics.pending_amount : 0;

  return (
    <div className="space-y-6 p-6 bg-[#0B1220] text-[#EAF0FF] rounded-lg">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Payouts Management</h2>
        <p className="text-sm text-gray-400">Manage tutor payouts and Flutterwave reconciliation</p>
      </div>

      {/* Action Message */}
      {actionMsg && (
        <div className="p-3 bg-blue-900/30 border border-blue-400 rounded text-sm">
          {actionMsg}
        </div>
      )}

      {/* Timeframe Filter */}
      <div className="flex gap-2">
        {['7days', '30days', '90days'].map(tf => (
          <button
            key={tf}
            onClick={() => setTimeframe(tf)}
            className={`px-4 py-2 rounded text-sm ${
              timeframe === tf
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            {tf === '7days' ? 'Last 7 Days' : tf === '30days' ? 'Last 30 Days' : 'Last 90 Days'}
          </button>
        ))}
      </div>

      {/* Analytics Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Completed */}
          <div className="bg-gradient-to-br from-green-900 to-green-700 p-4 rounded-lg">
            <div className="text-xs font-semibold text-green-200 mb-1">COMPLETED</div>
            <div className="text-2xl font-bold">₦{(analytics.completed_amount || 0).toLocaleString()}</div>
            <div className="text-xs text-green-300 mt-1">{analytics.completed_count} payouts</div>
          </div>

          {/* Processing */}
          <div className="bg-gradient-to-br from-yellow-900 to-yellow-700 p-4 rounded-lg">
            <div className="text-xs font-semibold text-yellow-200 mb-1">PROCESSING</div>
            <div className="text-2xl font-bold">₦{(analytics.processing_amount || 0).toLocaleString()}</div>
            <div className="text-xs text-yellow-300 mt-1">{analytics.processing_count} payouts</div>
          </div>

          {/* Pending */}
          <div className="bg-gradient-to-br from-blue-900 to-blue-700 p-4 rounded-lg">
            <div className="text-xs font-semibold text-blue-200 mb-1">PENDING</div>
            <div className="text-2xl font-bold">₦{(analytics.pending_amount || 0).toLocaleString()}</div>
            <div className="text-xs text-blue-300 mt-1">{analytics.pending_count} payouts</div>
          </div>

          {/* Failed */}
          <div className="bg-gradient-to-br from-red-900 to-red-700 p-4 rounded-lg">
            <div className="text-xs font-semibold text-red-200 mb-1">FAILED</div>
            <div className="text-2xl font-bold">₦{(analytics.failed_amount || 0).toLocaleString()}</div>
            <div className="text-xs text-red-300 mt-1">{analytics.failed_count} payouts</div>
          </div>

          {/* Total */}
          <div className="bg-gradient-to-br from-purple-900 to-purple-700 p-4 rounded-lg">
            <div className="text-xs font-semibold text-purple-200 mb-1">TOTAL PAID</div>
            <div className="text-2xl font-bold">₦{total.toLocaleString()}</div>
            <div className="text-xs text-purple-300 mt-1">{analytics.tutors_paid} tutors</div>
          </div>
        </div>
      )}

      {/* Failed Payouts Section */}
      {failedPayouts.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4 border border-red-900/30">
          <h3 className="text-lg font-semibold mb-4 text-red-400">Failed Payouts ({failedPayouts.length})</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {failedPayouts.map(payout => (
              <div
                key={payout.id}
                className="bg-gray-700/50 p-3 rounded border border-gray-600 flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="font-semibold text-sm">{payout.name}</div>
                  <div className="text-xs text-gray-400">{payout.email}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Amount: ₦{payout.amount.toLocaleString()} • 
                    Attempt: {payout.attempt_number}/3 • 
                    Error: {payout.error_message}
                  </div>
                  <div className="text-xs text-yellow-400 mt-1">
                    Next retry: {new Date(payout.next_retry).toLocaleString()}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRetry(payout.id)}
                    className="px-3 py-1 bg-orange-600 hover:bg-orange-500 rounded text-xs font-semibold"
                  >
                    Retry Now
                  </button>
                  <button
                    onClick={() => handleVerify(payout.id)}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs font-semibold"
                  >
                    Verify
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payout Settings */}
      {settings && (
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h3 className="text-lg font-semibold mb-4">Payout Settings</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-400 mb-1">Minimum Payout Amount</div>
              <div className="text-lg font-semibold">₦{settings.min_payout_amount}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">Max Per Batch</div>
              <div className="text-lg font-semibold">₦{settings.max_payout_per_batch}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">Weekly Batch Day</div>
              <div className="text-lg font-semibold">
                {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][settings.batch_day_of_week]}
                {' '}@ {settings.batch_time}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">Max Retries</div>
              <div className="text-lg font-semibold">{settings.max_retries}</div>
            </div>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-900/20 border border-blue-400/30 p-4 rounded text-sm">
        <div className="font-semibold mb-2">✓ Automatic Payout System Enabled</div>
        <ul className="text-xs space-y-1 text-gray-300">
          <li>• Weekly batch payouts every Monday at 2:00 AM UTC</li>
          <li>• Automatic reconciliation with Flutterwave after 2 hours</li>
          <li>• Failed transfers retry automatically every 24 hours (max 3 attempts)</li>
          <li>• Minimum ₦2,000 wallet reserve enforced</li>
          <li>• All transactions logged and auditable</li>
        </ul>
      </div>
    </div>
  );
};
