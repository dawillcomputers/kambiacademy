
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { getCourseTone } from '../lib/site';
import { Course, CourseLevel, Instructor } from '../types';

interface CourseListProps {
    courses: Course[];
    instructors: Instructor[];
}

const levels: Array<CourseLevel | 'All'> = ['All', 'Foundation', 'Intermediate', 'Advanced'];

const CourseList: React.FC<CourseListProps> = ({ courses, instructors }) => {
    const [levelFilter, setLevelFilter] = useState<CourseLevel | 'All'>('All');
    const [query, setQuery] = useState('');
    const [statsMap, setStatsMap] = useState<Record<string, { views: number; likes: number }>>({}); 

    useEffect(() => {
        courses.forEach((course) => {
            api.getCourseStats(course.slug)
                .then((s) => setStatsMap((prev) => ({ ...prev, [course.slug]: { views: s.views, likes: s.likes } })))
                .catch(() => {});
        });
    }, [courses]);

    const instructorMap = useMemo(
        () => new Map(instructors.map((instructor) => [instructor.id, instructor])),
        [instructors],
    );

    const filteredCourses = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();

        return [...courses]
            .filter((course) => levelFilter === 'All' || course.level === levelFilter)
            .filter((course) => {
                if (!normalizedQuery) {
                    return true;
                }

                return [course.title, course.summary, course.category, course.description]
                    .join(' ')
                    .toLowerCase()
                    .includes(normalizedQuery);
            })
            .sort((left, right) => Number(right.featured) - Number(left.featured));
    }, [courses, levelFilter, query]);

    return (
        <div className="space-y-8">
            <section className="section-shell surface-ring rounded-[32px] border border-white/70 px-6 py-8 sm:px-8 lg:px-10">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">Programs</p>
                        <h1 className="mt-3 font-display text-4xl font-bold text-slate-950 sm:text-5xl">Choose the cohort that matches your current operating level.</h1>
                        <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
                            Every course is built for live delivery, clear outcomes, and mentor-led practice with Auralis live classrooms baked into the workflow.
                        </p>
                    </div>

                    <div className="w-full max-w-md">
                        <label htmlFor="course-search" className="sr-only">
                            Search courses
                        </label>
                        <input
                            id="course-search"
                            type="search"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Search by title, category, or keyword"
                            className="w-full rounded-full border border-white/70 bg-white/85 px-5 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                        />
                    </div>
                </div>

                <div className="mt-8 flex flex-wrap gap-2">
                    {levels.map((level) => (
                        <button
                            key={level}
                            type="button"
                            onClick={() => setLevelFilter(level)}
                            className={[
                                'rounded-full px-4 py-2 text-sm font-semibold transition',
                                levelFilter === level
                                    ? 'bg-slate-950 text-white shadow-lg shadow-slate-200'
                                    : 'border border-white/70 bg-white/80 text-slate-600 hover:border-slate-200 hover:text-slate-950',
                            ].join(' ')}
                        >
                            {level}
                        </button>
                    ))}
                </div>
            </section>

            <section className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
                {filteredCourses.map((course) => {
                    const tone = getCourseTone(course.tone);
                    const instructor = instructorMap.get(course.instructorId);

                    return (
                        <article key={course.id} className="overflow-hidden rounded-[30px] border border-white/70 bg-white shadow-xl shadow-slate-200/60 transition hover:-translate-y-1 hover:shadow-2xl">
                            <div className={`bg-gradient-to-br ${tone.gradient} px-6 py-7 text-white`}>
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/70">{course.category}</p>
                                        <h2 className="mt-3 font-display text-3xl font-bold">{course.title}</h2>
                                    </div>
                                    {course.featured && (
                                        <span className="rounded-full border border-white/30 bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/85">
                                            Featured
                                        </span>
                                    )}
                                </div>
                                <p className="mt-3 text-sm leading-6 text-white/80">{course.summary}</p>
                            </div>

                            <div className="space-y-5 px-6 py-6">
                                <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                    <span>{course.level}</span>
                                    <span>{course.durationLabel}</span>
                                    <span>{course.deliveryMode}</span>
                                </div>

                                <p className="text-sm leading-7 text-slate-600">{course.description}</p>

                                <div className="grid gap-3 rounded-[24px] border border-slate-100 bg-slate-50/80 p-4 text-sm text-slate-600 sm:grid-cols-2">
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Instructor</p>
                                        <p className="mt-2 font-semibold text-slate-900">{instructor?.name ?? 'Assigned soon'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Cohort Size</p>
                                        <p className="mt-2 font-semibold text-slate-900">{course.cohortSize}</p>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Outcomes</p>
                                    <ul className="mt-3 space-y-2 text-sm text-slate-600">
                                        {course.outcomes.slice(0, 3).map((outcome) => (
                                            <li key={outcome} className="flex gap-3">
                                                <span className={`mt-1 inline-flex h-2.5 w-2.5 rounded-full ${tone.accent.replace('text-', 'bg-')}`} />
                                                <span>{outcome}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-5">
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Tuition</p>
                                        <p className="mt-2 font-display text-2xl font-bold text-slate-950">{course.priceLabel}</p>
                                    </div>
                                    <Link
                                        to={`/courses/${course.slug}`}
                                        className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800"
                                    >
                                        View details
                                    </Link>
                                </div>

                                {statsMap[course.slug] && (
                                    <div className="flex items-center gap-4 text-xs text-slate-400 pt-3">
                                        <span>👁 {statsMap[course.slug].views} views</span>
                                        <span>♥ {statsMap[course.slug].likes} likes</span>
                                    </div>
                                )}
                            </div>
                        </article>
                    );
                })}
            </section>

            {filteredCourses.length === 0 && (
                <section className="section-shell rounded-[32px] border border-dashed border-slate-300 px-6 py-12 text-center text-slate-500 shadow-lg shadow-slate-200/30">
                    No courses match that filter yet. Try another keyword or level.
                </section>
            )}
        </div>
    );
};

export default CourseList;
