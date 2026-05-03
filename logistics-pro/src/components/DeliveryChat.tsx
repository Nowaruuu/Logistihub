import React, { useEffect, useState, useRef } from 'react';
import { X, Send, Phone, MessageCircle, ArrowLeft } from 'lucide-react';
import { getChatMessages, sendChatMessage, getChatContact } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';

interface DeliveryChatProps {
  deliveryNumber: string;
  onClose: () => void;
}

export default function DeliveryChat({ deliveryNumber, onClose }: DeliveryChatProps) {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [chatEnabled, setChatEnabled] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [contactInfo, setContactInfo] = useState<{ phone: string | null; name: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const myType = profile?.role === 'driver' ? 'driver' : 'user';

  const fetchMessages = async () => {
    try {
      const data = await getChatMessages(deliveryNumber);
      setMessages(data.messages || []);
      setChatEnabled(data.chat_enabled ?? false);
    } catch (err) {
      console.error('Failed to fetch chat:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchContact = async () => {
    try {
      const data = await getChatContact(deliveryNumber);
      setContactInfo(data);
    } catch {}
  };

  useEffect(() => {
    fetchMessages();
    fetchContact();
    const interval = setInterval(fetchMessages, 4000);
    return () => clearInterval(interval);
  }, [deliveryNumber]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;
    setSending(true);
    try {
      await sendChatMessage(deliveryNumber, newMessage.trim());
      setNewMessage('');
      await fetchMessages();
      inputRef.current?.focus();
    } catch (err) {
      console.error('Send failed:', err);
    } finally {
      setSending(false);
    }
  };

  const handleCall = () => {
    if (contactInfo?.phone) {
      window.location.href = `tel:${contactInfo.phone}`;
    } else {
      alert('Phone number is not available.');
    }
  };

  const getTimeStr = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
  };

  const otherName = contactInfo?.name || (myType === 'driver' ? 'Customer' : 'Driver');

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-4 py-3 flex items-center gap-3 shadow-sm">
        <button onClick={onClose} className="size-9 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <ArrowLeft className="size-5 text-slate-600 dark:text-slate-400" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate">{otherName}</h2>
          <p className="text-[10px] text-slate-400 font-mono tracking-wider">#{deliveryNumber}</p>
        </div>
        <button
          onClick={handleCall}
          className="size-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 active:scale-95 transition-transform"
        >
          <Phone className="size-4" />
        </button>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="size-10 rounded-full border-4 border-orange-600 border-t-transparent animate-spin" />
            <p className="text-slate-400 text-xs">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className="size-16 rounded-full bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center">
              <MessageCircle className="size-8 text-orange-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">No messages yet</p>
              <p className="text-xs text-slate-400 mt-1">Send a message to start the conversation</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex justify-center">
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full uppercase tracking-wider">
                Temporary delivery chat
              </span>
            </div>
            {messages.map((msg) => {
              const isMine = msg.sender_type === myType;
              return (
                <div key={msg.chat_id} className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
                  <div className={cn(
                    'max-w-[75%] px-4 py-2.5 rounded-2xl shadow-sm',
                    isMine
                      ? 'bg-orange-600 text-white rounded-br-md'
                      : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-100 dark:border-slate-700 rounded-bl-md'
                  )}>
                    <p className="text-sm leading-relaxed break-words">{msg.message}</p>
                    <p className={cn(
                      'text-[9px] mt-1 text-right font-medium',
                      isMine ? 'text-white/60' : 'text-slate-400'
                    )}>
                      {getTimeStr(msg.created_at)}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input area */}
      {chatEnabled ? (
        <div className="bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 px-4 py-3 pb-safe">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
              placeholder="Type a message..."
              className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
              autoFocus
            />
            <button
              onClick={handleSend}
              disabled={!newMessage.trim() || sending}
              className="size-12 rounded-2xl bg-orange-600 text-white flex items-center justify-center disabled:opacity-40 active:scale-95 transition-all shadow-lg shadow-orange-600/20"
            >
              <Send className="size-5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-slate-100 dark:bg-slate-800 px-4 py-4 text-center">
          <p className="text-sm text-slate-500 font-medium">Chat is no longer available for this delivery</p>
        </div>
      )}
    </div>
  );
}
