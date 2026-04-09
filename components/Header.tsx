
import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { primaryLinkClass } from '../lib/site';
import { BrandingContent } from '../types';

interface HeaderProps {
  branding: BrandingContent;
}

const navItems = [
  { label: 'About', to: '/about' },
  { label: 'Courses', to: '/courses' },
  { label: 'Ndovera Meet', to: '/ndovera-meet' },
  { label: 'Teach', to: '/teach' },
  { label: 'FAQ', to: '/faq' },
  { label: 'Contact', to: '/contact' },
];

const ActionLink: React.FC<{
  href: string;
  label: string;
  external?: boolean;
  className?: string;
  onClick?: () => void;
}> = ({ href, label, external, className = '', onClick }) => {
  const isExternal = external || /^https?:\/\//.test(href);

  if (isExternal) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className={className}
        onClick={onClick}
      >
        {label}
      </a>
    );
  }

  return (
    <Link to={href} className={className} onClick={onClick}>
      {label}
    </Link>
  );
};

const Header: React.FC<HeaderProps> = ({ branding }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/60 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-4 sm:px-6 lg:px-8">
        <Link to="/" className="min-w-0 transition hover:opacity-90">
          <p className="font-display text-xl font-bold text-slate-950 sm:text-2xl">{branding.name}</p>
          <p className="hidden truncate text-sm text-slate-500 md:block">{branding.strapline}</p>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  'rounded-full px-4 py-2 text-sm font-semibold transition',
                  isActive ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-white hover:text-slate-950',
                ].join(' ')
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden lg:block">
          <ActionLink
            href={branding.primaryCta.href}
            label={branding.primaryCta.label}
            external={branding.primaryCta.external}
            className={`${primaryLinkClass} shadow-lg shadow-slate-200`}
          />
        </div>

        <button
          type="button"
          onClick={() => setIsMenuOpen((current) => !current)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-900 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 lg:hidden"
          aria-expanded={isMenuOpen}
          aria-label="Toggle navigation"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d={isMenuOpen ? 'M6 6l12 12M18 6L6 18' : 'M4 7h16M4 12h16M4 17h16'}
            />
          </svg>
        </button>
      </div>

      {isMenuOpen && (
        <div className="border-t border-white/70 bg-white/95 px-4 py-4 shadow-2xl shadow-slate-200/60 lg:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setIsMenuOpen(false)}
                className={({ isActive }) =>
                  [
                    'rounded-2xl px-4 py-3 text-sm font-semibold transition',
                    isActive ? 'bg-slate-950 text-white' : 'bg-white text-slate-700 hover:bg-slate-100',
                  ].join(' ')
                }
              >
                {item.label}
              </NavLink>
            ))}

            <ActionLink
              href={branding.primaryCta.href}
              label={branding.primaryCta.label}
              external={branding.primaryCta.external}
              onClick={() => setIsMenuOpen(false)}
              className={`${primaryLinkClass} mt-2 w-full`}
            />
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
