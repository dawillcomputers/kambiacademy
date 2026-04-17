import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { auth } from '../_shared/auth';
import { getDB } from '../_shared/db';

const app = new Hono();
app.use('*', cors());

interface StudentRequest {
  id: string;
  studentId: string;
  teacherId: string;
  courseId?: string;
  type: 'help' | 'clarification' | 'meeting' | 'other';
  subject: string;
  message: string;
  status: 'pending' | 'accepted' | 'declined' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string;
  updatedAt: string;
}

// Get all requests for a teacher
app.get('/teacher/:teacherId', auth, async (c) => {
  try {
    const teacherId = c.req.param('teacherId');
    const user = c.get('user');

    // Only allow teachers to view their own requests or admins to view all
    if (user.role !== 'admin' && user.id !== teacherId) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const db = getDB(c);
    const requests = await db
      .selectFrom('student_requests')
      .where('teacherId', '=', teacherId)
      .selectAll()
      .orderBy('createdAt', 'desc')
      .execute();

    return c.json(requests);
  } catch (error) {
    console.error('Error fetching teacher requests:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get all requests from a student
app.get('/student/:studentId', auth, async (c) => {
  try {
    const studentId = c.req.param('studentId');
    const user = c.get('user');

    // Only allow students to view their own requests or admins
    if (user.role !== 'admin' && user.id !== studentId) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const db = getDB(c);
    const requests = await db
      .selectFrom('student_requests')
      .where('studentId', '=', studentId)
      .selectAll()
      .orderBy('createdAt', 'desc')
      .execute();

    return c.json(requests);
  } catch (error) {
    console.error('Error fetching student requests:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Create a new student request
app.post('/', auth, async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json();

    const { teacherId, courseId, type, subject, message, priority = 'medium' } = body;

    if (!teacherId || !type || !subject || !message) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    // Validate request type
    const validTypes = ['help', 'clarification', 'meeting', 'other'];
    if (!validTypes.includes(type)) {
      return c.json({ error: 'Invalid request type' }, 400);
    }

    // Validate priority
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (!validPriorities.includes(priority)) {
      return c.json({ error: 'Invalid priority level' }, 400);
    }

    const db = getDB(c);
    const requestId = crypto.randomUUID();

    await db
      .insertInto('student_requests')
      .values({
        id: requestId,
        studentId: user.id,
        teacherId,
        courseId,
        type,
        subject,
        message,
        status: 'pending',
        priority,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .execute();

    return c.json({ id: requestId, message: 'Request submitted successfully' }, 201);
  } catch (error) {
    console.error('Error creating student request:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Update request status (for teachers)
app.patch('/:requestId/status', auth, async (c) => {
  try {
    const requestId = c.req.param('requestId');
    const user = c.get('user');
    const body = await c.req.json();

    const { status } = body;
    const validStatuses = ['pending', 'accepted', 'declined', 'completed'];

    if (!validStatuses.includes(status)) {
      return c.json({ error: 'Invalid status' }, 400);
    }

    const db = getDB(c);

    // Get the request to check ownership
    const request = await db
      .selectFrom('student_requests')
      .where('id', '=', requestId)
      .select('teacherId')
      .executeTakeFirst();

    if (!request) {
      return c.json({ error: 'Request not found' }, 404);
    }

    // Only allow teachers to update their own requests or admins
    if (user.role !== 'admin' && user.id !== request.teacherId) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    await db
      .updateTable('student_requests')
      .set({
        status,
        updatedAt: new Date().toISOString(),
      })
      .where('id', '=', requestId)
      .execute();

    return c.json({ message: 'Request status updated successfully' });
  } catch (error) {
    console.error('Error updating request status:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Delete a request (for students to cancel, or teachers/admins)
app.delete('/:requestId', auth, async (c) => {
  try {
    const requestId = c.req.param('requestId');
    const user = c.get('user');

    const db = getDB(c);

    // Get the request to check ownership
    const request = await db
      .selectFrom('student_requests')
      .where('id', '=', requestId)
      .select(['studentId', 'teacherId'])
      .executeTakeFirst();

    if (!request) {
      return c.json({ error: 'Request not found' }, 404);
    }

    // Allow students to delete their own requests, teachers to delete requests to them, or admins
    const canDelete = user.role === 'admin' ||
                     user.id === request.studentId ||
                     user.id === request.teacherId;

    if (!canDelete) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    await db
      .deleteFrom('student_requests')
      .where('id', '=', requestId)
      .execute();

    return c.json({ message: 'Request deleted successfully' });
  } catch (error) {
    console.error('Error deleting request:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default app;

export const onRequest: PagesFunction = app.fetch;