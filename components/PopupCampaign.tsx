import React, { useEffect, useState } from 'react';
import { PopupCampaignItem, popupApi } from '../lib/bootcamp';

// Decides whether a campaign should still be shown, based on its frequency rule and
// what we've recorded in localStorage.
const shouldShow = (c: PopupCampaignItem): boolean => {
  try {
    const key = `kambi-popup:${c.id}`;
    const seen = window.localStorage.getItem(key);
    if (c.frequency === 'always') return true;
    if (c.frequency === 'once') return !seen;
    // daily
    return seen !== new Date().toDateString();
  } catch {
    return true;
  }
};

const markSeen = (c: PopupCampaignItem) => {
  try {
    const key = `kambi-popup:${c.id}`;
    if (c.frequency === 'daily') window.localStorage.setItem(key, new Date().toDateString());
    else if (c.frequency === 'once') window.localStorage.setItem(key, '1');
  } catch { /* ignore */ }
};

const PopupCampaign: React.FC = () => {
  const [campaign, setCampaign] = useState<PopupCampaignItem | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Small delay so the popup doesn't fight the first paint.
    const timer = window.setTimeout(() => {
      popupApi
        .active()
        .then((res) => {
          if (cancelled) return;
          const next = (res.campaigns || []).find(shouldShow);
          if (next) setCampaign(next);
        })
        .catch(() => undefined);
    }, 1200);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, []);

  if (!campaign) return null;

  const close = () => {
    markSeen(campaign);
    setCampaign(null);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onClick={close}>
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={close}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-lg font-bold text-white transition hover:bg-black/60"
        >
          ✕
        </button>

        {campaign.media_type === 'video' && campaign.media_url ? (
          <video src={campaign.media_url} autoPlay muted loop playsInline className="max-h-[60vh] w-full object-cover" />
        ) : campaign.media_type === 'html' && campaign.html ? (
          <div className="max-h-[60vh] overflow-y-auto p-6" dangerouslySetInnerHTML={{ __html: campaign.html }} />
        ) : campaign.media_url ? (
          <img src={campaign.media_url} alt={campaign.title} className="max-h-[60vh] w-full object-cover" />
        ) : null}

        {(campaign.title || campaign.link_url) && (
          <div className="space-y-3 p-6 text-center">
            {campaign.title && <h2 className="font-display text-2xl font-bold text-slate-900">{campaign.title}</h2>}
            {campaign.link_url && (
              <a
                href={campaign.link_url}
                onClick={() => markSeen(campaign)}
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5"
              >
                {campaign.cta_label || 'Learn more'}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PopupCampaign;
