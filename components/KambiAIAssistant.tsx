import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

type AssistantMessage = {
  id: string;
  role: 'assistant' | 'user';
  content: string;
};

const suggestionMap: Record<string, string[]> = {
  student: [
    'Recommend the best next course for me',
    'Help me plan my weekly study time',
    'Explain how payment verification works',
  ],
  teacher: [
    'How do I unlock automatic payouts?',
    'Suggest an AI course idea I can teach',
    'Show me how to improve my class setup',
  ],
  admin: [
    'Summarize today\'s platform activity',
    'What should I review first?',
    'Give me a revenue snapshot',
  ],
  super_admin: [
    'Summarize payout blockers for teachers',
    'Give me a revenue snapshot',
    'Show system status',
  ],
  SOU: [
    'Summarize payout blockers for teachers',
    'Give me a revenue snapshot',
    'Show system status',
  ],
};

const welcomeByRole = (role?: string) => {
  if (role === 'teacher' || role === 'tutor') {
    return 'Kambi AI can help with course ideas, student communication, billing guidance, and payout readiness.';
  }

  if (role === 'student') {
    return 'Kambi AI can help you choose courses, plan study time, and understand enrollment or payment steps.';
  }

  if (role === 'admin' || role === 'super_admin' || role === 'SOU') {
    return 'Kambi AI can summarize platform activity, finance health, payout blockers, and admin workflows.';
  }

  return 'Kambi AI is ready to help with your Kambi Academy workflow.';
};

const extractAssistantReply = (payload: any) => {
  if (typeof payload?.result === 'string' && payload.result.trim()) {
    return payload.result.trim();
  }

  if (typeof payload?.message === 'string' && payload.message.trim()) {
    return payload.message.trim();
  }

  if (Array.isArray(payload?.suggestions) && payload.suggestions.length) {
    return payload.suggestions.join('\n');
  }

  return 'I could not generate a helpful response right now.';
};

export default function KambiAIAssistant() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);

  const suggestions = useMemo(() => suggestionMap[user?.role || ''] || suggestionMap.student, [user?.role]);

  useEffect(() => {
    if (!user) {
      setMessages([]);
      return;
    }

    setMessages([
      {
        id: `assistant-welcome-${user.role}`,
        role: 'assistant',
        content: welcomeByRole(user.role),
      },
    ]);
  }, [user?.role]);

  if (!user) {
    return null;
  }

  const sendPrompt = async (prompt: string) => {
    const trimmed = prompt.trim();
    if (!trimmed || isSending) {
      return;
    }

    const nextUserMessage: AssistantMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
    };

    setMessages((current) => [...current, nextUserMessage]);
    setInput('');
    setIsSending(true);

    try {
      const payload = await api.askAssistant(trimmed);
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: extractAssistantReply(payload),
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: `assistant-error-${Date.now()}`,
          role: 'assistant',
          content: error instanceof Error ? error.message : 'Kambi AI is temporarily unavailable.',
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-[70] flex flex-col items-end gap-3">
      {isOpen && (
        <div className="w-[min(380px,calc(100vw-1.5rem))] overflow-hidden rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] shadow-2xl shadow-slate-900/20 backdrop-blur-xl">
          <div className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.18),transparent_42%),linear-gradient(135deg,#0f172a,#1e293b)] px-5 py-4 text-white">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-200">Kambi AI</p>
                <h3 className="mt-2 text-lg font-bold">Assistant for {user.role.replace('_', ' ')}</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-white transition hover:bg-white/20"
              >
                Close
              </button>
            </div>
          </div>

          <div className="max-h-[420px] space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`rounded-3xl px-4 py-3 text-sm leading-6 ${message.role === 'assistant'
                  ? 'mr-8 border border-slate-200 bg-white text-slate-700'
                  : 'ml-8 bg-slate-900 text-white'}`}
              >
                {message.content}
              </div>
            ))}

            {isSending && (
              <div className="mr-8 rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                Thinking through your request...
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 bg-white/90 px-4 py-4">
            <div className="mb-3 flex flex-wrap gap-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => { void sendPrompt(suggestion); }}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            <form
              className="flex items-end gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                void sendPrompt(input);
              }}
            >
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                rows={2}
                placeholder="Ask Kambi AI about courses, billing, payouts, or admin workflows..."
                className="min-h-[80px] flex-1 rounded-3xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              />
              <button
                type="submit"
                disabled={isSending || !input.trim()}
                className="inline-flex h-11 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="group inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-3 shadow-xl shadow-slate-900/20 transition hover:-translate-y-0.5 hover:shadow-2xl"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(135deg,#0f172a,#2563eb)] text-lg text-white shadow-lg shadow-blue-500/30">🤖</span>
        <div className="text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Kambi AI</p>
          <p className="text-sm font-semibold text-slate-900">Open assistant</p>
        </div>
      </button>
    </div>
  );
}