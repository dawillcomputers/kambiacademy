import { hashPassword, generateTempPassword } from '../../_shared/auth';

interface Env {
  DB: D1Database;
}

interface RegistrationBody {
  bootcampId?: number;
  slug?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  gender?: string;
  date_of_birth?: string;
  age_range?: string;
  country?: string;
  state?: string;
  city?: string;
  highest_qualification?: string;
  field_of_study?: string;
  institution?: string;
  employment_status?: string;
  organization_name?: string;
  current_role?: string;
  fintech_interests?: string[];
  experience_level?: string;
  tech_project_before?: string;
  coding_experience?: string;
  coding_languages?: string[];
  career_goals?: string[];
  career_goals_text?: string;
  startup_interest?: string;
  team_interest?: string;
  startup_idea?: string;
  startup_idea_text?: string;
  linkedin_url?: string;
  github_url?: string;
  portfolio_url?: string;
  profile_photo?: string;
  consent_terms?: boolean;
  consent_updates?: boolean;
  consent_community?: boolean;
  consent_jobs?: boolean;
}

const jsonArray = (value: unknown): string => {
  if (Array.isArray(value)) return JSON.stringify(value.filter((v) => typeof v === 'string'));
  return '[]';
};

// POST /api/bootcamps/register — public multi-step bootcamp registration.
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = await request.json<RegistrationBody>();

  if (!body.full_name?.trim() || !body.email?.trim()) {
    return Response.json({ error: 'Full name and email are required.' }, { status: 400 });
  }
  if (!body.consent_terms) {
    return Response.json({ error: 'You must agree to the Terms and Conditions to register.' }, { status: 400 });
  }

  const email = body.email.trim().toLowerCase();

  const bootcamp = body.bootcampId
    ? await env.DB.prepare('SELECT id, slug, title, status FROM bootcamps WHERE id = ?').bind(body.bootcampId).first<any>()
    : body.slug
      ? await env.DB.prepare('SELECT id, slug, title, status FROM bootcamps WHERE slug = ?').bind(body.slug).first<any>()
      : null;

  if (!bootcamp) {
    return Response.json({ error: 'Bootcamp not found.' }, { status: 404 });
  }
  if (bootcamp.status !== 'open') {
    return Response.json({ error: 'Registration for this bootcamp is closed.' }, { status: 400 });
  }

  // Find or create the bootcamp account.
  let userId: number;
  let isNewAccount = false;
  let tempPassword = '';
  const existing = await env.DB.prepare('SELECT id, role FROM users WHERE email = ?').bind(email).first<{ id: number; role: string }>();

  if (existing) {
    userId = Number(existing.id);
  } else {
    tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);
    const result = await env.DB.prepare(
      "INSERT INTO users (name, email, password_hash, role, status, must_change_password) VALUES (?, ?, ?, 'bootcamp_student', 'active', 1)",
    )
      .bind(body.full_name.trim(), email, passwordHash)
      .run();
    userId = Number(result.meta.last_row_id);
    isNewAccount = true;
  }

  // Store the detailed registration profile.
  await env.DB.prepare(
    `INSERT INTO bootcamp_registrations (
       user_id, bootcamp_id, full_name, email, phone, gender, date_of_birth, age_range,
       country, state, city, highest_qualification, field_of_study, institution,
       employment_status, organization_name, current_role,
       fintech_interests, experience_level, tech_project_before, coding_experience, coding_languages,
       career_goals, career_goals_text, startup_interest, team_interest, startup_idea, startup_idea_text,
       linkedin_url, github_url, portfolio_url, profile_photo,
       consent_terms, consent_updates, consent_community, consent_jobs, temp_password, registration_status
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
  )
    .bind(
      userId, bootcamp.id, body.full_name.trim(), email, body.phone || '', body.gender || '', body.date_of_birth || '', body.age_range || '',
      body.country || '', body.state || '', body.city || '', body.highest_qualification || '', body.field_of_study || '', body.institution || '',
      body.employment_status || '', body.organization_name || '', body.current_role || '',
      jsonArray(body.fintech_interests), body.experience_level || '', body.tech_project_before || '', body.coding_experience || '', jsonArray(body.coding_languages),
      jsonArray(body.career_goals), body.career_goals_text || '', body.startup_interest || '', body.team_interest || '', body.startup_idea || '', body.startup_idea_text || '',
      body.linkedin_url || '', body.github_url || '', body.portfolio_url || '', body.profile_photo || '',
      body.consent_terms ? 1 : 0, body.consent_updates ? 1 : 0, body.consent_community ? 1 : 0, body.consent_jobs ? 1 : 0, tempPassword,
    )
    .run();

  // Enrol them in the bootcamp.
  await env.DB.prepare(
    "INSERT OR IGNORE INTO bootcamp_enrollments (bootcamp_id, user_id, status) VALUES (?, ?, 'active')",
  ).bind(bootcamp.id, userId).run();
  await env.DB.prepare(
    "UPDATE bootcamp_enrollments SET status = 'active' WHERE bootcamp_id = ? AND user_id = ?",
  ).bind(bootcamp.id, userId).run();

  return Response.json(
    {
      message: `Welcome to ${bootcamp.title}! Your registration is complete.`,
      email,
      bootcampSlug: bootcamp.slug,
      bootcampTitle: bootcamp.title,
      isNewAccount,
      tempPassword: isNewAccount ? tempPassword : undefined,
    },
    { status: 201 },
  );
};
