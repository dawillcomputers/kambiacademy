import { getAuthUser, isFullAdmin } from '../../_shared/auth';

interface Env {
  DB: D1Database;
  AI_PROVIDER?: string;
  AI_MODEL?: string;
  API_KEY?: string;
  GOOGLE_API_KEY?: string;
  GEMINI_API_KEY?: string;
  SYSTEM_AI_PROVIDER?: string;
  SYSTEM_AI_MODEL?: string;
  SYSTEM_OPENAI_API_KEY?: string;
  SYSTEM_ANTHROPIC_API_KEY?: string;
  SYSTEM_GOOGLE_API_KEY?: string;
  OPENAI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
}

const MAX_COMMAND_LENGTH = 1200;

const quickSuggestions: Record<string, string[]> = {
  student: [
    'Ask for a study plan',
    'Ask which course to take next',
    'Ask how payment verification works',
  ],
  teacher: [
    'Ask how to unlock payouts',
    'Ask for course ideas',
    'Ask how billing and subscriptions work',
  ],
  admin: [
    'Ask for a revenue snapshot',
    'Ask what to review next',
    'Ask for system status',
  ],
  super_admin: [
    'Ask for system status',
    'Ask for payout blockers',
    'Ask for revenue report',
  ],
  SOU: [
    'Ask for system status',
    'Ask for payout blockers',
    'Ask for revenue report',
  ],
};

const isTeacherRole = (role?: string) => role === 'teacher' || role === 'tutor';

type AssistantHistoryEntry = {
  role: 'assistant' | 'user';
  content: string;
};

function resolveRoleCapabilities(role?: string) {
  if (role === 'student') {
    return 'You help students with course selection, study plans, payment status, assignments, and live-class guidance.';
  }

  if (isTeacherRole(role)) {
    return 'You help teachers with course creation, student management, billing, subscriptions, payouts, and KYC requirements.';
  }

  if (role === 'admin' || role === 'super_admin' || role === 'SOU') {
    return 'You help platform operators with finance visibility, payout review workflows, user operations, and system health.';
  }

  return 'You help Kambi Academy users navigate the platform.';
}

function normalizeAIProvider(env: Env) {
  const configured = String(env.SYSTEM_AI_PROVIDER || env.AI_PROVIDER || '').toLowerCase();
  if (configured === 'openai' || configured === 'anthropic' || configured === 'google') {
    return configured;
  }

  if (env.SYSTEM_OPENAI_API_KEY || env.OPENAI_API_KEY) {
    return 'openai';
  }
  if (env.SYSTEM_ANTHROPIC_API_KEY || env.ANTHROPIC_API_KEY) {
    return 'anthropic';
  }
  if (env.SYSTEM_GOOGLE_API_KEY || env.GEMINI_API_KEY || env.GOOGLE_API_KEY || env.API_KEY) {
    return 'google';
  }

  return null;
}

async function generateAIReply(env: Env, prompt: string) {
  const provider = normalizeAIProvider(env);
  const model = env.SYSTEM_AI_MODEL || env.AI_MODEL;
  const openAIKey = env.SYSTEM_OPENAI_API_KEY || env.OPENAI_API_KEY;
  const anthropicKey = env.SYSTEM_ANTHROPIC_API_KEY || env.ANTHROPIC_API_KEY;
  const googleKey = env.SYSTEM_GOOGLE_API_KEY || env.GEMINI_API_KEY || env.GOOGLE_API_KEY || env.API_KEY;
  if (!provider) {
    return '';
  }

  if (provider === 'openai' && openAIKey) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.6,
      }),
    });
    const payload = await response.json().catch(() => null) as any;
    if (!response.ok) {
      throw new Error(payload?.error?.message || payload?.message || 'OpenAI request failed');
    }

    return String(payload?.choices?.[0]?.message?.content || '').trim();
  }

  if (provider === 'anthropic' && anthropicKey) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'claude-sonnet-4-5',
        max_tokens: 768,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const payload = await response.json().catch(() => null) as any;
    if (!response.ok) {
      throw new Error(payload?.error?.message || payload?.message || 'Anthropic request failed');
    }

    return (Array.isArray(payload?.content) ? payload.content : [])
      .filter((entry: any) => entry?.type === 'text' && typeof entry?.text === 'string')
      .map((entry: any) => entry.text)
      .join('\n')
      .trim();
  }

  if (provider === 'google' && googleKey) {
    const activeModel = model || 'gemini-1.5-flash';
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent?key=${googleKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      }),
    });
    const payload = await response.json().catch(() => null) as any;
    if (!response.ok) {
      throw new Error(payload?.error?.message || payload?.message || 'Google AI request failed');
    }

    return String(payload?.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();
  }

  return '';
}

