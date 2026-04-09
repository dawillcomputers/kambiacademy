import { hashPassword } from '../_shared/auth';

interface Env {
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async ({ env }) => {
  const existing = await env.DB.prepare(
    "SELECT id FROM users WHERE role = 'admin' LIMIT 1",
  ).first();

  if (existing) {
    return Response.json({ message: 'Admin account already exists.' });
  }

  const passwordHash = await hashPassword('admin123');
  await env.DB.prepare(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
  )
    .bind('Super Admin', 'admin@kambiacademy.com', passwordHash, 'admin')
    .run();

  return Response.json(
    {
      message:
        'Admin account created. Email: admin@kambiacademy.com, Password: admin123. Change this immediately.',
    },
    { status: 201 },
  );
};
