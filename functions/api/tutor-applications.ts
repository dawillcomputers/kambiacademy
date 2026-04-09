interface Env {
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const contentType = request.headers.get('Content-Type') ?? '';

  let name = '';
  let email = '';
  let phone = '';
  let expertise = '';
  let yearsExperience = '';
  let portfolioUrl = '';
  let summary = '';
  let resumeKey = '';

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    name = (formData.get('name') as string) ?? '';
    email = (formData.get('email') as string) ?? '';
    phone = (formData.get('phone') as string) ?? '';
    expertise = (formData.get('expertise') as string) ?? '';
    yearsExperience = (formData.get('yearsExperience') as string) ?? '';
    portfolioUrl = (formData.get('portfolioUrl') as string) ?? '';
    summary = (formData.get('summary') as string) ?? '';

    const resume = formData.get('resume') as File | null;
    if (resume && resume.size > 0) {
      // Store a reference; file storage (R2, etc.) can be added later
      resumeKey = `resumes/${Date.now()}-${resume.name}`;
    }
  } else {
    const body = await request.json<Record<string, string>>();
    name = body.name ?? '';
    email = body.email ?? '';
    phone = body.phone ?? '';
    expertise = body.expertise ?? '';
    yearsExperience = body.yearsExperience ?? '';
    portfolioUrl = body.portfolioUrl ?? '';
    summary = body.summary ?? '';
  }

  if (!name || !email) {
    return Response.json(
      { error: 'name and email are required.' },
      { status: 400 },
    );
  }

  const result = await env.DB.prepare(
    'INSERT INTO tutor_applications (name, email, phone, expertise, years_experience, portfolio_url, summary, resume_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  )
    .bind(name, email, phone, expertise, yearsExperience, portfolioUrl, summary, resumeKey)
    .run();

  return Response.json(
    {
      id: String(result.meta.last_row_id),
      message: 'Your application has been submitted. We will review it and get back to you.',
    },
    { status: 201 },
  );
};
