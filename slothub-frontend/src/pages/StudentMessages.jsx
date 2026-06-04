import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import MessagingCenter from '../components/messaging/MessagingCenter';
import { useLocale } from '../context/LocaleContext';
import LanguageToggle from '../components/LanguageToggle';

const StudentMessages = () => {
  const navigate = useNavigate();
  const { t } = useLocale();
  const [searchParams] = useSearchParams();
  const openConv = searchParams.get('c');

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50/50 via-[#F9FAFB] to-[#F9FAFB] pb-8">
      <header className="bg-white/90 backdrop-blur-md px-4 sm:px-6 py-3 shadow-sm sticky top-0 z-40 border-b border-orange-100/60">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="p-2 bg-gray-50 hover:bg-orange-50 hover:text-[#F27124] rounded-full transition-colors shrink-0"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-black text-gray-800 flex items-center gap-2">
              <MessageSquare size={20} className="text-[#F27124] shrink-0" />
              {t('messages.title')}
            </h1>
            <p className="text-[11px] sm:text-xs text-gray-500 font-medium truncate">
              {t('messages.subtitle')}
            </p>
          </div>
          <LanguageToggle />
        </div>
      </header>

      <main className="max-w-2xl mx-auto mt-4 sm:mt-6 px-3 sm:px-4">
        <MessagingCenter
          mode="student"
          theme="light"
          compact
          initialConversationId={openConv}
        />
        <p className="text-center text-[11px] text-gray-400 mt-3 font-medium">
          Cửa sổ chat nhỏ gọn — bạn vẫn thấy trang chủ khi quay lại
        </p>
      </main>
    </div>
  );
};

export default StudentMessages;
