import React, { useMemo, useState } from 'react';
import { Bootcamp, SignupStat, bootcampApi } from '../../lib/bootcamp';

interface Props {
  bootcamp: Bootcamp;
  onSaved?: () => void;
}

const OPTIONAL_SECTIONS: { key: string; label: string; help: string }[] = [
  { key: 'location', label: 'Location', help: 'Country, state, city' },
  { key: 'education', label: 'Education', help: 'Qualification, field, institution' },
  { key: 'employment', label: 'Employment', help: 'Status, organization, role' },
  { key: 'interests', label: 'Areas of interest', help: 'Pick-list you define below' },
  { key: 'skills', label: 'Skills', help: 'Level + coding experience' },
  { key: 'goals', label: 'Goals', help: 'Why they are joining' },
  { key: 'innovation', label: 'Innovation & startup', help: 'Startup/team interest' },
  { key: 'community', label: 'Community links', help: 'Photo, LinkedIn, GitHub' },
];

const parse = (value?: string): any[] => {
  if (!value) return [];
  try {
    const p = JSON.parse(value);
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
};

const inputCls = 'w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm bg-[#ffffff] text-[#000000] placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500';

const RegistrationConfig: React.FC<Props> = ({ bootcamp, onSaved }) => {
  const [headline, setHeadline] = useState(bootcamp.signup_headline || '');
  const [subtitle, setSubtitle] = useState(bootcamp.signup_subtitle || '');
  const [benefits, setBenefits] = useState<string[]>(() => {
    const b = parse(bootcamp.signup_benefits).filter((x) => typeof x === 'string');
    return b.length ? b : [''];
  });
  const [stats, setStats] = useState<SignupStat[]>(() => parse(bootcamp.signup_stats).filter((x) => x && typeof x.label === 'string'));
  const [sections, setSections] = useState<string[]>(() => parse(bootcamp.signup_sections).filter((x) => typeof x === 'string'));
  const [interestsText, setInterestsText] = useState<string>(() => parse(bootcamp.signup_interests).filter((x) => typeof x === 'string').join('\n'));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const interestsEnabled = useMemo(() => sections.includes('interests'), [sections]);

  const toggleSection = (key: string) =>
    setSections((prev) => (prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]));

  const save = async () => {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await bootcampApi.update({
        id: bootcamp.id,
        signup_headline: headline.trim(),
        signup_subtitle: subtitle.trim(),
        signup_benefits: benefits.map((b) => b.trim()).filter(Boolean),
        signup_stats: stats.filter((s) => s.label.trim() && s.value.trim()).map((s) => ({ label: s.label.trim(), value: s.value.trim() })),
        signup_sections: sections,
        signup_interests: interestsText.split('\n').map((s) => s.trim()).filter(Boolean),
      });
      setMessage('Registration settings saved. They are live on your signup page.');
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Signup page</h3>
        <p className="text-sm text-slate-500">Control your registration marketing and choose exactly what information to collect — keep it short or detailed.</p>
      </div>

      {message && <p className="text-sm font-semibold text-emerald-600">{message}</p>}
      {error && <p className="text-sm font-semibold text-rose-600">{error}</p>}

      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Marketing panel</p>
        <div>
          <label className="text-sm font-medium text-slate-700">Headline</label>
          <input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder={`Join ${bootcamp.title}`} className={`mt-1 ${inputCls}`} />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Subtitle</label>
          <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="A short supporting line" className={`mt-1 ${inputCls}`} />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-700">Benefits</label>
            <button type="button" onClick={() => setBenefits((b) => [...b, ''])} className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200">+ Add</button>
          </div>
          <div className="mt-2 space-y-2">
            {benefits.map((b, i) => (
              <div key={i} className="flex gap-2">
                <input value={b} onChange={(e) => setBenefits((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))} placeholder="e.g. Learn from industry experts" className={inputCls} />
                <button type="button" onClick={() => setBenefits((prev) => prev.filter((_, j) => j !== i))} className="rounded-lg bg-slate-100 px-3 text-slate-500 hover:bg-rose-100 hover:text-rose-700">✕</button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-700">Extra stats</label>
            <button type="button" onClick={() => setStats((s) => [...s, { label: '', value: '' }])} className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200">+ Add</button>
          </div>
          <p className="text-xs text-slate-400">A live “Participants” stat is added automatically (initial count + registrations).</p>
          <div className="mt-2 space-y-2">
            {stats.map((s, i) => (
              <div key={i} className="grid grid-cols-[1fr_1.4fr_auto] gap-2">
                <input value={s.value} onChange={(e) => setStats((prev) => prev.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} placeholder="100+" className={inputCls} />
                <input value={s.label} onChange={(e) => setStats((prev) => prev.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} placeholder="Projects Built" className={inputCls} />
                <button type="button" onClick={() => setStats((prev) => prev.filter((_, j) => j !== i))} className="rounded-lg bg-slate-100 px-3 text-slate-500 hover:bg-rose-100 hover:text-rose-700">✕</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Information collected</p>
        <p className="text-xs text-slate-400">Name, email, phone and consent are always collected. Toggle any extra sections you want — fewer sections means a faster signup.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {OPTIONAL_SECTIONS.map((s) => {
            const on = sections.includes(s.key);
            return (
              <button key={s.key} type="button" onClick={() => toggleSection(s.key)}
                className={`flex items-start gap-3 rounded-xl border-2 px-4 py-3 text-left transition ${on ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'}`}>
                <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 ${on ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-slate-300'}`}>{on && '✓'}</span>
                <span>
                  <span className={`block text-sm font-semibold ${on ? 'text-indigo-700' : 'text-slate-700'}`}>{s.label}</span>
                  <span className="block text-xs text-slate-400">{s.help}</span>
                </span>
              </button>
            );
          })}
        </div>

        {interestsEnabled && (
          <div className="pt-2">
            <label className="text-sm font-medium text-slate-700">Interest options (one per line)</label>
            <textarea value={interestsText} onChange={(e) => setInterestsText(e.target.value)} rows={5} placeholder={'Digital Payments\nData Analytics\nProduct Management'} className={`mt-1 ${inputCls}`} />
          </div>
        )}
      </div>

      <button onClick={save} disabled={saving} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
        {saving ? 'Saving…' : 'Save signup settings'}
      </button>
    </div>
  );
};

export default RegistrationConfig;
