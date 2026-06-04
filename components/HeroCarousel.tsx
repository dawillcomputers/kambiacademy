import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CallToAction, HeroSlide } from '../types';

interface HeroCarouselProps {
  slides?: HeroSlide[];
  eyebrow?: string;
  headline: string;
  description: string;
  highlights?: string[];
  primaryCta: CallToAction;
  secondaryCta: CallToAction;
  autoPlayInterval?: number;
}

const DEFAULT_SLIDES: HeroSlide[] = [
  { id: 'd1', imageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2070&auto=format&fit=crop' },
  { id: 'd2', imageUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=2070&auto=format&fit=crop' },
  { id: 'd3', imageUrl: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?q=80&w=2072&auto=format&fit=crop' },
];

const HeroActionLink: React.FC<{ action: CallToAction; className: string }> = ({ action, className }) => {
  const isExternal = action.external || /^https?:\/\//.test(action.href);
  if (isExternal) {
    return (
      <a href={action.href} target="_blank" rel="noreferrer" className={className}>
        {action.label}
      </a>
    );
  }
  return (
    <Link to={action.href} className={className}>
      {action.label}
    </Link>
  );
};

const HeroCarousel: React.FC<HeroCarouselProps> = ({
  slides,
  eyebrow,
  headline,
  description,
  highlights = [],
  primaryCta,
  secondaryCta,
  autoPlayInterval = 5500,
}) => {
  const activeSlides = useMemo(() => {
    const cleaned = (slides || []).filter((slide) => slide && slide.imageUrl);
    return cleaned.length > 0 ? cleaned : DEFAULT_SLIDES;
  }, [slides]);

  const [current, setCurrent] = useState(0);

  useEffect(() => {
    setCurrent(0);
  }, [activeSlides.length]);

  useEffect(() => {
    if (activeSlides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % activeSlides.length);
    }, autoPlayInterval);
    return () => clearInterval(interval);
  }, [activeSlides.length, autoPlayInterval]);

  const go = (index: number) => setCurrent((index + activeSlides.length) % activeSlides.length);

  return (
    <section className="surface-ring relative isolate overflow-hidden rounded-[32px] border border-white/10 text-white shadow-2xl">
      {/* Rotating background images (cross-fade + slow ken-burns) */}
      <div className="absolute inset-0 -z-10">
        {activeSlides.map((slide, index) => (
          <div
            key={slide.id ?? index}
            aria-hidden={index !== current}
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-[1200ms] ease-out ${
              index === current ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ backgroundImage: `url(${slide.imageUrl})` }}
          >
            {index === current && (
              <div
                className="h-full w-full animate-ken-burns bg-cover bg-center"
                style={{ backgroundImage: `url(${slide.imageUrl})` }}
              />
            )}
          </div>
        ))}
        {/* Colourful gradient overlays for legibility + vibrance */}
        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-950/90 via-violet-900/60 to-fuchsia-800/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-transparent" />
      </div>

      <div className="relative px-6 py-16 sm:px-10 lg:px-14 lg:py-24">
        <div className="max-w-3xl">
          {eyebrow && (
            <span className="animate-fade-in inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.28em] text-white/90 backdrop-blur">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              {eyebrow}
            </span>
          )}

          <h1 className="animate-fade-in-delay mt-6 font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            {headline}
          </h1>

          <p className="animate-fade-in-delay mt-6 max-w-2xl text-base leading-8 text-white/85 sm:text-lg">
            {description}
          </p>

          <div className="animate-fade-in-delay-2 mt-8 flex flex-wrap gap-3">
            <HeroActionLink
              action={primaryCta}
              className="shimmer inline-flex items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-amber-400 bg-200 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-fuchsia-500/30 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-fuchsia-500/40"
            />
            <HeroActionLink
              action={secondaryCta}
              className="inline-flex items-center justify-center rounded-full border border-white/25 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/20"
            />
          </div>

          {highlights.length > 0 && (
            <div className="animate-fade-in-delay-2 mt-10 flex flex-wrap gap-2.5">
              {highlights.map((highlight) => (
                <span key={highlight} className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/90 backdrop-blur">
                  <span className="text-emerald-300">✓</span>
                  {highlight}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Controls */}
        {activeSlides.length > 1 && (
          <div className="mt-12 flex items-center gap-4">
            <div className="flex gap-2">
              {activeSlides.map((slide, index) => (
                <button
                  key={slide.id ?? index}
                  onClick={() => go(index)}
                  aria-label={`Go to slide ${index + 1}`}
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    index === current ? 'w-8 bg-white' : 'w-2.5 bg-white/40 hover:bg-white/70'
                  }`}
                />
              ))}
            </div>
            <div className="ml-auto flex gap-2">
              <button
                onClick={() => go(current - 1)}
                aria-label="Previous slide"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
              </button>
              <button
                onClick={() => go(current + 1)}
                aria-label="Next slide"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default HeroCarousel;
