// Community activity feed helper. Feed writes are best-effort: a feed failure must
// never break the underlying action (uploading a material, posting a competition…).

export interface ActivityInput {
  bootcampId: number;
  type: 'material' | 'competition' | 'live' | 'announcement' | 'mentor';
  title: string;
  body?: string;
  link?: string;
  icon?: string;
  refId?: number | null;
  createdBy?: number | null;
}

const DEFAULT_ICONS: Record<string, string> = {
  material: '📚',
  competition: '🏆',
  live: '🎥',
  announcement: '📣',
  mentor: '🧑‍🏫',
};

export async function recordActivity(db: D1Database, input: ActivityInput): Promise<void> {
  try {
    await db
      .prepare(
        `INSERT INTO bootcamp_activity (bootcamp_id, type, title, body, link, icon, ref_id, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        input.bootcampId,
        input.type,
        input.title,
        input.body || '',
        input.link || '',
        input.icon || DEFAULT_ICONS[input.type] || '✨',
        input.refId ?? null,
        input.createdBy ?? null,
      )
      .run();
  } catch (err) {
    console.error('recordActivity failed (non-fatal):', err);
  }
}
