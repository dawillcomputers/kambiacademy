import { getAuthUser } from '../../_shared/auth';
import { getBillingCurrencyConfig, toChargeAmount } from '../../_shared/billingConfig';

interface Env {
  DB: D1Database;
  FLUTTERWAVE_STUDENT_SECRET_KEY?: string;
  FLUTTERWAVE_SECRET_KEY?: string;
}

const PRODUCTION_SITE_ORIGIN = 'https://kambiacademy.com';
const PAYMENT_OPTIONS = 'banktransfer,card,ussd';
const isSuccess = (s?: string | null) => ['success', 'successful', 'completed'].includes(String(s || '').toLowerCase());

const getSecret = (env: Env) => env.FLUTTERWAVE_STUDENT_SECRET_KEY || env.FLUTTERWAVE_SECRET_KEY;

function resolveOrigin(request: Request) {
  const u = new URL(request.url);
  const host = u.hostname.toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1' || host === '[::1]') {
    return (request.headers.get('origin') || u.origin).replace(/\/$/, '');
  }
  return PRODUCTION_SITE_ORIGIN;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json<any>().catch(() => null);
  if (!body) return Response.json({ error: 'Invalid request body' }, { status: 400 });

  const secret = getSecret(env);

  // ---- Verify a returned payment ----
  if (body.action === 'verify') {
    const transactionRef = String(body.transaction_ref || '');
    if (!transactionRef) return Response.json({ error: 'transaction_ref is required.' }, { status: 400 });

    const purchase = await env.DB.prepare(
      'SELECT * FROM book_purchases WHERE transaction_ref = ? AND user_id = ?',
    ).bind(transactionRef, user.id).first<any>();
    if (!purchase) return Response.json({ error: 'Purchase not found.' }, { status: 404 });

    if (purchase.status === 'success') {
      return Response.json({ status: 'success', message: 'Already purchased.', bookId: purchase.book_id });
    }

    let verified = false;
    if (isSuccess(body.status) && secret) {
      try {
        const verifyUrl = body.flutterwaveTransactionId
          ? `https://api.flutterwave.com/v3/transactions/${body.flutterwaveTransactionId}/verify`
          : `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(transactionRef)}`;
        const res = await fetch(verifyUrl, { headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' } });
        const payload = await res.json().catch(() => null) as any;
        const tx = Array.isArray(payload?.data) ? payload.data[0] : payload?.data;
        const expected = Number(purchase.charged_amount ?? purchase.amount);
        verified = payload?.status === 'success'
          && isSuccess(tx?.status)
          && tx?.tx_ref === transactionRef
          && Math.abs(Number(tx?.amount ?? 0) - expected) < 1;
      } catch {
        verified = false;
      }
    }

    const now = new Date().toISOString();
    await env.DB.prepare('UPDATE book_purchases SET status = ?, paid_at = ?, flutterwave_tx_id = ? WHERE id = ?')
      .bind(verified ? 'success' : 'failed', verified ? now : null, body.flutterwaveTransactionId || null, purchase.id)
      .run();

    return Response.json({
      status: verified ? 'success' : 'failed',
      bookId: purchase.book_id,
      message: verified ? 'Purchase confirmed. The book is now in your library.' : 'Payment could not be verified.',
    });
  }

  // ---- Start a checkout ----
  const bookId = Number(body.bookId);
  if (!bookId) return Response.json({ error: 'bookId is required.' }, { status: 400 });

  const book = await env.DB.prepare('SELECT * FROM books WHERE id = ? AND published = 1').bind(bookId).first<any>();
  if (!book) return Response.json({ error: 'Book not found.' }, { status: 404 });
  if (Number(book.price) <= 0) return Response.json({ error: 'This book is free — no purchase needed.' }, { status: 400 });

  const alreadyOwned = await env.DB.prepare(
    "SELECT id FROM book_purchases WHERE book_id = ? AND user_id = ? AND status = 'success' LIMIT 1",
  ).bind(bookId, user.id).first();
  if (alreadyOwned) return Response.json({ error: 'You already own this book.' }, { status: 400 });

  if (!secret) return Response.json({ error: 'Payment gateway is not configured.' }, { status: 503 });

  const cfg = await getBillingCurrencyConfig(env.DB);
  const usdAmount = Number(book.price);
  const chargeAmount = toChargeAmount(usdAmount, cfg);
  const transactionRef = `book-${bookId}-${user.id}-${crypto.randomUUID()}`;
  const origin = resolveOrigin(request);

  await env.DB.prepare(
    `INSERT INTO book_purchases (book_id, user_id, amount, charged_amount, charged_currency, status, transaction_ref)
     VALUES (?,?,?,?,?,'pending',?)`,
  ).bind(bookId, user.id, usdAmount, chargeAmount, cfg.currency, transactionRef).run();

  const redirectQuery = new URLSearchParams({ book_tx: transactionRef, book_id: String(bookId) }).toString();
  const res = await fetch('https://api.flutterwave.com/v3/payments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tx_ref: transactionRef,
      amount: chargeAmount,
      currency: cfg.currency,
      payment_options: PAYMENT_OPTIONS,
      redirect_url: `${origin}/library?${redirectQuery}`,
      customer: { email: user.email, name: user.name },
      customizations: { title: 'Kambi Academy Library', description: `Purchase: ${book.title}` },
    }),
  });
  const data = await res.json().catch(() => null) as any;
  if (!res.ok || !data?.data?.link) {
    return Response.json({ error: data?.message || 'Failed to start payment.' }, { status: 502 });
  }

  return Response.json({ payment_url: data.data.link, transactionRef }, { status: 201 });
};
