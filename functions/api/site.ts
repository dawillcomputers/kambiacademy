interface Env {
  DB: D1Database;
}

const TONES = ['indigo', 'teal', 'amber', 'rose'] as const;

const toSummary = (description: string) => {
  const normalized = description.trim();
  if (!normalized) {
    return 'Teacher-led course with guided lessons, coursework, and live support.';
  }

  if (normalized.length <= 140) {
    return normalized;
  }

  return `${normalized.slice(0, 137).trimEnd()}...`;
};

const toOutcomes = (title: string, description: string) => {
  const sentences = description
    .split(/[.!?]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 3);

  if (sentences.length) {
    return sentences;
  }

  return [
    `Build practical confidence in ${title}.`,
    `Learn through teacher-guided examples and exercises.`,
    'Track your progress with assignments, quizzes, and live support.',
  ];
};

const SECTION_KEYS = [
  'branding',
  'hero',
  'stats',
  'about',
  'contact',
  'tutorProgram',
  'meet',
  'instructors',
  'courses',
  'testimonials',
  'faqs',
  'sessions',
] as const;

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const { results } = await env.DB.prepare(
    'SELECT key, data FROM site_sections WHERE key IN (' +
      SECTION_KEYS.map(() => '?').join(',') +
      ')',
  )
    .bind(...SECTION_KEYS)
    .all<{ key: string; data: string }>();

  const siteData: Record<string, unknown> = {};

  for (const row of results) {
    try {
      siteData[row.key] = JSON.parse(row.data);
    } catch {
      siteData[row.key] = row.data;
    }
  }

  try {
    const approvedTutorCourses = await env.DB.prepare(
      `SELECT tc.id, tc.slug, tc.title, tc.description, tc.level, tc.price, tc.duration_label, tc.category, tc.status,
              u.id as tutor_id, u.name as tutor_name
       FROM tutor_courses tc
       JOIN users u ON tc.tutor_id = u.id
       WHERE tc.status = 'approved'
       ORDER BY tc.approved_at DESC, tc.created_at DESC`,
    ).all<any>();

    const existingCourses = Array.isArray(siteData.courses) ? [...(siteData.courses as any[])] : [];
    const existingCourseSlugs = new Set(existingCourses.map((course) => course.slug));
    const existingInstructors = Array.isArray(siteData.instructors) ? [...(siteData.instructors as any[])] : [];
    const existingInstructorIds = new Set(existingInstructors.map((instructor) => instructor.id));

    approvedTutorCourses.results?.forEach((course, index) => {
      const slug = course.slug || `teacher-course-${course.id}`;
      if (existingCourseSlugs.has(slug)) {
        return;
      }

      const tone = TONES[index % TONES.length];
      existingCourses.push({
        id: `tutor-course-${course.id}`,
        slug,
        title: course.title,
        summary: toSummary(course.description || ''),
        description: course.description || '',
        level: course.level || 'Foundation',
        durationLabel: course.duration_label || '8 weeks',
        priceLabel: Number(course.price || 0) > 0 ? `$${Number(course.price || 0).toFixed(2)}` : 'Free',
        deliveryMode: 'Teacher-led',
        cohortSize: 'Flexible',
        category: course.category || 'General',
        tone,
        instructorId: String(course.tutor_id),
        featured: false,
        outcomes: toOutcomes(course.title, course.description || ''),
        modules: [
          { title: 'Getting started', summary: `Start ${course.title} with the key ideas and workflow.`, lengthLabel: 'Week 1' },
          { title: 'Core practice', summary: 'Work through practical lessons, assignments, and guided activities.', lengthLabel: 'Week 2-4' },
          { title: 'Applied mastery', summary: 'Use live sessions, quizzes, and projects to lock in the material.', lengthLabel: 'Week 5+' },
        ],
        tags: ['Teacher'],
        price: Number(course.price || 0),
        status: 'Approved',
        instructor: course.tutor_name,
        imageUrl: `https://picsum.photos/seed/${slug}/600/400`,
        assignments: [],
        materials: [],
        liveClassLinks: [],
        announcements: [],
      });
      existingCourseSlugs.add(slug);

      if (!existingInstructorIds.has(String(course.tutor_id))) {
        existingInstructors.push({
          id: String(course.tutor_id),
          name: course.tutor_name,
          role: 'Instructor',
          headline: `${course.category || 'General'} teacher`,
          bio: toSummary(course.description || ''),
          expertise: [course.category || course.level || 'General teaching'],
          yearsExperience: 0,
          colorToken: tone,
          featured: false,
        });
        existingInstructorIds.add(String(course.tutor_id));
      }
    });

    siteData.courses = existingCourses;
    siteData.instructors = existingInstructors;
  } catch {
    // Ignore teacher-course merge until the tutor course schema is fully available.
  }

  return Response.json(siteData, {
    headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300' },
  });
};
