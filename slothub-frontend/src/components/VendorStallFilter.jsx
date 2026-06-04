import React from 'react';
import { Store, CheckCircle2 } from 'lucide-react';
import { useLocale } from '../context/LocaleContext';

const VendorStallFilter = ({ vendors, selectedVendorId, onSelect, layout = 'horizontal' }) => {
  const { t } = useLocale();
  const vertical = layout === 'vertical';

  if (!vendors?.length) return null;

  const btnBase = vertical
    ? 'w-full flex items-center justify-between gap-2 px-4 py-3 rounded-2xl border-2 text-sm font-bold transition-all text-left'
    : 'shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-2xl border-2 text-sm font-black transition-all';

  return (
    <div
      className={`bg-white border border-gray-100 shadow-sm ${
        vertical ? 'rounded-2xl p-4 mb-4' : 'rounded-[1.75rem] p-5 sm:p-6 mb-6'
      }`}
    >
      <h2 className={`font-black text-gray-900 flex items-center gap-2 ${vertical ? 'text-sm mb-3' : 'text-base sm:text-lg mb-4'}`}>
        <Store className="text-[#F27124]" size={vertical ? 18 : 22} />
        {t('home.selectStall')}
      </h2>
      <div className={vertical ? 'space-y-2' : 'flex gap-2 overflow-x-auto pb-1 scrollbar-hide'}>
        <button
          type="button"
          onClick={() => onSelect('')}
          className={`${btnBase} ${
            !selectedVendorId
              ? 'border-[#F27124] bg-orange-50 text-[#F27124] shadow-sm'
              : 'border-gray-100 bg-gray-50 text-gray-600 hover:border-orange-200'
          }`}
        >
          <span className="flex items-center gap-2">
            {!selectedVendorId && <CheckCircle2 size={16} />}
            {t('home.allStalls')}
          </span>
        </button>
        {vendors.map((v) => {
          const id = String(v._id);
          const isSelected = selectedVendorId === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelect(id)}
              className={`${btnBase} ${
                isSelected
                  ? 'border-[#F27124] bg-orange-50 text-[#F27124] shadow-sm'
                  : 'border-gray-100 bg-gray-50 text-gray-700 hover:border-orange-200'
              } ${vertical ? '' : 'max-w-[200px]'}`}
            >
              <span className="flex items-center gap-2 min-w-0 flex-1">
                {isSelected && <CheckCircle2 size={16} className="shrink-0" />}
                <span className="truncate">{v.name}</span>
              </span>
              {vertical && v.isActive === false && (
                <span className="text-[9px] font-black uppercase text-red-500 shrink-0">{t('home.stallInactive')}</span>
              )}
              {vertical && v.isActive !== false && v.hasMenu === false && (
                <span className="text-[9px] font-black uppercase text-gray-400 shrink-0">{t('home.noMenu')}</span>
              )}
              {vertical && v.isActive !== false && v.isOpenInSlot === false && (
                <span className="text-[9px] font-black uppercase text-amber-600 shrink-0">{t('home.stallClosedSlot')}</span>
              )}
            </button>
          );
        })}
      </div>
      <p className={`text-gray-500 font-medium mt-3 ${vertical ? 'text-[10px]' : 'text-[11px]'}`}>{t('home.stallFilterHint')}</p>
    </div>
  );
};

export default VendorStallFilter;
