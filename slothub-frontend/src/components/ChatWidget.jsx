import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, Sparkles } from 'lucide-react';
import api from '../api/axios';
import { useLocale } from '../context/LocaleContext';

const ChatWidget = () => {
  const { t, locale } = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Tự động cuộn xuống tin nhắn mới nhất
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    setMessages([{ sender: 'ai', text: t('chat.greetingLong') }]);
  }, [locale, t]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage = inputText.trim();
    setMessages(prev => [...prev, { sender: 'user', text: userMessage }]);
    setInputText('');
    setIsLoading(true);

    try {
      // 🌟 LƯU Ý: Chỉnh sửa lại đường dẫn '/chat' hoặc '/chat/chat' 
      // tùy thuộc vào cách bạn khai báo app.use() trong file server.js nhé!
      const res = await api.post('/chat/chat', { message: userMessage });
      
      // Backend của bạn trả về { reply: ... } hoặc { message: ... }
      const aiReply = res.data.reply || res.data.message; 
      
      setMessages(prev => [...prev, { sender: 'ai', text: aiReply }]);
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'SlotAI đang đi ăn trưa, bạn đợi chút hoặc thử lại sau nha! 😥';
      setMessages(prev => [...prev, { sender: 'ai', text: errorMsg }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Hàm xử lý định dạng markdown cơ bản (bôi đậm chữ) từ Gemini trả về
  const formatText = (text) => {
    // Chuyển **chữ** thành thẻ <strong>
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="text-[#F27124]">{part.slice(2, -2)}</strong>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] font-sans">
      {/* NÚT MỞ CHAT KHÔNG GIAN */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="bg-gradient-to-r from-[#F27124] to-[#ff985e] text-white p-4 rounded-full shadow-2xl hover:scale-110 hover:shadow-orange-300 transition-all duration-300 flex items-center justify-center animate-bounce group relative"
        >
          <MessageSquare size={28} />
          <Sparkles size={16} className="absolute top-2 right-2 text-yellow-300 animate-pulse" />
          
          {/* Tooltip */}
          <span className="absolute -top-12 right-0 bg-white text-gray-800 text-sm font-bold px-4 py-2 rounded-2xl shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-orange-100">
            {t('chat.tooltip')}
          </span>
        </button>
      )}

      {/* CỬA SỔ CHAT */}
      {isOpen && (
        <div className="bg-white w-[360px] sm:w-[400px] h-[600px] rounded-[2.5rem] shadow-[0_20px_50px_rgba(242,113,36,0.15)] border border-orange-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 fade-in duration-300">
          
          {/* HEADER CHAT */}
          <div className="bg-gradient-to-r from-[#F27124] to-[#ff985e] p-5 flex justify-between items-center text-white shrink-0 shadow-md z-10 relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
            
            <div className="flex items-center gap-3 relative z-10">
              <div className="bg-white/20 p-2.5 rounded-full backdrop-blur-sm border border-white/30 shadow-sm relative">
                <Bot size={24} className="text-white" />
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-[#ff985e] rounded-full animate-pulse"></span>
              </div>
              <div>
                <h3 className="font-black text-xl leading-tight tracking-wide">{t('chat.title')}</h3>
                <p className="text-xs text-orange-50 font-medium opacity-90">Trợ lý Canteen FPT</p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-white hover:text-[#F27124] bg-white/10 hover:bg-white p-2 rounded-full transition-colors relative z-10"
            >
              <X size={20} />
            </button>
          </div>

          {/* KHU VỰC TIN NHẮN */}
          <div className="flex-1 p-5 overflow-y-auto bg-gray-50 flex flex-col gap-5 custom-scrollbar">
            {messages.map((msg, index) => (
              <div key={index} className={`flex gap-3 max-w-[88%] ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
                
                {/* Avatar bong bóng */}
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-sm mt-auto ${msg.sender === 'user' ? 'bg-gradient-to-br from-gray-200 to-gray-300 text-gray-600' : 'bg-gradient-to-br from-orange-100 to-orange-200 text-[#F27124]'}`}>
                  {msg.sender === 'user' ? <User size={18} /> : <Bot size={18} />}
                </div>

                {/* Bong bóng nội dung */}
                <div className={`p-3.5 text-[15px] leading-relaxed shadow-sm ${
                  msg.sender === 'user' 
                  ? 'bg-gradient-to-br from-[#F27124] to-[#ff985e] text-white rounded-2xl rounded-br-sm shadow-orange-200/50' 
                  : 'bg-white text-gray-700 border border-gray-100 rounded-2xl rounded-bl-sm whitespace-pre-line'
                }`}>
                  {msg.sender === 'user' ? msg.text : formatText(msg.text)}
                </div>
              </div>
            ))}

            {/* Hiệu ứng AI đang gõ */}
            {isLoading && (
              <div className="flex gap-3 max-w-[85%]">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-100 to-orange-200 text-[#F27124] flex items-center justify-center shrink-0 shadow-sm mt-auto">
                  <Bot size={18} />
                </div>
                <div className="bg-white border border-gray-100 px-4 py-5 rounded-2xl rounded-bl-sm shadow-sm flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-[#F27124]/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-2.5 h-2.5 bg-[#F27124]/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-2.5 h-2.5 bg-[#F27124] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* KHU VỰC NHẬP LIỆU */}
          <div className="p-4 bg-white border-t border-gray-100 shrink-0">
            <div className="flex gap-2 overflow-x-auto pb-2 mb-2">
              {['Món ít calo?', 'Món được khen ngon?', 'Quán nào đang mở?'].map((hint) => (
                <button
                  key={hint}
                  type="button"
                  disabled={isLoading}
                  onClick={() => setInputText(hint)}
                  className="shrink-0 text-[11px] font-bold text-[#D95F1B] bg-orange-50 border border-orange-100 px-3 py-1.5 rounded-full hover:bg-orange-100 disabled:opacity-50"
                >
                  {hint}
                </button>
              ))}
            </div>
            <div className="relative flex items-center">
              <input 
                type="text" 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder={t('chat.placeholder')} 
                className="w-full bg-gray-50 border border-gray-200 rounded-full py-3.5 pl-5 pr-14 focus:bg-white focus:border-[#F27124] focus:ring-2 focus:ring-orange-50 outline-none transition-all text-[15px] font-medium"
                disabled={isLoading}
              />
              <button 
                onClick={handleSendMessage}
                disabled={!inputText.trim() || isLoading}
                className="absolute right-2 bg-gradient-to-r from-[#F27124] to-[#ff985e] text-white p-2.5 rounded-full hover:shadow-lg hover:shadow-orange-200 hover:-translate-y-0.5 transition-all active:translate-y-0 disabled:from-gray-300 disabled:to-gray-300 disabled:shadow-none disabled:hover:translate-y-0 disabled:cursor-not-allowed"
              >
                <Send size={18} className="ml-0.5" />
              </button>
            </div>
          </div>

        </div>
      )}

      {/* CSS phụ trợ */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #d1d5db; }
      `}} />
    </div>
  );
};

export default ChatWidget;