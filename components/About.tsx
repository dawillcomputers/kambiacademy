
import React from 'react';
import { getCourseTone, getInitials } from '../lib/site';
import { AboutContent, Instructor, Stat } from '../types';

interface AboutProps {
  about: AboutContent;
  instructors: Instructor[];
  stats: Stat[];
}

const About: React.FC<AboutProps> = ({ about, instructors, stats }) => {
  const featuredInstructors = instructors.filter((instructor) => instructor.featured);

  return (
    <div className="space-y-10 lg:space-y-12">
      <section className="section-shell surface-ring rounded-[32px] border border-white/70 px-6 py-10 sm:px-10 lg:px-12">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">About Kambi Academy</p>
            <h1 className="mt-4 font-display text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
              {about.headline}
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-slate-600 sm:text-lg">{about.narrative}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            {stats.slice(0, 3).map((stat) => (
              <div key={stat.label} className="rounded-[24px] border border-white/70 bg-white/85 p-5 shadow-lg shadow-slate-200/40">
                <p className="text-xs uppercase tracking-[0.28em] text-slate-500">{stat.label}</p>
                <p className="mt-3 font-display text-3xl font-bold text-slate-950">{stat.value}</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">{stat.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="section-shell surface-ring rounded-[32px] border border-white/70 px-6 py-8 sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">Operating Principles</p>
          <div className="mt-6 space-y-4">
            {about.principles.map((principle, index) => (
              <div key={principle.title} className="rounded-[24px] border border-white/70 bg-white/85 p-5 shadow-lg shadow-slate-200/40">
                <div className="flex items-start gap-4">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-sm font-bold text-white">
                    {index + 1}
                  </span>
                  <div>
                    <h2 className="font-display text-2xl font-bold text-slate-950">{principle.title}</h2>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{principle.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="section-shell surface-ring rounded-[32px] border border-white/70 px-6 py-8 sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">Featured Faculty</p>
          <h2 className="mt-3 font-display text-3xl font-bold text-slate-950">Practitioners with delivery depth across product, engineering, and live facilitation.</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {featuredInstructors.map((instructor) => {
              const tone = getCourseTone(instructor.colorToken);

              return (
                <div key={instructor.id} className="rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-xl shadow-slate-200/50">
                  <div className="flex items-start gap-4">
                    <div className={`inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] bg-gradient-to-br ${tone.gradient} font-display text-xl font-bold text-white`}>
                      {getInitials(instructor.name)}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-950">{instructor.name}</p>
                      <p className={`mt-1 text-sm font-medium ${tone.accent}`}>{instructor.headline}</p>
                      <p className="mt-3 text-sm leading-6 text-slate-600">{instructor.bio}</p>
                    </div>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {instructor.expertise.map((item) => (
                      <span key={item} className={`rounded-full border px-3 py-1 text-xs font-semibold ${tone.badge}`}>
                        {item}
                      </span>
                    ))}
                  </div>
                  <p className="mt-4 text-xs uppercase tracking-[0.24em] text-slate-500">
                    {instructor.yearsExperience}+ years of experience
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
