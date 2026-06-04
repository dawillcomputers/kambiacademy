import React, { useEffect, useState } from 'react';
import { api } from '../../../../lib/api';
import { HeroSlide } from '../../../../types';

const newSlide = (): HeroSlide => ({ id: String(Date.now()), imageUrl: '', headline: '', subtitle: '' });

const SuperAdminHomepage: React.FC = () => {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api
      .getSite()
      .then((site) => {
        if (cancelled) return;
        const existing = (site.heroSlides || []).map((s, i) => ({
          id: s.id || String(i + 1),
          imageUrl: s.imageUrl || '',
          headline: s.headline || '',
          subtitle: s.subtitle || '',
        }));
        setSlides(existing.length ? existing : [newSlide()]);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load homepage settings.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const update = (index: number, patch: Partial<HeroSlide>) =>
    setSlides((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));

  const move = (index: number, dir: -1 | 1) => {
    setSlides((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const remove = (index: number) => setSlides((prev) => prev.filter((_, i) => i !== index));

  const save = async () => {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const cleaned = slides
        .filter((s) => s.imageUrl.trim())
        .map((s, i) => ({ id: s.id || String(i + 1), imageUrl: s.imageUrl.trim(), headline: s.headline?.trim() || '', subtitle: s.subtitle?.trim() || '' }));
      await api.adminUpdateSetting('hero_slides', JSON.stringify(cleaned));
      setMessage(`Saved ${cleaned.length} hero slide${cleaned.length === 1 ? '' : 's'}. Changes are live on the homepage.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save hero slides.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Homepage Hero</h1>
          <p className="mt-1 text-sm text-slate-500">Manage the sliding background images shown in the homepage hero. Changes go live immediately.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setSlides((prev) => [...prev, newSlide()])} className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200">
            + Add slide
          </button>
          <button onClick={save} disabled={saving} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
            {saving ? 'Saving…' : 'Save & publish'}
          </button>
        </div>
      </div>

      {message && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{message}</div>}
      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
        </div>
      ) : (
        <div className="space-y-4">
          {slides.map((slide, index) => (
            <div key={slide.id ?? index} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[200px_1fr]">
              <div
                className="flex h-32 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100 bg-cover bg-center text-xs text-slate-400"
                style={slide.imageUrl ? { backgroundImage: `url(${slide.imageUrl})` } : undefined}
              >
                {!slide.imageUrl && 'Image preview'}
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Slide {index + 1}</span>
                  <div className="flex gap-1">
                    <button onClick={() => move(index, -1)} disabled={index === 0} className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-600 hover:bg-slate-200 disabled:opacity-40">↑</button>
                    <button onClick={() => move(index, 1)} disabled={index === slides.length - 1} className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-600 hover:bg-slate-200 disabled:opacity-40">↓</button>
                    <button onClick={() => remove(index)} className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-600 hover:bg-rose-100 hover:text-rose-700">Remove</button>
                  </div>
                </div>
                <input
                  value={slide.imageUrl}
                  onChange={(e) => update(index, { imageUrl: e.target.value })}
                  placeholder="Background image URL (https://…)"
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    value={slide.headline}
                    onChange={(e) => update(index, { headline: e.target.value })}
                    placeholder="Caption headline (optional)"
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    value={slide.subtitle}
                    onChange={(e) => update(index, { subtitle: e.target.value })}
                    placeholder="Caption subtitle (optional)"
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          ))}
          {slides.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-500">
              No slides yet. Add one, or the homepage will use the default images.
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-slate-400">
        Tip: use wide landscape images (1600×900 or larger). Paste a hosted image URL — for example from your media library or a stock photo site.
      </p>
    </div>
  );
};

export default SuperAdminHomepage;
