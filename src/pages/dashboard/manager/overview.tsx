import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bootcamp, bootcampApi, formatBootcampDate } from '../../../../lib/bootcamp';

const ManagerOverview: React.FC = () => {
  const [bootcamps, setBootcamps] = useState<Bootcamp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    bootcampApi
      .listManaged()
      .then((res) => {
        if (!cancelled) setBootcamps(res.bootcamps || []);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load your bootcamps.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Bootcamps</h1>
        <p className="mt-1 text-sm text-slate-500">Manage hub content, competitions, and winners for your assigned bootcamps.</p>
      </div>

      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
        </div>
      ) : bootcamps.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <h2 className="text-xl font-semibold text-slate-900">No bootcamps assigned yet</h2>
          <p className="mt-2 text-sm text-slate-500">A super admin assigns bootcamps to your account. They will appear here.</p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {bootcamps.map((bootcamp) => (
            <Link
              key={bootcamp.id}
              to={`/manager/${bootcamp.id}`}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div
                className="h-28 w-full bg-slate-800 bg-cover bg-center"
                style={bootcamp.cover_image_url ? { backgroundImage: `url(${bootcamp.cover_image_url})` } : undefined}
              />
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase text-indigo-600">{bootcamp.category}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase ${bootcamp.status === 'open' ? 'bg-emerald-100 text-emerald-700' : bootcamp.status === 'closed' ? 'bg-slate-200 text-slate-600' : 'bg-amber-100 text-amber-700'}`}>
                    {bootcamp.status}
                  </span>
                </div>
                <h3 className="mt-2 font-bold text-slate-900">{bootcamp.title}</h3>
                <p className="mt-1 text-sm text-slate-500">{bootcamp.enrollment_count ?? 0} participants</p>
                {(bootcamp.start_date || bootcamp.end_date) && (
                  <p className="mt-1 text-xs text-slate-400">
                    {formatBootcampDate(bootcamp.start_date)}{bootcamp.end_date ? ` – ${formatBootcampDate(bootcamp.end_date)}` : ''}
                  </p>
                )}
                <p className="mt-3 text-sm font-semibold text-indigo-600">Manage →</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default ManagerOverview;
