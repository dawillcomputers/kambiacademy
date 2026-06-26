import React, { useEffect, useState } from 'react';
import { api } from '../../../../lib/api';

interface ContactReply {
  id: number;
  submission_id: number;
  body: string;
  emailed: number;
  email_error: string | null;
  created_by: string | null;
  created_at: string;
}

interface ContactMessage {
  id: number;
  name: string;
  email: string;
  company: string;
  topic: string;
  message: string;
  status: 'new' | 'replied' | 'resolved';
  created_at: string;
  replied_at: string | null;
  replies: ContactReply[];
}

const statusBadge: Record<string, string> = {
  new: 'border border-amber-400/30 bg-amber-500/15 text-amber-200',
  replied: 'border border-indigo-400/30 bg-indigo-500/15 text-indigo-100',
  resolved: 'border border-emerald-400/30 bg-emerald-500/15 text-emerald-200',
};

const formatDateTime = (value?: string | null) => (value ? new Date(value).toLocaleString() : '—');

export default function SuperAdminMessagesPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [stats, setStats] = useState<{ newCount: number; total: number }>({ newCount: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [openId, setOpenId] = useState<number | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({});
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.listContactMessages();
      setMessages(res.submissions || []);
      setStats(res.stats || { newCount: 0, total: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const sendReply = async (id: number) => {
    const text = (replyDrafts[id] || '').trim();
    if (!text) {
      setError('Write a reply before sending.');
      return;
    }
    setError('');
    setNotice('');
    setBusyId(id);
    try {
      const res = await api.replyContactMessage(id, text);
      setReplyDrafts((prev) => ({ ...prev, [id]: '' }));
      setNotice(res.emailSent ? 'Reply sent and emailed to the sender.' : `Reply saved. Email not sent: ${res.emailError || 'no email provider configured.'}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reply.');
    } finally {
      setBusyId(null);
    }
  };

  const setStatus = async (id: number, status: 'new' | 'replied' | 'resolved') => {
    setBusyId(id);
    setError('');
    try {
      await api.updateContactMessageStatus(id, status);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <section className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.24),transparent_28%),linear-gradient(135deg,#111b2e,#0b1220_60%,#111827)] px-6 py-8 shadow-2xl shadow-black/30">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#A9B4CC]">Support</p>
        <h1 className="mt-3 text-4xl font-bold text-[#EAF0FF]">Contact messages</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[#A9B4CC]">
          Messages submitted from the website contact page. Reply here — a copy is emailed to the sender, and the thread is kept for your records.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <span className="rounded-full border border-amber-400/30 bg-amber-500/15 px-4 py-2 text-sm font-semibold text-amber-100">{stats.newCount} new</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-[#EAF0FF]">{stats.total} total</span>
        </div>
      </section>

      {notice && <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-100">{notice}</div>}
      {error && <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-200">{error}</div>}

      {loading ? (
        <div className="rounded-[28px] border border-white/10 bg-[#111B2E] px-6 py-10 text-sm text-[#A9B4CC] shadow-lg">Loading messages…</div>
      ) : messages.length === 0 ? (
        <div className="rounded-[28px] border border-white/10 bg-[#111B2E] px-6 py-10 text-center text-sm text-[#A9B4CC] shadow-lg">No contact messages yet.</div>
      ) : (
        <div className="space-y-4">
          {messages.map((m) => {
            const isOpen = openId === m.id;
            return (
              <section key={m.id} className="rounded-[24px] border border-white/10 bg-[#111B2E] shadow-lg shadow-black/20">
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : m.id)}
                  className="flex w-full flex-col gap-2 px-6 py-5 text-left sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-semibold text-[#EAF0FF]">{m.name}</span>
                      <span className={`rounded-full px-3 py-0.5 text-xs font-semibold uppercase tracking-wide ${statusBadge[m.status] || statusBadge.new}`}>{m.status}</span>
                    </div>
                    <p className="mt-1 truncate text-sm text-[#A9B4CC]">{m.email}{m.topic ? ` · ${m.topic}` : ''}</p>
                    {!isOpen && <p className="mt-1 line-clamp-1 text-sm text-[#A9B4CC]/80">{m.message}</p>}
                  </div>
                  <span className="shrink-0 text-xs text-[#6B7A99]">{formatDateTime(m.created_at)}</span>
                </button>

                {isOpen && (
                  <div className="space-y-5 border-t border-white/10 px-6 py-5">
                    <div className="rounded-2xl border border-white/10 bg-[#16233A] px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B7A99]">Message</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[#EAF0FF]">{m.message}</p>
                    </div>

                    {m.replies.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B7A99]">Replies</p>
                        {m.replies.map((r) => (
                          <div key={r.id} className="rounded-2xl border border-indigo-400/20 bg-indigo-500/10 px-4 py-3">
                            <p className="whitespace-pre-wrap text-sm leading-7 text-[#EAF0FF]">{r.body}</p>
                            <p className="mt-2 text-xs text-[#6B7A99]">
                              {r.created_by || 'Staff'} · {formatDateTime(r.created_at)} · {r.emailed ? 'emailed ✓' : `not emailed${r.email_error ? ` (${r.email_error})` : ''}`}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    <div>
                      <label className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B7A99]">Reply</label>
                      <textarea
                        rows={4}
                        value={replyDrafts[m.id] || ''}
                        onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [m.id]: e.target.value }))}
                        placeholder={`Reply to ${m.name}…`}
                        className="mt-1 w-full rounded-2xl border border-white/10 bg-[#0F172A] px-4 py-3 text-sm text-[#EAF0FF] placeholder:text-[#6B7A99] focus:border-indigo-400/40 focus:outline-none"
                      />
                      <div className="mt-3 flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => sendReply(m.id)}
                          disabled={busyId === m.id}
                          className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
                        >
                          {busyId === m.id ? 'Sending…' : 'Send reply'}
                        </button>
                        {m.status !== 'resolved' ? (
                          <button
                            type="button"
                            onClick={() => setStatus(m.id, 'resolved')}
                            disabled={busyId === m.id}
                            className="rounded-xl border border-emerald-400/30 bg-emerald-500/15 px-5 py-2.5 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/20 disabled:opacity-60"
                          >
                            Mark resolved
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setStatus(m.id, 'new')}
                            disabled={busyId === m.id}
                            className="rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-[#EAF0FF] transition hover:bg-white/10 disabled:opacity-60"
                          >
                            Reopen
                          </button>
                        )}
                        <a
                          href={`mailto:${m.email}?subject=${encodeURIComponent('Re: ' + (m.topic || 'Your message to Kambi Academy'))}`}
                          className="rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-[#EAF0FF] transition hover:bg-white/10"
                        >
                          Open in mail app
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
