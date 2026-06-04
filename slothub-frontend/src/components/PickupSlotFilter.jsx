import React from 'react';
import { Clock, Sun, CloudSun, Sunset, Moon, CheckCircle2 } from 'lucide-react';
import { useLocale } from '../context/LocaleContext';

const SLOT_ICONS = [<Sun key="0" size={18} />, <CloudSun key="1" size={18} />, <Sunset key="2" size={18} />, <Moon key="3" size={18} />];

/**
 * @param {'menuView'|'pickup'} variant — menuView: Home (lọc menu); pickup: (nếu dùng chung component)
 */
const PickupSlotFilter = ({
  timeSlots,
  selectedSlotId,
  onSelect,
  hideClosed,
  onToggleHideClosed,
  compact = false,
  variant = 'menuView',
  layout = 'horizontal',
}) => {
  const vertical = layout === 'vertical';
  const { t } = useLocale();
  const ns = variant === 'menuView' ? 'menuView' : 'pickup';
  const slotLabels = t(`${ns}.slotLabels`) || t('pickup.slotLabels');
  const SLOT_LABELS = Array.isArray(slotLabels) ? slotLabels : ['Bữa sáng', 'Giờ cao điểm', 'Nạp năng lượng', 'Tan học'];

  if (!timeSlots?.length) return null;

  return (
    <div
      className={`bg-white border border-orange-100/80 shadow-sm ${
        vertical ? 'rounded-2xl p-4 mb-4' : compact ? 'rounded-2xl p-4' : 'rounded-[1.75rem] p-5 sm:p-6 mb-6'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h2 className={`font-black text-gray-900 flex items-center gap-2 ${vertical ? 'text-sm' : 'text-base sm:text-lg'}`}>
          <Clock className="text-[#F27124]" size={vertical ? 18 : 22} />
          {t(`${ns}.title`)}
        </h2>
        {onToggleHideClosed && (
          <label className="flex items-center gap-2 text-xs font-bold text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={hideClosed}
              onChange={(e) => onToggleHideClosed(e.target.checked)}
              className="rounded border-gray-300 text-[#F27124] focus:ring-[#F27124]"
            />
            {t(`${ns}.hideClosed`)}
          </label>
        )}
      </div>

      <div
        className={
          vertical
            ? 'space-y-2'
            : `flex gap-2 overflow-x-auto pb-1 scrollbar-hide ${compact ? '' : 'sm:grid sm:grid-cols-2 sm:overflow-visible sm:gap-3'}`
        }
      >
        {timeSlots.map((slot, index) => {
          const isSelected = selectedSlotId === slot._id;
          const label = `${slot.startTime} – ${slot.endTime}`;
          return (
            <button
              key={slot._id}
              type="button"
              onClick={() => onSelect(slot._id)}
              className={`${vertical ? 'w-full' : 'shrink-0 sm:shrink'} flex items-center gap-3 p-3 sm:p-4 rounded-2xl border-2 text-left transition-all ${
                vertical ? '' : 'min-w-[200px] sm:min-w-0'
              } ${
                isSelected
                  ? 'border-[#F27124] bg-gradient-to-br from-orange-50 to-orange-100/60 shadow-md'
                  : 'border-gray-100 bg-gray-50 hover:border-orange-200 hover:bg-orange-50/40'
              }`}
            >
              <div
                className={`p-2.5 rounded-xl shrink-0 ${
                  isSelected ? 'bg-[#F27124] text-white shadow-md' : 'bg-white text-gray-400 border border-gray-200'
                }`}
              >
                {SLOT_ICONS[index % SLOT_ICONS.length]}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-black text-sm sm:text-base ${isSelected ? 'text-[#F27124]' : 'text-gray-900'}`}>
                  {label}
                </p>
                <p className={`text-[10px] sm:text-xs font-bold ${isSelected ? 'text-orange-600' : 'text-gray-500'}`}>
                  {SLOT_LABELS[index % SLOT_LABELS.length]}
                </p>
              </div>
              {isSelected && <CheckCircle2 size={20} className="text-[#F27124] shrink-0 hidden sm:block" />}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-gray-500 font-medium mt-3">
        {t(`${ns}.hint`)}
      </p>
    </div>
  );
};

export default PickupSlotFilter;
