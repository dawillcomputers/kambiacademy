import { getAuthUser } from '../_shared/auth';

interface Env {
  DB: D1Database;
}

// POST: submit a complaint
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user || user.role !== 'student') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json<{
    teacher_id?: number;
    course_slug?: string;
    complaint_text: string;
  }>();

  if (!body.complaint_text) {
    return Response.json({ error: 'Complaint text required' }, { status: 400 });
  }

  try {
    const result = await env.DB.prepare(
      `INSERT INTO student_complaints (student_id, teacher_id, course_slug, complaint_text)
       VALUES (?, ?, ?, ?)`
    ).bind(
      user.id,
      body.teacher_id || null,
      body.course_slug || null,
      body.complaint_text
    ).run();

    // Mock AI review (in real implementation, call AI service)
    const aiRecommendation = `AI Analysis: ${body.complaint_text.substring(0, 50)}... Recommended action: Review teacher performance and contact student for details.`;

    await env.DB.prepare(
      'UPDATE student_complaints SET ai_recommendation = ?, status = ? WHERE id = ?'
    ).bind(aiRecommendation, 'reviewed', result.meta.last_row_id).run();

    // Send reprimand message to teacher if applicable
    if (body.teacher_id) {
      const reprimandMessage = `AI Monitoring Alert: A student has filed a complaint regarding your course. Please review your teaching practices and ensure student satisfaction. This is an automated reminder.`;
      await env.DB.prepare(
        `INSERT INTO admin_messages (from_user_id, to_user_id, message_text, message_type)
         VALUES (?, ?, ?, ?)`
      ).bind(1, body.teacher_id, reprimandMessage, 'reprimand').run(); // Assuming admin user_id is 1
    }

    return Response.json({ success: true, complaint_id: result.meta.last_row_id });
  } catch (error) {
    console.error('Error submitting complaint:', error);
    return Response.json({ error: 'Failed to submit complaint' }, { status: 500 });
  }
};

// GET: get complaints (for admin)
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { results } = await env.DB.prepare(
    `SELECT sc.*, u.name as student_name, t.name as teacher_name
     FROM student_complaints sc
     LEFT JOIN users u ON sc.student_id = u.id
     LEFT JOIN users t ON sc.teacher_id = t.id
     ORDER BY sc.created_at DESC`
  ).all();

  return Response.json({ complaints: results });
};
export const onRequestPatch: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json<{
    complaint_id: number;
    status: 'pending' | 'reviewed' | 'resolved';
    admin_action?: string;
  }>();

  if (!body.complaint_id || !body.status) {
    return Response.json({ error: 'Missing fields' }, { status: 400 });
  }

  try {
    const now = new Date().toISOString();
    const updates: string[] = ['status = ?'];
    const params: any[] = [body.status];

    if (body.admin_action) {
      updates.push('admin_action = ?');
      params.push(body.admin_action);
    }

    if (body.status === 'reviewed') {
      updates.push('reviewed_at = ?');
      params.push(now);
    }

    if (body.status === 'resolved') {
      updates.push('resolved_at = ?');
      params.push(now);
    }

    params.push(body.complaint_id);
    await env.DB.prepare(`UPDATE student_complaints SET ${updates.join(', ')} WHERE id = ?`).bind(...params).run();

    const complaint = await env.DB.prepare('SELECT teacher_id FROM student_complaints WHERE id = ?').bind(body.complaint_id).first<{ teacher_id: number }>();
    if (complaint?.teacher_id && body.status === 'resolved') {
      await env.DB.prepare(
        `INSERT INTO admin_messages (from_user_id, to_user_id, message_text, message_type)
         VALUES (?, ?, ?, ?)`
      ).bind(1, complaint.teacher_id, 'Your complaint case has been resolved by the administrator. Ensure improved delivery for students.', 'notification').run();
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error updating complaint:', error);
    return Response.json({ error: 'Failed to update complaint' }, { status: 500 });
  }
};