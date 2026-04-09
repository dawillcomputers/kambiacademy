
import React from 'react';
import { Link } from 'react-router-dom';
import { secondaryLinkClass } from '../lib/site';
import { BrandingContent, ContactContent } from '../types';

interface FooterProps {
  branding: BrandingContent;
  contact: ContactContent | null;
}

const quickLinks = [
  { label: 'About', to: '/about' },
  { label: 'Courses', to: '/courses' },
  { label: 'Ndovera Meet', to: '/ndovera-meet' },
  { label: 'Teach', to: '/teach' },
  { label: 'FAQ', to: '/faq' },
  { label: 'Contact', to: '/contact' },
];

const Footer: React.FC<FooterProps> = ({ branding, contact }) => (
  <footer className="mt-16 border-t border-white/60 bg-slate-950 text-slate-100">
    <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.2fr_0.8fr_0.9fr] lg:px-8">
      <div>
        <p className="font-display text-2xl font-bold">{branding.name}</p>
        <p className="mt-4 max-w-md text-sm leading-7 text-slate-300">{branding.strapline}</p>
        <div className="mt-6">
          <Link to={branding.secondaryCta.href} className={`${secondaryLinkClass} border-slate-700 bg-slate-900 text-white hover:border-slate-500 hover:bg-slate-800`}>
            {branding.secondaryCta.label}
          </Link>
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">Navigate</p>
        <div className="mt-5 grid gap-3 text-sm text-slate-300">
          {quickLinks.map((item) => (
            <Link key={item.to} to={item.to} className="transition hover:text-white">
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">Contact</p>
        <div className="mt-5 space-y-4 text-sm leading-7 text-slate-300">
          {contact ? (
            <>
              <p>
                <span className="block text-xs uppercase tracking-[0.24em] text-slate-500">Primary</span>
                <a href={`mailto:${contact.primaryEmail}`} className="transition hover:text-white">
                  {contact.primaryEmail}
                </a>
              </p>
              <p>
                <span className="block text-xs uppercase tracking-[0.24em] text-slate-500">Partners</span>
                <a href={`mailto:${contact.partnerEmail}`} className="transition hover:text-white">
                  {contact.partnerEmail}
                </a>
              </p>
              <p>{contact.location}</p>
              <p>{contact.hours}</p>
            </>
          ) : (
            <p>Contact details will appear once the site data API responds.</p>
          )}
        </div>
      </div>
    </div>

    <div className="border-t border-slate-800 px-4 py-5 text-center text-xs text-slate-500 sm:px-6 lg:px-8">
      <p>&copy; {new Date().getFullYear()} {branding.name}. Built for live cohort learning and mentor-led delivery.</p>
    </div>
  </footer>
);

export default Footer;
