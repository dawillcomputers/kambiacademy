import React, { useCallback, useEffect, useState } from 'react';
import { BootcampCompetition, CompetitionPrize, CompetitionWinner, bootcampApi } from '../../lib/bootcamp';

interface Props {
  bootcampId: number;
}

interface FormState {
  id?: number;
  title: string;
  description: string;
  image_url: string;
  flyer_url: string;
  rules: string;
  event_date: string;
  published: boolean;
  winners: CompetitionWinner[];
  prizes: CompetitionPrize[];
}

const blankWinner = (): CompetitionWinner => ({ name: '', image_url: '', prize: '', note: '' });
const blankPrize = (position: number): CompetitionPrize => ({ position, title: '', reward: '' });

const PRIZE_LABELS = ['🥇 1st Prize', '🥈 2nd Prize', '🥉 3rd Prize'];

const emptyForm = (): FormState => ({
  title: '', description: '', image_url: '', flyer_url: '', rules: '', event_date: '', published: false,
  winners: [blankWinner()], prizes: [blankPrize(1)],
});

const CompetitionsManager: React.FC<Props> = ({ bootcampId }) => {
  const [competitions, setCompetitions] = useState<BootcampCompetition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await bootcampApi.competitions(bootcampId);
      setCompetitions(res.competitions || []);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load competitions.');
    } finally {
      setLoading(false);
    }
  }, [bootcampId]);

  useEffect(() => {
    void load();
  }, [load]);

  const resetForm = () => {
    setForm(emptyForm());
    setShowForm(false);
  };

  const editCompetition = (competition: BootcampCompetition) => {
    setForm({
      id: competition.id,
      title: competition.title,
      description: competition.description,
      image_url: competition.image_url,
      flyer_url: competition.flyer_url || '',
      rules: competition.rules || '',
      event_date: competition.event_date ? competition.event_date.slice(0, 10) : '',
      published: competition.published,
      winners: competition.winners.length ? competition.winners.map((w) => ({ ...w })) : [blankWinner()],
      prizes: competition.prizes && competition.prizes.length ? competition.prizes.map((p) => ({ ...p })) : [blankPrize(1)],
    });
    setShowForm(true);
  };

  const updatePrize = (index: number, patch: Partial<CompetitionPrize>) => {
    setForm((prev) => ({ ...prev, prizes: prev.prizes.map((p, i) => (i === index ? { ...p, ...patch } : p)) }));
  };

  const updateWinner = (index: number, patch: Partial<CompetitionWinner>) => {
    setForm((prev) => ({
      ...prev,
      winners: prev.winners.map((w, i) => (i === index ? { ...w, ...patch } : w)),
    }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    setError('');
    const winners = form.winners.filter((w) => w.name.trim());
    const prizes = form.prizes.filter((p) => (p.title || '').trim() || (p.reward || '').trim()).map((p, i) => ({ ...p, position: i + 1 }));
    try {
      if (form.id) {
        await bootcampApi.updateCompetition({ ...form, winners, prizes });
      } else {
        await bootcampApi.createCompetition({ bootcamp_id: bootcampId, ...form, winners, prizes });
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save competition.');
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (competition: BootcampCompetition) => {
    try {
      await bootcampApi.updateCompetition({ id: competition.id, published: !competition.published });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update visibility.');
    }
  };

  const remove = async (id: number) => {
    if (!confirm('Delete this competition and its winners?')) return;
    try {
      await bootcampApi.removeCompetition(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete competition.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Competitions & Winners</h3>
          <p className="text-sm text-slate-500">Published competitions appear on the public Kambi Academy website.</p>
        </div>
        {!showForm && (
          <button
            onClick={() => { setForm(emptyForm()); setShowForm(true); }}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + New competition
          </button>
        )}
      </div>

      {error && <p className="text-sm font-semibold text-rose-600">{error}</p>}

      {showForm && (
        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Competition title"
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm bg-[#ffffff] text-[#000000] placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
            <input
              type="date"
              value={form.event_date}
              onChange={(e) => setForm({ ...form, event_date: e.target.value })}
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm bg-[#ffffff] text-[#000000] placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Description (optional)"
            rows={2}
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm bg-[#ffffff] text-[#000000] placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={form.image_url}
              onChange={(e) => setForm({ ...form, image_url: e.target.value })}
              placeholder="Cover image URL (optional)"
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm bg-[#ffffff] text-[#000000] placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              value={form.flyer_url}
              onChange={(e) => setForm({ ...form, flyer_url: e.target.value })}
              placeholder="Flyer image URL (optional)"
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm bg-[#ffffff] text-[#000000] placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <textarea
            value={form.rules}
            onChange={(e) => setForm({ ...form, rules: e.target.value })}
            placeholder="Rules / eligibility (optional)"
            rows={2}
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm bg-[#ffffff] text-[#000000] placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700">Prizes</p>
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, prizes: [...prev.prizes, blankPrize(prev.prizes.length + 1)] }))}
                className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-100"
              >
                + Add prize level
              </button>
            </div>
            <div className="mt-3 space-y-2">
              {form.prizes.map((prize, index) => (
                <div key={index} className="grid gap-2 sm:grid-cols-[auto_1fr_1.6fr_auto] sm:items-center">
                  <span className="text-xs font-bold text-slate-500">{PRIZE_LABELS[index] || `#${index + 1}`}</span>
                  <input
                    value={prize.title}
                    onChange={(e) => updatePrize(index, { title: e.target.value })}
                    placeholder="Label (e.g. 1st Place)"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-[#ffffff] text-[#000000] placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    value={prize.reward}
                    onChange={(e) => updatePrize(index, { reward: e.target.value })}
                    placeholder="Reward (e.g. ₦500,000 + Internship)"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-[#ffffff] text-[#000000] placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, prizes: prev.prizes.filter((_, i) => i !== index) }))}
                    className="rounded-lg bg-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-rose-100 hover:text-rose-700"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700">Winners</p>
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, winners: [...prev.winners, blankWinner()] }))}
                className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-100"
              >
                + Add winner
              </button>
            </div>
            <div className="mt-3 space-y-3">
              {form.winners.map((winner, index) => (
                <div key={index} className="grid gap-2 sm:grid-cols-[1.2fr_1fr_1.4fr_auto]">
                  <input
                    value={winner.name}
                    onChange={(e) => updateWinner(index, { name: e.target.value })}
                    placeholder="Winner name"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-[#ffffff] text-[#000000] placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    value={winner.prize}
                    onChange={(e) => updateWinner(index, { prize: e.target.value })}
                    placeholder="Prize / position"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-[#ffffff] text-[#000000] placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    value={winner.image_url}
                    onChange={(e) => updateWinner(index, { image_url: e.target.value })}
                    placeholder="Photo URL"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-[#ffffff] text-[#000000] placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, winners: prev.winners.filter((_, i) => i !== index) }))}
                    className="rounded-lg bg-slate-200 px-3 text-sm font-medium text-slate-600 hover:bg-rose-100 hover:text-rose-700"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={form.published}
              onChange={(e) => setForm({ ...form, published: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300"
            />
            Publish to the public website
          </label>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {saving ? 'Saving…' : form.id ? 'Save changes' : 'Post competition'}
            </button>
            <button type="button" onClick={resetForm} className="rounded-xl bg-slate-100 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-200">
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
        </div>
      ) : competitions.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500">
          No competitions posted yet.
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {competitions.map((competition) => (
            <div key={competition.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {competition.image_url && <img src={competition.image_url} alt={competition.title} className="h-32 w-full object-cover" />}
              <div className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-slate-900">{competition.title}</p>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase ${competition.published ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {competition.published ? 'Published' : 'Draft'}
                  </span>
                </div>
                {competition.description && <p className="text-sm text-slate-600">{competition.description}</p>}
                {competition.prizes && competition.prizes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {competition.prizes.map((p, i) => (
                      <span key={p.id ?? i} className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                        {p.title || `#${i + 1}`}{p.reward ? ` · ${p.reward}` : ''}
                      </span>
                    ))}
                  </div>
                )}
                {competition.winners.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {competition.winners.map((winner, index) => (
                      <span key={winner.id ?? index} className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                        🏆 {winner.name}{winner.prize ? ` · ${winner.prize}` : ''}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  <button onClick={() => editCompetition(competition)} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200">Edit</button>
                  <button onClick={() => togglePublish(competition)} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200">
                    {competition.published ? 'Unpublish' : 'Publish'}
                  </button>
                  <button onClick={() => remove(competition.id)} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-rose-100 hover:text-rose-700">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CompetitionsManager;
