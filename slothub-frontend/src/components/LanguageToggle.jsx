import React from 'react';
import { Languages } from 'lucide-react';
import { useLocale } from '../context/LocaleContext';

const LanguageToggle = ({ className = '', compact = false }) => {
  const { locale, setLocale, t } = useLocale();

  return (
    <div
      className={`inline-flex items-center gap-1 bg-gray-100 border border-gray-200 rounded-full p-0.5 ${className}`}
      role="group"
      aria-label={t('lang.label')}
    >
      {!compact && (
        <Languages size={14} className="text-gray-400 ml-2 shrink-0" aria-hidden />
      )}
      {['vi', 'en'].map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLocale(code)}
          className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide transition-all ${
            locale === code
              ? 'bg-[#F27124] text-white shadow-sm'
              : 'text-gray-500 hover:text-[#F27124]'
          }`}
        >
          {code === 'vi' ? 'VI' : 'EN'}
        </button>
      ))}
    </div>
  );
};

export default LanguageToggle;
