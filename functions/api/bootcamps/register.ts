import { hashPassword, generateTempPassword } from '../../_shared/auth';

interface Env {
  DB: D1Database;
  FLUTTERWAVE_STUDENT_SECRET_KEY?: string;
  FLUTTERWAVE_SECRET_KEY?: string;
}

interface RegistrationBody {
  action?: 'initiate' | 'verify';
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
  // verify-only fields
  transactionRef?: string;
  tx_ref?: string;
  flutterwaveTransactionId?: string;
  transaction_id?: string;
  status?: string;
}

const FLUTTERWAVE_PAYMENT_GATEWAY = 'flutterwave_live';
const PRODUCTION_SITE_ORIGIN = 'https://kambiacademy.com';
const FLUTTERWAVE_PREFERRED_PAYMENT_OPTIONS = 'banktransfer,card,ussd';
const roundCurrency = (value: number) => Math.round(value * 100) / 100;
const isSuccessfulIntent = (status?: string | null) => ['success', 'successful', 'completed'].includes(String(status || '').toLowerCase());

const jsonArray = (value: unknown): string => {
  if (Array.isArray(value)) return JSON.stringify(value.filter((v) => typeof v === 'string'));
  return '[]';
};

const resolveStudentFlutterwaveSecret = (env: Env) => env.FLUTTERWAVE_STUDENT_SECRET_KEY || env.FLUTTERWAVE_SECRET_KEY;

function resolvePaymentOrigin(request: Request) {
  const requestUrl = new URL(request.url);
  const hostname = requestUrl.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]') {
    return (request.headers.get('origin') || requestUrl.origin).replace(/\/$/, '');
  }
  return PRODUCTION_SITE_ORIGIN;
}

async function initializeFlutterwavePayment(options: {
  secret: string;
  origin: string;
  transactionRef: string;
  amount: number;
  slug: string;
  bootcampTitle: string;
  user: { email: string; name: string };
}) {
  const { secret, origin, transactionRef, amount, slug, bootcampTitle, user } = options;
  const redirectQuery = new URLSearchParams({
    type: 'bootcamp_registration',
    slug,
    tx_ref: transactionRef,
  }).toString();

  const response = await fetch('https://api.flutterwave.com/v3/payments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tx_ref: transactionRef,
      amount,
      currency: 'NGN',
      payment_options: FLUTTERWAVE_PREFERRED_PAYMENT_OPTIONS,
      redirect_url: `${origin.replace(/\/$/, '')}/payment-callback?${redirectQuery}`,
      customer: { email: user.email, name: user.name },
      customizations: {
        title: 'Kambi Academy Bootcamp',
        description: `Registration fee for ${bootcampTitle}`,
      },
      meta: { bootcamp_slug: slug, kind: 'bootcamp_registration' },
    }),
  });

  const data = (await response.json().catch(() => null)) as any;
  if (!response.ok) {
    throw new Error(data?.message || 'Failed to initialize Flutterwave payment');
  }
  const paymentUrl = data?.data?.link;
  if (!paymentUrl) {
    throw new Error('Flutterwave did not return a payment link');
  }
  return paymentUrl as string;
}

async function verifyFlutterwavePayment(secret: string, transactionId: string | undefined, transactionRef: string, expectedAmount: number) {
  const verifyUrl = transactionId
    ? `https://api.flutterwave.com/v3/transactions/${transactionId}/verify`
    : `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(transactionRef)}`;

  const response = await fetch(verifyUrl, {
    headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
  });
  const payload = (await response.json().catch(() => null)) as any;
  if (!response.ok) {
    throw new Error(payload?.message || 'Flutterwave verification failed');
  }
  const transaction = Array.isArray(payload?.data) ? payload.data[0] : payload?.data;
  const verifiedAmount = Number(transaction?.amount ?? 0);
  const amountMatches = verifiedAmount + 0.01 >= expectedAmount; // allow exact or slightly higher
  return payload?.status === 'success'
    && isSuccessfulIntent(transaction?.status)
    && transaction?.tx_ref === transactionRef
    && amountMatches;
}

