interface Env {
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async ({ params, env }) => {
  const slug = params.slug as string;

  await env.DB.prepare(
    `INSERT INTO course_stats (course_slug, views, likes) VALUES (?, 1, 0)
     ON CONFLICT(course_slug) DO UPDATE SET views = views + 1`,
  )
    .bind(slug)
    .run();

  return Response.json({ message: 'View recorded.' });
};
