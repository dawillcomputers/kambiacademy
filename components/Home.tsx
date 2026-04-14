import React from 'react';
import { Link } from 'react-router-dom';
import {
  formatSessionDate,
  getCourseTone,
  getInitials,
  primaryLinkClass,
  secondaryLinkClass,
} from '../lib/site';
import { CallToAction, SiteData } from '../types';

interface HomeProps {
  siteData: SiteData;
}

const ActionLink: React.FC<{
  action: CallToAction;
  className: string;
}> = ({ action, className }) => {
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

const Home: React.FC<HomeProps> = ({ siteData }) => {
  const hero = siteData.hero ?? {
    eyebrow: 'Kambi Academy',
    headline: 'Live digital skills programs for every learner.',
    description: 'Explore live courses, mentorship-led workshops, and hands-on project learning backed by Cloudflare infrastructure.',
    highlights: [],
    primaryCta: { label: 'Explore courses', href: '/courses' },
    secondaryCta: { label: 'Contact admissions', href: '/contact' },
  };
  const courses = siteData.courses ?? [];
  const instructors = siteData.instructors ?? [];
  const sessions = siteData.sessions ?? [];
  const stats = siteData.stats ?? [];
  const testimonials = siteData.testimonials ?? [];

  const featuredCourses = courses.filter((course) => course.featured).slice(0, 3);
  const featuredInstructors = instructors.filter((instructor) => instructor.featured).slice(0, 3);
  const highlightedSessions = [...sessions]
    .sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime())
    .slice(0, 3);

  return (
    <div className="space-y-10 lg:space-y-14">
      <section className="section-shell surface-ring relative overflow-hidden rounded-[32px] border border-white/70 px-6 py-10 sm:px-10 lg:px-12 lg:py-14">
        <div className="hero-orb hero-orb--amber left-[-8%] top-[-8%] h-52 w-52" />
        <div className="hero-orb hero-orb--blue right-[-6%] top-8 h-60 w-60" />
        <div className="hero-orb hero-orb--teal bottom-[-10%] left-[34%] h-56 w-56" />

        <div className="relative grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">{hero.eyebrow}</p>
            <h1 className="mt-4 max-w-3xl font-display text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              {hero.headline}
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">{hero.description}</p>

            <div className="mt-8 flex flex-wrap gap-3">
              <ActionLink action={hero.primaryCta} className={primaryLinkClass} />
              <ActionLink action={hero.secondaryCta} className={secondaryLinkClass} />
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {hero.highlights.map((highlight) => (
                <div key={highlight} className="flex items-start gap-3 rounded-2xl border border-white/60 bg-white/70 px-4 py-4 text-sm text-slate-600 shadow-sm">
                  <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-950 text-xs font-bold text-white">+</span>
                  <span>{highlight}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4">
            <div className="video-mask overflow-hidden rounded-[28px] border border-slate-800 p-6 text-white shadow-2xl shadow-slate-300/30">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-sky-200">Next Sessions</p>
              <div className="mt-6 space-y-4">
                {highlightedSessions.length > 0 ? (
                  highlightedSessions.map((session) => (
                    <div key={session.id} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                      <p className="text-sm font-semibold text-white">{session.title}</p>
                      <p className="mt-1 text-sm text-slate-300">{formatSessionDate(session.startsAt)}</p>
                      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-400">
                        <span>Auralis Live</span>
                        {session.courseSlug ? (
                          <Link to={`/courses/${session.courseSlug}`} className="font-semibold text-sky-300 transition hover:text-sky-200">
                            View course
                          </Link>
                        ) : (
                          <span className="font-semibold text-sky-300">Open session</span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                    Live session scheduling will appear here once the backend seed is applied.
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {stats.slice(0, 3).map((stat) => (
                <div key={stat.label} className="rounded-[24px] border border-white/70 bg-white/80 px-5 py-5 shadow-lg shadow-slate-200/60">
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-500">{stat.label}</p>
                  <p className="mt-3 font-display text-3xl font-bold text-slate-950">{stat.value}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{stat.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="section-shell surface-ring rounded-[32px] border border-white/70 px-6 py-8 sm:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">Featured Courses</p>
              <h2 className="mt-3 font-display text-3xl font-bold text-slate-950">Launch live programs built for real outcomes.</h2>
            </div>
            <Link to="/courses" className="text-sm font-semibold text-slate-950 transition hover:text-slate-700">
              See all courses
            </Link>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {featuredCourses.length > 0 ? featuredCourses.map((course) => {
              const tone = getCourseTone(course.tone);

              return (
                <Link
                  key={course.id}
                  to={`/courses/${course.slug}`}
                  className="group overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-xl shadow-slate-200/60 transition hover:-translate-y-1 hover:shadow-2xl"
                >
                  <div className={`bg-gradient-to-br ${tone.gradient} px-5 py-6 text-white`}>
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/75">{course.category}</p>
                    <h3 className="mt-3 font-display text-2xl font-bold">{course.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-white/80">{course.summary}</p>
                  </div>
                  <div className="space-y-4 px-5 py-5">
                    <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      <span>{course.level}</span>
                      <span>{course.durationLabel}</span>
                      <span>{course.deliveryMode}</span>
                    </div>
                    <p className="text-sm leading-6 text-slate-600">{course.description}</p>
                    <div className="flex items-center justify-between text-sm font-semibold text-slate-950">
                      <span>{course.priceLabel}</span>
                      <span className="transition group-hover:translate-x-1">View details</span>
                    </div>
                  </div>
                </Link>
              );
            }) : null}
          </div>
        </div>

        <div className="section-shell surface-ring rounded-[32px] border border-white/70 px-6 py-8 sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">Faculty</p>
          <h2 className="mt-3 font-display text-3xl font-bold text-slate-950">Mentors who teach from active delivery experience.</h2>

          <div className="mt-8 space-y-4">
            {featuredInstructors.map((instructor) => {
              const tone = getCourseTone(instructor.colorToken);

              return (
                <div key={instructor.id} className="rounded-[24px] border border-white/70 bg-white/80 p-5 shadow-lg shadow-slate-200/50">
                  <div className="flex items-start gap-4">
                    <div className={`inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${tone.gradient} font-display text-lg font-bold text-white`}>
                      {getInitials(instructor.name)}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-950">{instructor.name}</p>
                      <p className={`mt-1 text-sm font-medium ${tone.accent}`}>{instructor.headline}</p>
                      <p className="mt-3 text-sm leading-6 text-slate-600">{instructor.bio}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="section-shell surface-ring rounded-[32px] border border-white/70 px-6 py-8 sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">Learner Signals</p>
          <h2 className="mt-3 font-display text-3xl font-bold text-slate-950">What learners remember after live learning ends.</h2>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            Each program mixes live mentoring, hands-on lessons, and a steady pace that helps learners finish strong.
          </p>
          <div className="mt-8 space-y-4">
            {testimonials.slice(0, 2).map((testimonial) => {
              return (
                <div key={testimonial.id} className="rounded-[24px] border border-white/70 bg-white/85 p-5 shadow-lg shadow-slate-200/40">
                  <p className="text-base leading-7 text-slate-700">&ldquo;{testimonial.quote}&rdquo;</p>
                  <div className="mt-4">
                    <p className="font-semibold text-slate-950">{testimonial.name}</p>
                    <p className="text-sm text-slate-500">
                      {testimonial.course ? `${testimonial.course}` : ''}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="overflow-hidden rounded-[32px] border border-slate-900 bg-slate-950 px-6 py-8 text-white shadow-2xl shadow-slate-300/30 sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-sky-200">Ready to move</p>
          <h2 className="mt-3 font-display text-3xl font-bold">Choose a program, meet your instructor, and join the next live session.</h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
            Kambi Academy pairs production-ready course pages with Auralis live classrooms so admissions, delivery, and follow-up happen in one flow.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/courses" className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100">
              Explore all programs
            </Link>
            <Link to="/signup" className="inline-flex items-center justify-center rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/40 hover:bg-white/5">
              Sign up now
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
