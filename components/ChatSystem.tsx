import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface Message {
  id: string;
  text: string;
  userId: string;
  userName: string;
  timestamp: Date;
  roomId?: string;
}

interface ChatSystemProps {
  roomId: string;
  currentUser: {
    id: string;
    name: string;
  };
  className?: string;
}

export default function ChatSystem({ roomId, currentUser, className = '' }: ChatSystemProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Connect to Socket.io server
    const socketUrl = import.meta.env.VITE_SOCKET_URL || window.location.origin;
    const socket = io(socketUrl, {
      query: { roomId, userId: currentUser.id, userName: currentUser.name }
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('message', (message: Message) => {
      setMessages(prev => [...prev, {
        ...message,
        timestamp: new Date(message.timestamp)
      }]);
    });

    socket.on('userJoined', (userName: string) => {
      setOnlineUsers(prev => [...prev, userName]);
      setMessages(prev => [...prev, {
        id: `system-${Date.now()}`,
        text: `${userName} joined the chat`,
        userId: 'system',
        userName: 'System',
        timestamp: new Date(),
        roomId
      }]);
    });

    socket.on('userLeft', (userName: string) => {
      setOnlineUsers(prev => prev.filter(name => name !== userName));
      setMessages(prev => [...prev, {
        id: `system-${Date.now()}`,
        text: `${userName} left the chat`,
        userId: 'system',
        userName: 'System',
        timestamp: new Date(),
        roomId
      }]);
    });

    socket.on('onlineUsers', (users: string[]) => {
      setOnlineUsers(users);
    });

    return () => {
      socket.disconnect();
    };
  }, [roomId, currentUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !socketRef.current) return;

    const message: Message = {
      id: `msg-${Date.now()}`,
      text: inputText.trim(),
      userId: currentUser.id,
      userName: currentUser.name,
      timestamp: new Date(),
      roomId
    };

    socketRef.current.emit('sendMessage', message);
    setMessages(prev => [...prev, message]);
    setInputText('');
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm flex flex-col ${className}`}>
      {/* Header */}
      <div className="p-4 bg-white/10 border-b border-white/10 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <h3 className="font-semibold">Live Chat</h3>
        </div>
        <div className="text-sm text-white/70">
          {onlineUsers.length} online
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-white/50 py-8">
            <div className="text-4xl mb-2">💬</div>
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.userId === currentUser.id ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                  message.userId === 'system'
                    ? 'bg-gray-500/20 text-gray-300 text-center text-sm'
                    : message.userId === currentUser.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white/10 text-white'
                }`}
              >
                {message.userId !== 'system' && message.userId !== currentUser.id && (
                  <div className="text-xs text-white/70 mb-1">{message.userName}</div>
                )}
                <div className="text-sm">{message.text}</div>
                <div className="text-xs text-white/50 mt-1">
                  {formatTime(message.timestamp)}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="p-4 border-t border-white/10">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white placeholder-white/50 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            disabled={!isConnected}
          />
          <button
            type="submit"
            disabled={!inputText.trim() || !isConnected}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 rounded-xl font-semibold transition-colors"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}