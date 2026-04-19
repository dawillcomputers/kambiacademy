import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';

type VerificationState = 'verifying' | 'success' | 'failed';

const resolveDashboardPath = (role?: string) => {
  if (role === 'super_admin' || role === 'SOU') {
    return '/superadmin';
  }

  if (role === 'admin') {
    return '/admin';
  }

  return '/teacher';
};

const humanizeType = (type: string | null) => {
  if (type === 'bundle') {
    return 'Teacher Bundle';
  }

  if (type === 'live_class' || type === 'liveClass') {
    return 'Live Class Access';
  }

  if (type === 'storage') {
    return 'Cloudflare Storage';
  }

  return 'Platform Access';
};

const PaymentCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [state, setState] = useState<VerificationState>('verifying');
  const [message, setMessage] = useState('Verifying your Flutterwave payment...');

  const subscriptionId = searchParams.get('sid') || '';
  const bundleTypes = searchParams.get('bundle') || '';
  const transactionRef = searchParams.get('tx_ref') || '';
  const flutterwaveTransactionId = searchParams.get('transaction_id') || undefined;
  const status = searchParams.get('status') || 'failed';
  const subscriptionType = searchParams.get('type') || 'platform';
  const nextPath = useMemo(() => resolveDashboardPath(user?.role), [user?.role]);

  useEffect(() => {
    let cancelled = false;

    const verifyPayment = async () => {
      if (!subscriptionId || !transactionRef) {
        if (!cancelled) {
          setState('failed');
          setMessage('Missing payment callback details. Please return to billing and try again.');
        }
        return;
      }

      try {
        const response = subscriptionType === 'bundle'
          ? await api.verifyTeacherSubscriptionBundlePayment({
              items: subscriptionId
                .split(',')
                .map((value) => value.trim())
                .filter(Boolean)
                .map((value, index) => ({
                  subscriptionId: value,
                  subscriptionType: (bundleTypes.split(',')[index] || 'platform') as 'platform' | 'liveClass' | 'storage' | 'live_class',
                })),
              transactionRef,
              flutterwaveTransactionId,
              status,
            })
          : await api.verifyTeacherSubscriptionPayment({
              subscriptionId,
              transactionRef,
              flutterwaveTransactionId,
              status,
              subscriptionType: subscriptionType as 'platform' | 'liveClass' | 'storage' | 'live_class',
            });

        if (cancelled) {
          return;
        }

        if (response.status === 'success') {
          setState('success');
          setMessage(response.message || `${humanizeType(subscriptionType)} payment verified successfully.`);
          return;
        }

        setState('failed');
        setMessage(response.message || `${humanizeType(subscriptionType)} payment could not be verified.`);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setState('failed');
        setMessage(error instanceof Error ? error.message : 'Payment verification failed.');
      }
    };

    void verifyPayment();

    return () => {
      cancelled = true;
    };
  }, [bundleTypes, flutterwaveTransactionId, status, subscriptionId, subscriptionType, transactionRef]);

  useEffect(() => {
    if (state !== 'success') {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      navigate(nextPath, { replace: true });
    }, 2500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [navigate, nextPath, state]);

  return (
    <section className="section-shell surface-ring rounded-[32px] border border-white/60 bg-white/90 px-6 py-16 text-center sm:px-10">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Flutterwave Live</p>
      <h1 className="mt-4 font-display text-3xl font-bold text-slate-950">{humanizeType(subscriptionType)} Payment</h1>
      <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-600">{message}</p>

      <div className="mt-8 inline-flex items-center gap-3 rounded-full px-4 py-2 text-sm font-semibold">
        <span className={`h-2.5 w-2.5 rounded-full ${state === 'success' ? 'bg-emerald-500' : state === 'failed' ? 'bg-rose-500' : 'bg-amber-400'}`} />
        <span className="text-slate-700">
          {state === 'success' ? 'Verified' : state === 'failed' ? 'Verification failed' : 'Verifying payment'}
        </span>
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <Link
          to={nextPath}
          className="inline-flex items-center justify-center rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Return to dashboard
        </Link>
        <Link
          to="/contact"
          className="inline-flex items-center justify-center rounded-full border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Contact support
        </Link>
      </div>
    </section>
  );
};

export default PaymentCallback;