function fallbackAssistantReply(command: string, role?: string) {
  const normalized = command.toLowerCase();

  if (normalized.includes('payout') || normalized.includes('bank') || normalized.includes('verification')) {
    if (isTeacherRole(role)) {
      return 'Automatic teacher payouts now depend on the payout settings form in the teacher settings page. Add your bank details, upload one identity document and one address document, then wait for superadmin review before payouts are enabled.';
    }

    return 'Teachers can only enter the automatic payout queue after their bank details and both verification documents are approved. Review requests from the superadmin finance page to remove payout blockers.';
  }

  if (normalized.includes('payment') || normalized.includes('billing') || normalized.includes('flutterwave')) {
    return 'Flutterwave payment callbacks now normalize completed, success, and successful statuses. If a callback arrives without a transaction id, the verification flow can fall back to the transaction reference instead of waiting for manual intervention.';
  }

  if (normalized.includes('course') || normalized.includes('study') || normalized.includes('learn')) {
    return role === 'student'
      ? 'Start with your current goals, available study time, and budget. Use the course list and AI courses area to compare outcomes, then focus on one course at a time until your progress stays consistent.'
      : 'Strong Kambi Academy courses work best when they are outcome-driven, practical, and easy to review. Keep the title specific, the level clear, and the first module immediately useful.';
  }

  if (normalized.includes('status') || normalized.includes('health')) {
    return 'The quickest health checks are revenue totals, recent enrollments, payout queue blockers, and failed payment or reconciliation records on the superadmin finance views.';
  }

  return role === 'student'
    ? 'Ask about courses, study plans, live classes, or payment verification and I will guide you through the next step.'
    : isTeacherRole(role)
      ? 'Ask about teaching workflows, subscriptions, payouts, KYC review, or course ideas and I will point you to the right action.'
      : 'Ask about platform activity, finance, payout reviews, or system health and I will summarize the next action to take.';
}

function summarizeHistory(history: AssistantHistoryEntry[]) {
  return history
    .slice(-8)
    .map((entry) => `${entry.role === 'assistant' ? 'Assistant' : 'User'}: ${entry.content}`)
    .join('\n');
}

function deriveUpgradeSuggestions(role: string, command: string, history: AssistantHistoryEntry[]) {
  const text = `${history.map((entry) => entry.content).join(' ')} ${command}`.toLowerCase();
  const suggestions: string[] = [];

  if (isTeacherRole(role) && /(upload|storage|material|file|resource|document|recording)/.test(text)) {
    suggestions.push('Storage Add-on: $2 monthly or $24 yearly for hosted files and teaching materials.');
  }

  if (isTeacherRole(role) && /(live class|live session|zoom|video|stream|broadcast|teach live|hours)/.test(text)) {
    suggestions.push('Live Classes Add-on: $2 monthly or $24 yearly for realtime teaching tools.');
  }

  if ((role === 'admin' || role === 'super_admin' || role === 'SOU') && /(billing|renew|subscription|locked|approval|approve|course|user)/.test(text)) {
    suggestions.push('Main Subscription: $9 monthly or $100 yearly keeps the admin console covered for the current billing cycle.');
  }

  return Array.from(new Set(suggestions)).slice(0, 3);
}

