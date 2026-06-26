// Lightweight outbound email helper for Cloudflare Pages Functions.
//
// Cloudflare Email Routing (used for support@kambiacademy.com) only *receives*
// mail, so replying to a visitor's address needs an outbound provider. This
// helper sends through Resend when configured and falls back to MailChannels.
// If neither is configured it returns { sent: false } without throwing, so the
// in-app inbox keeps working before email credentials are wired up.

export interface EmailEnv {
  RESEND_API_KEY?: string;
  CONTACT_FROM_EMAIL?: string;   // e.g. "Kambi Academy <support@kambiacademy.com>"
  CONTACT_FROM_NAME?: string;
  MAILCHANNELS_DKIM_DOMAIN?: string;
  MAILCHANNELS_DKIM_SELECTOR?: string;
  MAILCHANNELS_DKIM_PRIVATE_KEY?: string;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}

export interface SendEmailResult {
  sent: boolean;
  provider?: 'resend' | 'mailchannels';
  error?: string;
}

const DEFAULT_FROM = 'Kambi Academy <support@kambiacademy.com>';

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

export const textToHtml = (value: string) =>
  `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.6;color:#0f172a">${escapeHtml(value).replace(/\n/g, '<br/>')}</div>`;

async function sendViaResend(env: EmailEnv, opts: SendEmailOptions, from: string): Promise<SendEmailResult> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [opts.to],
      subject: opts.subject,
      text: opts.text,
      html: opts.html || textToHtml(opts.text),
      ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    return { sent: false, provider: 'resend', error: `Resend ${response.status}: ${detail.slice(0, 300)}` };
  }

  return { sent: true, provider: 'resend' };
}

async function sendViaMailChannels(env: EmailEnv, opts: SendEmailOptions, from: string): Promise<SendEmailResult> {
  // Parse "Name <email>" or plain "email".
  const match = from.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  const fromEmail = (match ? match[2] : from).trim();
  const fromName = match ? match[1].trim() : (env.CONTACT_FROM_NAME || 'Kambi Academy');

  const dkim = env.MAILCHANNELS_DKIM_DOMAIN && env.MAILCHANNELS_DKIM_SELECTOR && env.MAILCHANNELS_DKIM_PRIVATE_KEY
    ? {
        dkim_domain: env.MAILCHANNELS_DKIM_DOMAIN,
        dkim_selector: env.MAILCHANNELS_DKIM_SELECTOR,
        dkim_private_key: env.MAILCHANNELS_DKIM_PRIVATE_KEY,
      }
    : {};

  const response = await fetch('https://api.mailchannels.net/tx/v1/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: opts.to }], ...dkim }],
      from: { email: fromEmail, name: fromName },
      ...(opts.replyTo ? { reply_to: { email: opts.replyTo } } : {}),
      subject: opts.subject,
      content: [
        { type: 'text/plain', value: opts.text },
        { type: 'text/html', value: opts.html || textToHtml(opts.text) },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    return { sent: false, provider: 'mailchannels', error: `MailChannels ${response.status}: ${detail.slice(0, 300)}` };
  }

  return { sent: true, provider: 'mailchannels' };
}

export async function sendEmail(env: EmailEnv, opts: SendEmailOptions): Promise<SendEmailResult> {
  if (!opts.to || !isValidEmail(opts.to)) {
    return { sent: false, error: 'Recipient email is invalid.' };
  }

  const from = env.CONTACT_FROM_EMAIL || DEFAULT_FROM;

  try {
    if (env.RESEND_API_KEY) {
      return await sendViaResend(env, opts, from);
    }
    if (env.MAILCHANNELS_DKIM_DOMAIN) {
      return await sendViaMailChannels(env, opts, from);
    }
    return { sent: false, error: 'No email provider configured (set RESEND_API_KEY or MailChannels DKIM secrets).' };
  } catch (error) {
    return { sent: false, error: error instanceof Error ? error.message : 'Email send failed.' };
  }
}
