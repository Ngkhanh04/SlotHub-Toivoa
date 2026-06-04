import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import api from '../../api/axios';
import { AuthContext } from '../../context/AuthContext';
import { connectUserSocket, getSocket } from '../../utils/socket';
import {
  MessageSquare, Send, Loader2, Store, Shield, Plus, ChevronLeft, User
} from 'lucide-react';

const timeShort = (d) => {
  if (!d) return '';
  const date = new Date(d);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
};

/**
 * @param {'student'|'vendor'|'admin'} mode
 * @param {'light'|'dark'} theme
 * @param {boolean} compact — giao diện nhỏ gọn (sinh viên), không chiếm full màn hình
 */
const MessagingCenter = ({ mode = 'student', theme = 'light', initialConversationId = null, compact = false }) => {
  const { user } = useContext(AuthContext);
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [activeMeta, setActiveMeta] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [showNewChat, setShowNewChat] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);
  const bottomRef = useRef(null);
  const activeIdRef = useRef(activeId);
  const userIdRef = useRef(null);

  activeIdRef.current = activeId;
  userIdRef.current = user?._id || user?.id || null;

  const isDark = theme === 'dark';
  const panel = isDark ? 'portal-card border border-[var(--portal-border)]' : 'bg-white border-gray-200';
  const textMain = isDark ? 'text-[var(--portal-text)]' : 'text-gray-900';
  const textMuted = isDark ? 'portal-muted' : 'portal-muted';
  const hoverRow = isDark ? 'hover:bg-[var(--portal-surface)]/60' : 'hover:bg-orange-50';
  const activeRow = isDark ? 'bg-[#F27124]/15 border-[#F27124]/40' : 'bg-orange-50 border-orange-200';

  const loadConversations = useCallback(async () => {
    try {
      const res = await api.get('/messages/conversations');
      setConversations(res.data.conversations || []);
      setTotalUnread(res.data.totalUnread || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMessages = useCallback(async (convId) => {
    try {
      const res = await api.get(`/messages/conversations/${convId}/messages`);
      setMessages(res.data.messages || []);
      setActiveMeta(res.data.conversation);
      await api.put(`/messages/conversations/${convId}/read`);
      loadConversations();
    } catch (e) {
      console.error(e);
    }
  }, [loadConversations]);

  useEffect(() => {
    if (initialConversationId) {
      setActiveId(initialConversationId);
    }
  }, [initialConversationId]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    const uid = user?._id || user?.id;
    if (!uid) return;

    const s = connectUserSocket(uid);

    const onUpdate = () => loadConversations();

    const onNewMsg = (payload) => {
      const convId = String(payload?.conversationId || '');
      const msg = payload?.message;
      if (!msg) return;

      const msgId = String(msg._id || '');
      const senderId = String(msg.sender?._id || msg.sender || '');
      const isMine = senderId && senderId === String(userIdRef.current);

      if (convId === String(activeIdRef.current)) {
        // Tin của chính mình đã được thêm từ API response — bỏ qua socket trùng
        if (isMine) return;

        setMessages((prev) => {
          if (msgId && prev.some((m) => String(m._id) === msgId)) return prev;
          return [...prev, msg];
        });
        api.put(`/messages/conversations/${convId}/read`).catch(() => {});
      } else {
        loadConversations();
      }
    };

    s.on('conversation_updated', onUpdate);
    s.on('new_message', onNewMsg);

    return () => {
      s.removeAllListeners('conversation_updated');
      s.removeAllListeners('new_message');
    };
  }, [user, loadConversations]);

  useEffect(() => {
    if (activeId) {
      loadMessages(activeId);
      getSocket().emit('join_conversation', activeId);
    }
  }, [activeId, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (mode === 'student' && showNewChat) {
      api.get('/messages/vendors-for-chat').then((r) => setVendors(r.data || [])).catch(() => {});
    }
  }, [mode, showNewChat]);

  const openConversation = (id) => {
    setActiveId(id);
    setShowNewChat(false);
  };

  const startVendorChat = async (vendorId) => {
    try {
      const res = await api.post('/messages/conversations', { type: 'STUDENT_VENDOR', vendorId });
      const conv = res.data.conversation;
      await loadConversations();
      if (conv?._id) openConversation(conv._id);
    } catch (e) {
      alert(e.response?.data?.message || 'Không mở được chat');
    }
  };

  const startAdminChat = async () => {
    try {
      const res = await api.post('/messages/conversations', { type: 'VENDOR_ADMIN' });
      const conv = res.data.conversation;
      await loadConversations();
      if (conv?._id) openConversation(conv._id);
    } catch (e) {
      alert(e.response?.data?.message || 'Không mở được chat admin');
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !activeId || sending) return;
    setSending(true);
    const text = input.trim();
    setInput('');
    try {
      const res = await api.post(`/messages/conversations/${activeId}/messages`, { body: text });
      const msg = res.data.message;
      setMessages((prev) => {
        const id = String(msg?._id || '');
        if (id && prev.some((m) => String(m._id) === id)) return prev;
        return [...prev, msg];
      });
      loadConversations();
    } catch (e) {
      alert(e.response?.data?.message || 'Gửi thất bại');
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  const shellHeight = compact
    ? 'h-[min(440px,calc(100dvh-11rem))] max-h-[480px]'
    : 'h-[calc(100vh-12rem)] min-h-[520px]';
  const listWidth = compact ? 'lg:w-56' : 'lg:w-80';
  const bubbleMax = compact ? 'max-w-[78%]' : 'max-w-[85%]';

  if (loading) {
    return (
      <div className={`flex justify-center ${compact ? 'py-12' : 'py-20'} ${textMuted}`}>
        <Loader2 className="animate-spin text-[#F27124]" size={compact ? 32 : 40} />
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border overflow-hidden flex flex-col sm:flex-row shadow-lg ${shellHeight} ${panel} ${
        compact ? 'w-full' : ''
      }`}
    >
      {/* Danh sách hội thoại */}
      <div
        className={`w-full ${listWidth} border-b sm:border-b-0 sm:border-r flex flex-col flex-1 sm:flex-none shrink-0 min-h-0 ${
          isDark ? 'border-[var(--portal-border)]' : 'border-gray-200'
        } ${activeId && compact ? 'hidden sm:flex' : 'flex'}`}
      >
        <div className={`${compact ? 'p-3' : 'p-4'} border-b flex items-center justify-between ${isDark ? 'border-[var(--portal-border)]' : 'border-gray-100'}`}>
          <div>
            <h3 className={`font-black flex items-center gap-2 ${compact ? 'text-sm' : ''} ${textMain}`}>
              <MessageSquare size={compact ? 18 : 20} className="text-[#F27124]" /> Tin nhắn
              {totalUnread > 0 && (
                <span className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full">{totalUnread}</span>
              )}
            </h3>
            <p className={`text-xs mt-0.5 ${textMuted}`}>
              {mode === 'student' && 'Chat quầy · báo cáo đơn hàng'}
              {mode === 'vendor' && 'Sinh viên & Ban quản lý'}
              {mode === 'admin' && 'Hỗ trợ chủ quầy'}
            </p>
          </div>
          {mode === 'student' && (
            <button
              type="button"
              onClick={() => setShowNewChat(!showNewChat)}
              className="p-2 rounded-xl bg-[#F27124]/10 text-[#F27124] hover:bg-[#F27124] hover:text-[var(--portal-text)] transition-colors"
              title="Chat quầy mới"
            >
              <Plus size={20} />
            </button>
          )}
          {mode === 'vendor' && (
            <button
              type="button"
              onClick={startAdminChat}
              className="text-[10px] font-bold px-2 py-1.5 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30"
            >
              <Shield size={12} className="inline mr-1" /> Admin
            </button>
          )}
        </div>

        {showNewChat && mode === 'student' && (
          <div className={`p-3 border-b max-h-48 overflow-y-auto ${isDark ? 'border-[var(--portal-border)] bg-[var(--portal-table-head)]' : 'border-gray-100 bg-gray-50'}`}>
            <p className={`text-xs font-bold mb-2 ${textMuted}`}>Chọn quầy để chat / report:</p>
            {vendors.map((v) => (
              <button
                key={v._id}
                type="button"
                onClick={() => startVendorChat(v._id)}
                className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium mb-1 flex items-center gap-2 ${hoverRow} ${textMain}`}
              >
                <Store size={14} className="text-[#F27124] shrink-0" />
                <span className="truncate">{v.name}</span>
                {v.orderedBefore && <span className="text-[9px] text-green-500 font-bold">Đã mua</span>}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {conversations.length === 0 ? (
            <p className={`p-6 text-center text-sm ${textMuted}`}>
              {mode === 'student' ? 'Bấm + để chat với quầy' : mode === 'vendor' ? 'Bấm Admin hoặc chờ SV nhắn' : 'Chờ quầy liên hệ'}
            </p>
          ) : (
            conversations.map((c) => (
              <button
                key={c._id}
                type="button"
                onClick={() => openConversation(c._id)}
                className={`w-full text-left ${compact ? 'p-3' : 'p-4'} border-b transition-colors ${
                  activeId === c._id ? activeRow : hoverRow
                } ${isDark ? 'border-[var(--portal-border)]/80' : 'border-gray-50'}`}
              >
                <div className="flex justify-between gap-2">
                  <p className={`font-bold text-sm truncate ${textMain}`}>{c.title}</p>
                  {c.unreadCount > 0 && (
                    <span className="shrink-0 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center">
                      {c.unreadCount}
                    </span>
                  )}
                </div>
                <p className={`text-xs truncate mt-0.5 ${textMuted}`}>{c.lastMessage || c.subtitle}</p>
                <p className="text-[10px] portal-muted mt-1">{timeShort(c.lastMessageAt)}</p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Khung chat */}
      <div className={`flex-1 flex flex-col min-w-0 min-h-0 ${compact && !activeId ? 'hidden sm:flex' : 'flex'}`}>
        {!activeId ? (
          <div className={`flex-1 flex flex-col items-center justify-center ${textMuted} ${compact ? 'p-6' : 'p-8'}`}>
            <MessageSquare size={compact ? 36 : 48} className="opacity-20 mb-3" />
            <p className={`font-bold text-center ${compact ? 'text-sm' : ''}`}>Chọn quầy để chat</p>
            {compact && mode === 'student' && (
              <p className="text-xs text-center mt-1 max-w-[200px]">Bấm + bên trái hoặc chọn hội thoại</p>
            )}
          </div>
        ) : (
          <>
            <div className={`${compact ? 'p-3' : 'p-4'} border-b flex items-center gap-2 sm:gap-3 shrink-0 ${isDark ? 'border-[var(--portal-border)]' : 'border-gray-100'}`}>
              <button type="button" className="sm:hidden p-1.5 shrink-0" onClick={() => setActiveId(null)}>
                <ChevronLeft size={20} className={textMain} />
              </button>
              <div className={`${compact ? 'w-8 h-8' : 'w-10 h-10'} rounded-full flex items-center justify-center shrink-0 ${isDark ? 'bg-[var(--portal-surface)]' : 'bg-orange-100'}`}>
                {activeMeta?.type === 'VENDOR_ADMIN' ? (
                  <Shield className="text-purple-400" size={20} />
                ) : activeMeta?.avatar ? (
                  <img src={activeMeta.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <User className="text-[#F27124]" size={20} />
                )}
              </div>
              <div className="min-w-0">
                <p className={`font-black truncate ${textMain}`}>{activeMeta?.title}</p>
                <p className={`text-xs truncate ${textMuted}`}>{activeMeta?.subtitle}</p>
              </div>
            </div>

            <div className={`flex-1 overflow-y-auto ${compact ? 'p-3 space-y-2' : 'p-4 space-y-3'} custom-scrollbar min-h-0 ${isDark ? 'bg-[#0f172a]/50' : 'bg-gray-50/80'}`}>
              {messages.map((m) => {
                const mine = String(m.sender?._id || m.sender) === String(user?._id || user?.id);
                const isReport = m.messageType === 'REPORT';
                return (
                  <div key={m._id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`${bubbleMax} ${compact ? 'px-3 py-2 text-[13px]' : 'px-4 py-2.5 text-sm'} rounded-2xl ${
                        mine
                          ? 'bg-gradient-to-r from-[#F27124] to-[#ff985e] text-white rounded-br-md'
                          : isDark
                            ? 'bg-[var(--portal-surface)] text-gray-100 rounded-bl-md border border-[var(--portal-border)]'
                            : 'bg-white text-gray-800 rounded-bl-md border border-gray-200 shadow-sm'
                      } ${isReport ? 'border-2 border-amber-400/50' : ''}`}
                    >
                      {!mine && (
                        <p className={`text-[10px] font-bold mb-1 ${mine ? 'text-orange-100' : 'text-[#F27124]'}`}>
                          {m.sender?.name || 'Người dùng'}
                        </p>
                      )}
                      {isReport && <p className="text-[10px] font-black uppercase opacity-80 mb-1">📋 Khiếu nại</p>}
                      <p className="whitespace-pre-wrap break-words">{m.body}</p>
                      <p className={`text-[10px] mt-1 ${mine ? 'text-orange-100/80' : 'portal-muted'}`}>
                        {timeShort(m.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            <div className={`${compact ? 'p-3' : 'p-4'} border-t flex gap-2 shrink-0 ${isDark ? 'border-[var(--portal-border)] portal-card border' : 'border-gray-100 bg-white'}`}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                placeholder="Nhập tin nhắn..."
                className={`flex-1 rounded-xl ${compact ? 'px-3 py-2 text-sm' : 'px-4 py-3 text-sm'} font-medium outline-none border focus:border-[#F27124] ${
                  isDark ? 'bg-[var(--portal-input-bg)] border-[var(--portal-border)] text-white' : 'bg-gray-50 border-gray-200'
                }`}
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={sending || !input.trim()}
                className={`bg-[#F27124] text-white rounded-xl hover:bg-[#D95F1B] disabled:opacity-50 transition-colors shrink-0 ${compact ? 'p-2.5' : 'p-3'}`}
              >
                {sending ? <Loader2 className="animate-spin" size={compact ? 18 : 22} /> : <Send size={compact ? 18 : 22} />}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MessagingCenter;
