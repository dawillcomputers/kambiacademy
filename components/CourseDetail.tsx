
import React from 'react';
import { Link } from 'react-router-dom';
import {
  formatDuration,
  formatSessionDate,
  getCourseTone,
  getInitials,
  getSessionStatusClasses,
  primaryLinkClass,
  secondaryLinkClass,
} from '../lib/site';
import { Course, Instructor, MeetSession } from '../types';

interface CourseDetailProps {
  course: Course;
  instructor: Instructor | null;
  relatedCourses: Course[];
  sessions: MeetSession[];
}

const CourseDetail: React.FC<CourseDetailProps> = ({ course, instructor, relatedCourses, sessions }) => {
  const tone = getCourseTone(course.tone);

  return (
    <article className="space-y-10">
      <section className="section-shell surface-ring overflow-hidden rounded-[32px] border border-white/70">
        <div className={`bg-gradient-to-br ${tone.gradient} px-6 py-8 text-white sm:px-10 lg:px-12 lg:py-10`}>
          <Link to="/courses" className="text-xs font-semibold uppercase tracking-[0.28em] text-white/75 transition hover:text-white">
            All courses
          </Link>
          <div className="mt-6 grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
            <div>
              <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-white/70">
                <span>{course.level}</span>
                <span>{course.category}</span>
                <span>{course.deliveryMode}</span>
              </div>
              <h1 className="mt-4 font-display text-4xl font-bold sm:text-5xl">{course.title}</h1>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-white/85">{course.summary}</p>
              <p className="mt-5 max-w-3xl text-sm leading-7 text-white/78">{course.description}</p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/contact" className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100">
                  Speak to admissions
                </Link>
                {course.syllabusUrl ? (
                  <a
                    href={course.syllabusUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-full border border-white/25 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/45 hover:bg-white/5"
                  >
                    Download syllabus
                  </a>
                ) : null}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/15 bg-slate-950/25 p-6 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/65">Program Snapshot</p>
              <div className="mt-5 grid gap-4 rounded-[24px] bg-white/10 p-5 text-sm text-white/85">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-white/55">Tuition</p>
                  <p className="mt-2 font-display text-3xl font-bold text-white">{course.priceLabel}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-white/55">Duration</p>
                    <p className="mt-2 font-semibold text-white">{course.durationLabel}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-white/55">Cohort Size</p>
                    <p className="mt-2 font-semibold text-white">{course.cohortSize}</p>
                  </div>
                </div>
              </div>

              {instructor ? (
                <div className="mt-5 rounded-[24px] bg-white/10 p-5">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/55">Lead Instructor</p>
                  <div className="mt-4 flex items-start gap-4">
                    <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 font-display text-lg font-bold text-white">
                      {getInitials(instructor.name)}
                    </div>
                    <div>
                      <p className="font-semibold text-white">{instructor.name}</p>
                      <p className="mt-1 text-sm text-white/75">{instructor.headline}</p>
                      <p className="mt-3 text-sm leading-6 text-white/70">{instructor.bio}</p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid gap-6 px-6 py-8 sm:px-10 lg:grid-cols-[0.9fr_1.1fr] lg:px-12 lg:py-10">
          <div className="rounded-[28px] border border-white/70 bg-white/85 p-6 shadow-lg shadow-slate-200/50">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Outcomes</p>
            <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-600">
              {course.outcomes.map((outcome) => (
                <li key={outcome} className="flex gap-3">
                  <span className={`mt-2 inline-flex h-2.5 w-2.5 rounded-full ${tone.accent.replace('text-', 'bg-')}`} />
                  <span>{outcome}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[28px] border border-white/70 bg-white/85 p-6 shadow-lg shadow-slate-200/50">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Modules</p>
            <div className="mt-5 space-y-4">
              {course.modules.map((module) => (
                <div key={module.title} className="rounded-[24px] border border-slate-100 bg-slate-50/85 p-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="font-display text-2xl font-bold text-slate-950">{module.title}</h2>
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${tone.badge}`}>
                      {module.lengthLabel}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{module.summary}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="section-shell surface-ring rounded-[32px] border border-white/70 px-6 py-8 sm:px-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">Live Sessions</p>
              <h2 className="mt-3 font-display text-3xl font-bold text-slate-950">Join the mentor-led delivery sessions attached to this course.</h2>
            </div>
            <Link to="/ndovera-meet" className={`${secondaryLinkClass} hidden lg:inline-flex`}>
              Open Ndovera Meet
            </Link>
          </div>

          <div className="mt-8 space-y-4">
            {sessions.length > 0 ? (
              sessions.map((session) => (
                <div key={session.id} className="rounded-[24px] border border-white/70 bg-white/85 p-5 shadow-lg shadow-slate-200/40">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] ${getSessionStatusClasses(session.status)}`}>
                          {session.status}
                        </span>
                        <span className="text-xs uppercase tracking-[0.24em] text-slate-400">{session.platformLabel}</span>
                      </div>
                      <p className="mt-3 font-semibold text-slate-950">{session.title}</p>
                      <p className="mt-2 text-sm leading-7 text-slate-600">{session.agenda}</p>
                    </div>

                    <a
                      href={session.joinUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={primaryLinkClass}
                    >
                      Join session
                    </a>
                  </div>

                  <div className="mt-4 grid gap-3 rounded-[20px] border border-slate-100 bg-slate-50/80 p-4 text-sm text-slate-600 sm:grid-cols-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Starts</p>
                      <p className="mt-2 font-semibold text-slate-950">{formatSessionDate(session.startsAt)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Duration</p>
                      <p className="mt-2 font-semibold text-slate-950">{formatDuration(session.durationMinutes)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Seats</p>
                      <p className="mt-2 font-semibold text-slate-950">{session.seatLabel}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-slate-300 bg-white/70 px-5 py-8 text-center text-sm text-slate-500">
                Session dates will appear here after the schedule is published.
              </div>
            )}
          </div>
        </div>

        <div className="section-shell surface-ring rounded-[32px] border border-white/70 px-6 py-8 sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">Related Courses</p>
          <h2 className="mt-3 font-display text-3xl font-bold text-slate-950">Keep the learning path connected across adjacent programs.</h2>

          <div className="mt-8 space-y-4">
            {relatedCourses.length > 0 ? (
              relatedCourses.map((item) => {
                const relatedTone = getCourseTone(item.tone);

                return (
                  <Link key={item.id} to={`/courses/${item.slug}`} className="block overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-lg shadow-slate-200/40 transition hover:-translate-y-1 hover:shadow-xl">
                    <div className={`bg-gradient-to-br ${relatedTone.gradient} px-5 py-5 text-white`}>
                      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/70">{item.category}</p>
                      <p className="mt-3 font-display text-2xl font-bold">{item.title}</p>
                    </div>
                    <div className="px-5 py-5">
                      <p className="text-sm leading-7 text-slate-600">{item.summary}</p>
                      <p className="mt-4 text-sm font-semibold text-slate-950">{item.priceLabel}</p>
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="rounded-[24px] border border-dashed border-slate-300 bg-white/70 px-5 py-8 text-center text-sm text-slate-500">
                Additional pathways will be linked here as more programs go live.
              </div>
            )}
          </div>
        </div>
      </section>
    </article>
  );
};

export default CourseDetail;
