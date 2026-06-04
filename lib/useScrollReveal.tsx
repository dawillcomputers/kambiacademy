import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Reveals elements marked with `data-reveal` as they scroll into view.
 * Content is visible by default; the hidden state only applies once JS adds
 * the `reveal-ready` class to <html>, so no-JS / SSR renders stay visible.
 * Re-scans the DOM on route change and after a short delay for late content.
 */
export function useScrollReveal(): void {
  const location = useLocation();

  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      return;
    }

    document.documentElement.classList.add('reveal-ready');

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    );

    const scan = () => {
      document.querySelectorAll<HTMLElement>('[data-reveal]:not(.is-visible)').forEach((el) => observer.observe(el));
    };

    // Initial scan + a couple of follow-ups for lazily mounted / async content.
    scan();
    const t1 = window.setTimeout(scan, 250);
    const t2 = window.setTimeout(scan, 900);

    // Safety net: never leave content hidden if the observer misses something.
    const safety = window.setTimeout(() => {
      document.querySelectorAll<HTMLElement>('[data-reveal]:not(.is-visible)').forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight * 1.1) el.classList.add('is-visible');
      });
    }, 1800);

    return () => {
      observer.disconnect();
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(safety);
    };
  }, [location.pathname]);
}
