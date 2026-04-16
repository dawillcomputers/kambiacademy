import React, { useState, useEffect, useRef } from 'react';

interface Attachment {
  type: 'image' | 'audio';
  name: string;
  size: number;
  data: string;
}

interface Message {
  id: string;
  text?: string;
  userId: string;
  userName: string;
  timestamp: Date;
  roomId?: string;
  attachment?: Attachment;
}

interface ChatSystemProps {
  roomId: string;
  currentUser: {
    id: string;
    name: string;
  };
  className?: string;
}

const availableContacts = [
  { id: 'tutor-1', name: 'Dr. Evelyn Reed', role: 'Lead Instructor', online: true },
  { id: 'support-1', name: 'Support Desk', role: 'Student Support', online: true },
  { id: 'group-1', name: 'Class Group', role: 'Course Room', online: false },
];

const emojiOptions = ['😀', '👍', '🎉', '❤️', '😅', '🤔', '🚀', '✨', '😎'];

export default function ChatSystem({ roomId, currentUser, className = '' }: ChatSystemProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedContact, setSelectedContact] = useState(availableContacts[0].id);
  const [showEmojiDrawer, setShowEmojiDrawer] = useState(false);
  const [showError, setShowError] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastMessageIdRef = useRef<string>('0');
  const recordingRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const selectedContactInfo = availableContacts.find(contact => contact.id === selectedContact);
  const threadId = `${roomId}_${selectedContact}`;

  const fileToDataURL = (file: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const resetError = () => setShowError('');

  useEffect(() => {
    setMessages([]);
    lastMessageIdRef.current = '0';
  }, [threadId]);

  useEffect(() => {
    const pollMessages = async () => {
      try {
        const response = await fetch(`/api/chat-messages?roomId=${encodeURIComponent(threadId)}&after=${lastMessageIdRef.current}`);
        if (response.ok) {
          const data = (await response.json()) as { messages?: any[] };
          if (data.messages && data.messages.length > 0) {
            const newMessages = data.messages.map((msg: any) => ({
              ...msg,
              timestamp: new Date(msg.timestamp),
            }));
            setMessages(prev => [...prev, ...newMessages]);
            lastMessageIdRef.current = data.messages[data.messages.length - 1].id;
          }
        }
      } catch (error) {
        console.error('Error polling messages:', error);
      }
    };

    pollMessages();
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    pollingIntervalRef.current = setInterval(pollMessages, 2000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [threadId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    return () => {
      recordingRef.current?.stop();
      mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, []);

  const sendChatPayload = async (payload: { text?: string; attachment?: Attachment }) => {
    resetError();
    if (!payload.text?.trim() && !payload.attachment) {
      return;
    }

    try {
      const response = await fetch('/api/chat-messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId: threadId,
          text: payload.text?.trim() ?? '',
          userId: currentUser.id,
          userName: currentUser.name,
          attachment: payload.attachment,
        }),
      });

      if (response.ok) {
        setInputText('');
        const data = (await response.json()) as { message?: any };
        if (data.message) {
          const message = {
            ...data.message,
            timestamp: new Date(data.message.timestamp),
          };
          setMessages(prev => [...prev, message]);
          lastMessageIdRef.current = message.id;
        }
      } else {
        const errorData = (await response.json().catch(() => null)) as { error?: string } | null;
        setShowError(errorData?.error ?? 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setShowError('Unable to send message');
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendChatPayload({ text: inputText });
  };

  const validateFile = (file: File | Blob, type: string, size: number) => {
    if (!type.startsWith('image/') && !type.startsWith('audio/')) {
      return 'Only image and audio files are allowed.';
    }
    if (size > 2 * 1024 * 1024) {
      return 'Files must be smaller than 2MB.';
    }
    return '';
  };

  const handleFileUpload = async (file: File) => {
    resetError();
    const error = validateFile(file, file.type, file.size);
    if (error) {
      setShowError(error);
      return;
    }

    const data = await fileToDataURL(file);
    await sendChatPayload({
      attachment: {
        type: file.type.startsWith('image/') ? 'image' : 'audio',
        name: file.name,
        size: file.size,
        data,
      },
    });
  };

  const handleFileInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await handleFileUpload(file);
    event.target.value = '';
  };

  const handleToggleRecording = async () => {
    resetError();
    if (isRecording) {
      recordingRef.current?.stop();
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setShowError('Audio recording is not supported in this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        setIsRecording(false);
        if (blob.size > 2 * 1024 * 1024) {
          setShowError('Recorded audio exceeds 2MB. Please record a shorter message.');
          return;
        }
        const data = await fileToDataURL(blob);
        await sendChatPayload({
          attachment: {
            type: 'audio',
            name: `voice-note.${blob.type.split('/')[1] || 'webm'}`,
            size: blob.size,
            data,
          },
        });
      };

      recorder.start();
      recordingRef.current = recorder;
      setIsRecording(true);
    } catch (error) {
      console.error('Recording error:', error);
      setShowError('Unable to access microphone. Please allow audio recording.');
    }
  };

  const insertEmoji = (emoji: string) => {
    setInputText((prev) => `${prev}${emoji}`);
    setShowEmojiDrawer(false);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex h-full ${className}`}>
      <aside className="hidden lg:flex w-72 flex-col border-r border-slate-200 bg-slate-50">
        <div className="px-4 py-5 border-b border-slate-200">
          <h2 className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Contacts</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {availableContacts.map(contact => (
            <button
              key={contact.id}
              type="button"
              onClick={() => setSelectedContact(contact.id)}
              className={`w-full text-left rounded-3xl px-4 py-4 transition ${
                contact.id === selectedContact
                  ? 'bg-sky-600 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100'
              }`}>
              <div className="flex items-center justify-between">
                <span className="font-semibold">{contact.name}</span>
                <span className={`h-2.5 w-2.5 rounded-full ${contact.online ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              </div>
              <p className="mt-1 text-xs text-slate-500">{contact.role}</p>
            </button>
          ))}
        </div>
      </aside>

      <div className="flex-1 flex flex-col">
        <div className="px-4 py-4 border-b border-slate-200 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className={`h-2.5 w-2.5 rounded-full ${selectedContactInfo?.online ? 'bg-emerald-500' : 'bg-slate-400'}`} />
            <div>
              <p className="text-sm font-semibold text-slate-900">{selectedContactInfo?.name ?? 'Live Chat'}</p>
              <p className="text-xs text-slate-500">{selectedContactInfo?.role ?? 'Chat thread'}</p>
            </div>
          </div>
          <div className="text-xs text-slate-500">{selectedContactInfo?.online ? 'Online' : 'Offline'}</div>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          <div className="flex h-full min-h-0">
            <div className="flex-1 flex flex-col min-h-0">
              <div className="p-4 overflow-y-auto flex-1 min-h-0 space-y-4 bg-slate-50">
                {messages.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="text-5xl mb-4">💬</div>
                    <p className="text-lg font-semibold text-slate-900">No messages yet</p>
                    <p className="text-sm text-slate-500">Select a contact and start the conversation.</p>
                  </div>
                ) : (
                  messages.map(message => (
                    <div
                      key={message.id}
                      className={`flex ${message.userId === currentUser.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-xl px-4 py-3 rounded-3xl shadow-sm ${
                        message.userId === 'system'
                          ? 'bg-slate-200 text-slate-700'
                          : message.userId === currentUser.id
                          ? 'bg-sky-200 text-slate-900'
                          : 'bg-white text-slate-900 border border-slate-200'
                      }`}>
                        {message.userId !== 'system' && message.userId !== currentUser.id && (
                          <div className="text-xs text-slate-500 mb-1">{message.userName}</div>
                        )}
                        {message.text && <div className="text-sm leading-snug">{message.text}</div>}
                        {message.attachment && message.attachment.type === 'image' && (
                          <img
                            src={message.attachment.data}
                            alt={message.attachment.name}
                            className="mt-3 max-h-72 w-full rounded-2xl object-contain"
                          />
                        )}
                        {message.attachment && message.attachment.type === 'audio' && (
                          <div className="mt-3">
                            <audio controls src={message.attachment.data} className="w-full" />
                            <p className="mt-2 text-xs text-slate-500">{message.attachment.name}</p>
                          </div>
                        )}
                        <div className="text-xs text-slate-500 mt-2 text-right">{formatTime(message.timestamp)}</div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 py-4 border-t border-slate-200 bg-white">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowEmojiDrawer(!showEmojiDrawer)}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 px-4 py-2 text-slate-700 hover:bg-slate-200"
                aria-label="Add emoji"
              >
                😀
              </button>
              {showEmojiDrawer && (
                <div className="flex flex-wrap gap-2 rounded-3xl border border-slate-200 bg-slate-50 p-3">
                  {emojiOptions.map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => insertEmoji(emoji)}
                      className="rounded-2xl px-3 py-2 text-lg hover:bg-slate-100"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <form onSubmit={sendMessage} className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-slate-700 hover:bg-slate-200"
                  aria-label="Attach file"
                >
                  📎
                </button>
                <button
                  type="button"
                  onClick={handleToggleRecording}
                  className={`inline-flex items-center justify-center rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium transition ${
                    isRecording ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {isRecording ? 'Stop Rec' : '🎙️'}
                </button>
              </div>
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="inline-flex items-center justify-center rounded-2xl bg-sky-600 px-6 py-3 text-sm font-semibold uppercase text-white transition hover:bg-sky-700 disabled:bg-slate-300 disabled:text-slate-500"
              >
                SEND
              </button>
            </form>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*,audio/*"
              onChange={handleFileInputChange}
            />
            {showError && <p className="text-sm text-rose-600">{showError}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