// Persist (or refresh) the detailed registration profile for a participant.
async function upsertRegistration(env: Env, params: {
  userId: number;
  bootcampId: number;
  body: RegistrationBody;
  email: string;
  tempPassword: string;
  registrationStatus: string;
  paymentStatus: string;
  paymentRef: string;
  amountDue: number;
}) {
  const { userId, bootcampId, body, email, tempPassword, registrationStatus, paymentStatus, paymentRef, amountDue } = params;
  await env.DB.prepare(
    `INSERT INTO bootcamp_registrations (
       user_id, bootcamp_id, full_name, email, phone, gender, date_of_birth, age_range,
       country, state, city, highest_qualification, field_of_study, institution,
       employment_status, organization_name, current_role,
       fintech_interests, experience_level, tech_project_before, coding_experience, coding_languages,
       career_goals, career_goals_text, startup_interest, team_interest, startup_idea, startup_idea_text,
       linkedin_url, github_url, portfolio_url, profile_photo,
       consent_terms, consent_updates, consent_community, consent_jobs, temp_password,
       registration_status, payment_status, payment_ref, amount_due
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      userId, bootcampId, (body.full_name || '').trim(), email, body.phone || '', body.gender || '', body.date_of_birth || '', body.age_range || '',
      body.country || '', body.state || '', body.city || '', body.highest_qualification || '', body.field_of_study || '', body.institution || '',
      body.employment_status || '', body.organization_name || '', body.current_role || '',
      jsonArray(body.fintech_interests), body.experience_level || '', body.tech_project_before || '', body.coding_experience || '', jsonArray(body.coding_languages),
      jsonArray(body.career_goals), body.career_goals_text || '', body.startup_interest || '', body.team_interest || '', body.startup_idea || '', body.startup_idea_text || '',
      body.linkedin_url || '', body.github_url || '', body.portfolio_url || '', body.profile_photo || '',
      body.consent_terms ? 1 : 0, body.consent_updates ? 1 : 0, body.consent_community ? 1 : 0, body.consent_jobs ? 1 : 0, tempPassword,
      registrationStatus, paymentStatus, paymentRef, amountDue,
    )
    .run();
}

// Activate the participant's enrollment once their place is confirmed (free or paid).
async function activateEnrollment(env: Env, bootcampId: number, userId: number, amountPaid: number) {
  await env.DB.prepare(
    "INSERT OR IGNORE INTO bootcamp_enrollments (bootcamp_id, user_id, status, amount_paid) VALUES (?, ?, 'active', ?)",
  ).bind(bootcampId, userId, amountPaid).run();
  await env.DB.prepare(
    "UPDATE bootcamp_enrollments SET status = 'active', amount_paid = ? WHERE bootcamp_id = ? AND user_id = ?",
  ).bind(amountPaid, bootcampId, userId).run();
}

// POST /api/bootcamps/register — public multi-step bootcamp registration with optional paid fee.
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = await request.json<RegistrationBody>();
  const action = body.action || 'initiate';

  // ── Verify a returning Flutterwave payment and finalize the registration ──
  if (action === 'verify') {
    const transactionRef = body.transactionRef || body.tx_ref;
    const flutterwaveTransactionId = body.flutterwaveTransactionId || body.transaction_id;
    if (!transactionRef) {
      return Response.json({ error: 'A payment reference is required to confirm your registration.' }, { status: 400 });
    }
    if (!isSuccessfulIntent(body.status)) {
      return Response.json({ error: 'Your payment was not completed. Please try again.' }, { status: 400 });
    }

    const registration = await env.DB.prepare(
      `SELECT r.*, b.title AS bootcamp_title, b.slug AS bootcamp_slug
       FROM bootcamp_registrations r JOIN bootcamps b ON b.id = r.bootcamp_id
       WHERE r.payment_ref = ? ORDER BY r.id DESC LIMIT 1`,
    ).bind(transactionRef).first<any>();

    if (!registration) {
      return Response.json({ error: 'We could not find a registration for this payment.' }, { status: 404 });
    }

    const amountDue = Number(registration.amount_due || 0);

    if (registration.payment_status !== 'paid') {
      const secret = resolveStudentFlutterwaveSecret(env);
      if (!secret) {
        return Response.json({ error: 'Payment gateway is not configured.' }, { status: 503 });
      }
      let verified = false;
      try {
        verified = await verifyFlutterwavePayment(secret, flutterwaveTransactionId, transactionRef, amountDue);
      } catch (error) {
        return Response.json({ error: error instanceof Error ? error.message : 'Payment verification failed.' }, { status: 400 });
      }
      if (!verified) {
        return Response.json({ error: 'We could not verify your payment. Please contact support.' }, { status: 400 });
      }

      await env.DB.prepare(
        "UPDATE bootcamp_registrations SET registration_status = 'active', payment_status = 'paid', updated_at = datetime('now') WHERE id = ?",
      ).bind(registration.id).run();
      await activateEnrollment(env, Number(registration.bootcamp_id), Number(registration.user_id), amountDue);
    }

    return Response.json({
      message: `Payment confirmed! Welcome to ${registration.bootcamp_title}.`,
      email: registration.email,
      bootcampSlug: registration.bootcamp_slug,
      bootcampTitle: registration.bootcamp_title,
      isNewAccount: !!registration.temp_password,
      tempPassword: registration.temp_password || undefined,
      amountPaid: amountDue,
    });
  }

  // ── Initiate: validate, create the account, then either finish (free) or pay ──
  if (!body.full_name?.trim() || !body.email?.trim()) {
    return Response.json({ error: 'Full name and email are required.' }, { status: 400 });
  }
  if (!body.consent_terms) {
    return Response.json({ error: 'You must agree to the Terms and Conditions to register.' }, { status: 400 });
  }

  const email = body.email.trim().toLowerCase();

  const bootcamp = body.bootcampId
    ? await env.DB.prepare('SELECT id, slug, title, status, price FROM bootcamps WHERE id = ?').bind(body.bootcampId).first<any>()
    : body.slug
      ? await env.DB.prepare('SELECT id, slug, title, status, price FROM bootcamps WHERE slug = ?').bind(body.slug).first<any>()
      : null;

  if (!bootcamp) {
    return Response.json({ error: 'Bootcamp not found.' }, { status: 404 });
  }
  if (bootcamp.status !== 'open') {
    return Response.json({ error: 'Registration for this bootcamp is closed.' }, { status: 400 });
  }

  const fee = roundCurrency(Math.max(0, Number(bootcamp.price || 0)));

  // Find or create the bootcamp account.
  let userId: number;
  let isNewAccount = false;
  let tempPassword = '';
  const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first<{ id: number }>();

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

  // Free bootcamp → finalize immediately, exactly as before.
  if (fee <= 0) {
    await upsertRegistration(env, {
      userId, bootcampId: bootcamp.id, body, email, tempPassword,
      registrationStatus: 'active', paymentStatus: 'free', paymentRef: '', amountDue: 0,
    });
    await activateEnrollment(env, bootcamp.id, userId, 0);
    return Response.json(
      {
        message: `Welcome to ${bootcamp.title}! Your registration is complete.`,
        email,
        bootcampSlug: bootcamp.slug,
        bootcampTitle: bootcamp.title,
        isNewAccount,
        tempPassword: isNewAccount ? tempPassword : undefined,
        requiresPayment: false,
      },
      { status: 201 },
    );
  }

  // Paid bootcamp → store a pending registration and hand off to Flutterwave.
  const secret = resolveStudentFlutterwaveSecret(env);
  if (!secret) {
    return Response.json({ error: 'Payment gateway is not configured. Please contact support.' }, { status: 503 });
  }

  const transactionRef = `bootcamp-reg-${bootcamp.id}-${userId}-${Date.now()}`;
  await upsertRegistration(env, {
    userId, bootcampId: bootcamp.id, body, email, tempPassword,
    registrationStatus: 'pending_payment', paymentStatus: 'unpaid', paymentRef: transactionRef, amountDue: fee,
  });

  try {
    const paymentUrl = await initializeFlutterwavePayment({
      secret,
      origin: resolvePaymentOrigin(request),
      transactionRef,
      amount: fee,
      slug: bootcamp.slug,
      bootcampTitle: bootcamp.title,
      user: { email, name: body.full_name.trim() },
    });

    return Response.json(
      {
        message: 'Redirecting you to secure payment...',
        email,
        bootcampSlug: bootcamp.slug,
        bootcampTitle: bootcamp.title,
        isNewAccount,
        requiresPayment: true,
        amount: fee,
        transactionRef,
        payment_url: paymentUrl,
        paymentGateway: FLUTTERWAVE_PAYMENT_GATEWAY,
      },
      { status: 201 },
    );
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Failed to start payment.' }, { status: 503 });
  }
};
