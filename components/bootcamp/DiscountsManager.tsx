import React, { useCallback, useEffect, useState } from 'react';
import { DiscountCode, discountApi } from '../../lib/bootcamp';

const emptyForm = {
  code: '',
  description: '',
  type: 'percent' as 'percent' | 'fixed',
  value: 10,
  max_uses: '' as number | '',
  single_use_per_email: false,
  expires_at: '',
};

const DiscountsManager: React.FC<{ bootcampId: number }> = ({ bootcampId }) => {
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await discountApi.list(bootcampId);
      setCodes(res.codes || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load discount codes.');
    } finally {
      setLoading(false);
    }
  }, [bootcampId]);

  useEffect(() => { void load(); }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await discountApi.create({
        code: form.code.trim().toUpperCase(),
        description: form.description,
        type: form.type,
        value: Number(form.value),
        scope: 'bootcamp',
        bootcamp_id: bootcampId,
        max_uses: form.max_uses === '' ? null : Number(form.max_uses),
        single_use_per_email: form.single_use_per_email,
        expires_at: form.expires_at || null,
      });
      setMessage(`Code ${form.code.toUpperCase()} created.`);
      setForm({ ...emptyForm });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create code.');
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (c: DiscountCode) => {
    try {
      await discountApi.toggle(c.id, !c.active);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update code.');
    }
  };

  const remove = async (c: DiscountCode) => {
    if (!confirm(`Delete code ${c.code}?`)) return;
    try {
      await discountApi.remove(c.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete code.');
    }
  };

  const input = 'w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-[#ffffff] text-[#000000] placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500';

  return (
    <div className="space-y-6">
      {message && <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">{message}</p>}
      {error && <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700">{error}</p>}

      <form onSubmit={create} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2">
        <h3 className="sm:col-span-2 text-sm font-bold text-slate-900">Create a discount code</h3>
        <div>
          <label className="text-xs font-semibold text-slate-600">Code</label>
          <input className={`${input} uppercase`} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="EARLY50" required />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600">Description</label>
          <input className={input} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Early-bird offer" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600">Type</label>
          <select className={input} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as 'percent' | 'fixed' })}>
            <option value="percent">Percentage (%)</option>
            <option value="fixed">Fixed amount (₦)</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600">{form.type === 'percent' ? 'Percent off (0–100)' : 'Amount off (₦)'}</label>
          <input type="number" min={0} max={form.type === 'percent' ? 100 : undefined} className={input} value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} required />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600">Max uses (blank = unlimited)</label>
          <input type="number" min={1} className={input} value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value === '' ? '' : Number(e.target.value) })} />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600">Expires (optional)</label>
          <input type="date" className={input} value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
          <input type="checkbox" checked={form.single_use_per_email} onChange={(e) => setForm({ ...form, single_use_per_email: e.target.checked })} />
          One use per email address
        </label>
        <div className="sm:col-span-2">
          <button type="submit" disabled={saving} className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
            {saving ? 'Creating…' : 'Create code'}
          </button>
        </div>
      </form>

      {loading ? (
        <div className="flex justify-center py-10"><div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" /></div>
      ) : codes.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">No discount codes yet.</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Discount</th>
                <th className="px-4 py-3">Uses</th>
                <th className="px-4 py-3">Scope</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {codes.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 font-mono font-bold text-slate-900">{c.code}{c.description ? <span className="ml-2 font-sans text-xs font-normal text-slate-400">{c.description}</span> : null}</td>
                  <td className="px-4 py-3 text-slate-700">{c.type === 'percent' ? `${c.value}%` : `₦${Number(c.value).toLocaleString()}`}</td>
                  <td className="px-4 py-3 text-slate-700">{c.used_count}{c.max_uses != null ? ` / ${c.max_uses}` : ''}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${c.scope === 'global' ? 'bg-violet-100 text-violet-700' : 'bg-indigo-50 text-indigo-600'}`}>{c.scope}</span></td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggle(c)} className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase ${c.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                      {c.active ? 'Active' : 'Disabled'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {c.scope === 'global' ? (
                      <span className="text-xs text-slate-400">Platform code</span>
                    ) : (
                      <button onClick={() => remove(c)} className="text-xs font-semibold text-rose-600 hover:underline">Delete</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DiscountsManager;
