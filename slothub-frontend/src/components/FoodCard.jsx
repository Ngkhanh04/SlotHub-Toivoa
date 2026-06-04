import React from 'react';
import { Plus, Flame, Store, Star } from 'lucide-react';
import { useLocale } from '../context/LocaleContext';

const FoodCard = ({ item, onAdd, onViewDetail }) => {
  const { t } = useLocale();
  const isVendorClosedInSlot = item.vendorIsOpen === false;
  const isVendorClosedNow = item.vendorOpenNow === false;
  const isOutOfStock = item.countInStock === 0 || item.isAvailable === false || isVendorClosedInSlot;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onViewDetail?.(item)}
      onKeyDown={(e) => e.key === 'Enter' && onViewDetail?.(item)}
      className={`group bg-white rounded-[2rem] p-3 shadow-sm border border-gray-100 hover:shadow-2xl hover:shadow-[#F27124]/20 hover:border-[#F27124]/30 transition-all duration-500 cursor-pointer flex flex-col h-full ${isOutOfStock ? 'opacity-70 grayscale-[30%]' : 'hover:-translate-y-2'}`}
    >
      
      {/* HÌNH ẢNH MÓN */}
      <div className="relative h-48 w-full mb-4 rounded-[1.5rem] overflow-hidden bg-gray-50">
        <img 
          src={item.imageUrl || 'https://via.placeholder.com/300?text=Food'} 
          alt={item.name} 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

        {/* Badge Tạm Hết */}
        {isOutOfStock ? (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-20">
            <span className="bg-white text-gray-900 px-5 py-2 rounded-full font-black text-sm shadow-xl tracking-wide uppercase border-2 border-gray-200 text-center max-w-[90%]">
               {isVendorClosedInSlot ? t('food.slotClosed') : t('food.outOfStock')}
            </span>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 pointer-events-none">
             <span className="bg-white/90 backdrop-blur-sm text-gray-900 font-bold px-5 py-2 rounded-full shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                {t('food.viewDetail')}
             </span>
          </div>
        )}

        {/* Badge Rating Góc trái */}
        {item.rating > 0 && !isOutOfStock && (
          <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-gray-900 text-xs font-black px-2 py-1 rounded-lg flex items-center gap-1 shadow-md z-10">
            <Star size={12} className="fill-[#F27124] text-[#F27124]" /> {item.rating.toFixed(1)}
          </div>
        )}
      </div>

      {/* THÔNG TIN */}
      <div className="px-2 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-black text-gray-900 text-lg leading-tight line-clamp-1 mb-2 group-hover:text-[#F27124] transition-colors">{item.name}</h3>
          
          <p className={`text-xs flex items-center gap-1.5 font-bold mb-4 w-fit px-2.5 py-1 rounded-lg border ${
            isVendorClosedInSlot ? 'text-red-600 bg-red-50 border-red-100' : isVendorClosedNow ? 'text-amber-700 bg-amber-50 border-amber-100' : 'text-gray-500 bg-gray-50 border-gray-100'
          }`}>
            <Store size={12} className={isVendorClosedInSlot ? 'text-red-500' : 'text-[#F27124]'}/> {item.vendor?.name || 'FPT Canteen'}
            {item.vendor?.openTime && (
              <span className="font-medium"> · {item.vendor.openTime}–{item.vendor.closeTime}</span>
            )}
            {isVendorClosedInSlot && (
              <span className="block text-[10px] font-black uppercase text-red-500 mt-0.5">{t('food.closedThisSlot')}</span>
            )}
            {!isVendorClosedInSlot && isVendorClosedNow && (
              <span className="block text-[10px] font-black uppercase text-amber-600 mt-0.5">{t('food.closedNowOpenLater')}</span>
            )}
          </p>
        </div>
        
        <div className="flex justify-between items-end border-t border-gray-50 pt-3 mt-auto">
          <div className="flex flex-col">
            <span className="text-2xl font-black text-[#F27124] tracking-tight">
              {item.price?.toLocaleString()}<span className="text-sm font-bold text-gray-400 ml-0.5 underline decoration-gray-200">đ</span>
            </span>
            {item.calories && (
              <span className="inline-flex items-center text-[10px] font-extrabold uppercase tracking-wider text-gray-500 mt-1">
                <Flame size={12} className="mr-1 text-orange-500" strokeWidth={3} /> {item.calories} kcal
              </span>
            )}
          </div>
          
          <button 
            disabled={isOutOfStock}
            onClick={(e) => { e.stopPropagation(); onAdd(item._id); }}
            className={`h-11 w-11 rounded-2xl transition-all duration-300 flex items-center justify-center group-hover:rounded-full ${
              isOutOfStock 
              ? 'bg-gray-100 text-gray-300 cursor-not-allowed' 
              : 'bg-orange-50 text-[#F27124] hover:bg-[#F27124] hover:text-white shadow-sm hover:shadow-lg hover:shadow-orange-500/40 hover:-translate-y-1'
            }`}
          >
            <Plus size={22} strokeWidth={3} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default FoodCard;