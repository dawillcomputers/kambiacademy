export function getDB(c: { env: { DB: D1Database } }): D1Database {
  return c.env.DB;
}
