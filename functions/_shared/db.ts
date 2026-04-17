export function getDB(c: { env: { DB: D1Database } }): any {
  return c.env.DB as any;
}