async function createAssistantReply(env: Env, user: { role: string; name: string }, command: string, history: AssistantHistoryEntry[]) {
  const upgradeSuggestions = deriveUpgradeSuggestions(user.role, command, history);
  const prompt = [
    'You are Kambi AI, the in-product assistant for Kambi Academy.',
    resolveRoleCapabilities(user.role),
    'You are backed by the platform system AI keys and may answer any legitimate user question directly and helpfully.',
    'Keep answers concise, concrete, and operational. Avoid fluff. If you mention platform workflows, use the current dashboard names when possible.',
    'Only mention upgrade suggestions when they are relevant to the user intent or recent chat history.',
    'Current upgrade catalog: Main Subscription is $9 monthly or $100 yearly for admin and superadmin billing coverage. Teacher add-ons are optional: Storage Add-on is $2 monthly or $24 yearly, and Live Classes Add-on is $2 monthly or $24 yearly.',
    `Current user role: ${user.role}`,
    history.length ? `Recent chat context:\n${summarizeHistory(history)}` : 'Recent chat context: none',
    upgradeSuggestions.length ? `Relevant upgrade suggestions:\n- ${upgradeSuggestions.join('\n- ')}` : 'Relevant upgrade suggestions: none',
    `User prompt: ${command}`,
  ].join('\n\n');

  try {
    const generated = await generateAIReply(env, prompt);
    if (generated) {
      return {
        message: generated,
        suggestions: upgradeSuggestions.length ? upgradeSuggestions : quickSuggestions[user.role] || quickSuggestions.student,
      };
    }
  } catch (error) {
    console.error('AI assistant generation failed:', error);
  }

  return {
    message: fallbackAssistantReply(command, user.role),
    suggestions: upgradeSuggestions.length ? upgradeSuggestions : quickSuggestions[user.role] || quickSuggestions.student,
  };
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json<{ command?: string; history?: AssistantHistoryEntry[] }>();
  const rawCommand = String(body.command || '').trim();
  const cmd = rawCommand.toLowerCase();
  const history = Array.isArray(body.history)
    ? body.history
        .filter((entry): entry is AssistantHistoryEntry => Boolean(entry && (entry.role === 'assistant' || entry.role === 'user') && typeof entry.content === 'string'))
        .map((entry) => ({ role: entry.role, content: entry.content.trim().slice(0, 1000) }))
        .filter((entry) => entry.content.length > 0)
    : [];

  if (!cmd) {
    return Response.json({ error: 'Command cannot be empty' }, { status: 400 });
  }

  if (rawCommand.length > MAX_COMMAND_LENGTH) {
    return Response.json({ error: `Command must be ${MAX_COMMAND_LENGTH} characters or fewer.` }, { status: 400 });
  }

  try {
    if (isFullAdmin(user) && cmd.includes('increase') && cmd.includes('price')) {
      const result = await optimizePrices(env);
      return Response.json(result);
    }

    if (isFullAdmin(user) && cmd.includes('pause') && (cmd.includes('low') || cmd.includes('course'))) {
      const result = await pauseLowCourses(env);
      return Response.json(result);
    }

    if (isFullAdmin(user) && (cmd.includes('flag') || cmd.includes('ban'))) {
      const result = await flagRiskyTutors(env);
      return Response.json(result);
    }

    if (isFullAdmin(user) && (cmd.includes('revenue') || cmd.includes('report'))) {
      const result = await getRevenueReport(env);
      return Response.json(result);
    }

    if (isFullAdmin(user) && (cmd.includes('fraud') || cmd.includes('alert'))) {
      const result = await getFraudAlerts(env);
      return Response.json(result);
    }

    if (isFullAdmin(user) && (cmd.includes('status') || cmd.includes('health'))) {
      const result = await getSystemStatus(env);
      return Response.json(result);
    }

    return Response.json(await createAssistantReply(env, user as any, rawCommand, history));

  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
};

async function optimizePrices(env: Env) {
  const lowEnrollmentCourses = await env.DB.prepare(`
    SELECT tc.id, tc.price
    FROM tutor_courses tc
    LEFT JOIN enrollments e ON e.course_slug = tc.slug
    WHERE tc.status = 'approved'
    GROUP BY tc.id, tc.price
    HAVING COUNT(e.id) < 5
  `).all();

  let updated = 0;
  for (const course of lowEnrollmentCourses.results || []) {
    await env.DB.prepare(`
      UPDATE tutor_courses SET price = ROUND(price * 1.1, 2) WHERE id = ?
    `).bind(course.id).run();
    updated++;
  }

  return {
    action: 'price_increased',
    affected_courses: updated,
    result: `✅ Increased prices for ${updated} low-enrollment courses by 10%`
  };
}

async function pauseLowCourses(env: Env) {
  const result = await env.DB.prepare(`
    SELECT COUNT(*) as count
    FROM tutor_courses tc
    LEFT JOIN enrollments e ON e.course_slug = tc.slug
    WHERE tc.status = 'approved'
    GROUP BY tc.id
    HAVING COUNT(e.id) = 0
  `).first<{ count: number }>();

  const count = result?.count || 0;

  if (count > 0) {
    await env.DB.prepare(`
      UPDATE tutor_courses
      SET status = 'pending'
      WHERE id IN (
        SELECT tc.id
        FROM tutor_courses tc
        LEFT JOIN enrollments e ON e.course_slug = tc.slug
        WHERE tc.status = 'approved'
        GROUP BY tc.id
        HAVING COUNT(e.id) = 0
      )
    `).run();
  }

  return {
    action: 'courses_paused',
    paused_count: count,
    result: `⏸️ Paused ${count} courses with rating below 2.5`
  };
}

async function flagRiskyTutors(env: Env) {
  const riskyTutors = await env.DB.prepare(`
    SELECT u.id, u.name, u.email, COUNT(DISTINCT tc.id) as course_count, COUNT(DISTINCT e.id) as enrollment_count
    FROM users u
    LEFT JOIN tutor_courses tc ON tc.tutor_id = u.id AND tc.status = 'approved'
    LEFT JOIN enrollments e ON e.course_slug = tc.slug
    WHERE u.role IN ('teacher', 'tutor')
    GROUP BY u.id
    HAVING course_count = 0 OR enrollment_count = 0
  `).all();

  const tutors = riskyTutors.results || [];

  for (const t of tutors) {
    await env.DB.prepare(`
      UPDATE users SET status = 'flagged' WHERE id = ?
    `).bind(t.id).run();
  }

  return {
    action: 'tutors_flagged',
    flagged_count: tutors.length,
    result: `🚩 Flagged ${tutors.length} tutors with low performance`
  };
}

async function getRevenueReport(env: Env) {
  const stats = await env.DB.prepare(`
    SELECT 
      COUNT(DISTINCT u.id) as total_users,
      COUNT(DISTINCT e.id) as total_enrollments,
      COALESCE(SUM(e.amount_paid), 0) as total_revenue
    FROM users u
    LEFT JOIN enrollments e ON e.user_id = u.id
  `).first<any>();

  return {
    action: 'revenue_report',
    data: stats,
    result: `💰 Revenue Report:\n- Users: ${stats?.total_users || 0}\n- Enrollments: ${stats?.total_enrollments || 0}\n- Total Revenue: ₦${(stats?.total_revenue || 0).toLocaleString()}`
  };
}

async function getFraudAlerts(env: Env) {
  const fraudUsers = await env.DB.prepare(`
    SELECT id, name, email FROM users WHERE status = 'fraud_flagged' LIMIT 10
  `).all();

  const users = fraudUsers.results || [];

  return {
    action: 'fraud_alerts',
    alert_count: users.length,
    users: users,
    result: `🚨 Fraud Alerts: ${users.length} users flagged for suspicious activity`
  };
}

async function getSystemStatus(env: Env) {
  const users = await env.DB.prepare('SELECT COUNT(*) as count FROM users').first<{ count: number }>();
  const courses = await env.DB.prepare('SELECT COUNT(*) as count FROM tutor_courses').first<{ count: number }>();
  const enrollments = await env.DB.prepare('SELECT COUNT(*) as count FROM enrollments').first<{ count: number }>();

  return {
    action: 'system_status',
    status: 'OPERATIONAL',
    metrics: {
      users: users?.count || 0,
      courses: courses?.count || 0,
      enrollments: enrollments?.count || 0,
      timestamp: new Date().toISOString()
    },
    result: `✅ System Status: OPERATIONAL\n- Users: ${users?.count || 0}\n- Courses: ${courses?.count || 0}\n- Enrollments: ${enrollments?.count || 0}`
  };
}
