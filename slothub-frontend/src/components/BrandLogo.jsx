import React from 'react';

const sizeMap = {
  sm: { icon: 'h-8 w-8', title: 'text-xl', tag: 'text-[9px]' },
  md: { icon: 'h-10 w-10', title: 'text-2xl', tag: 'text-[10px]' },
  lg: { icon: 'h-12 w-12', title: 'text-3xl', tag: 'text-[10px]' },
};

/**
 * Logo + tên SlotHub thống nhất toàn app
 * @param {'light'|'dark'} variant - nền sáng / tối (vendor, admin)
 */
const BrandLogo = ({
  size = 'md',
  showTagline = true,
  variant = 'light',
  className = '',
  onClick,
}) => {
  const s = sizeMap[size] || sizeMap.md;
  const tagClass = variant === 'dark' ? 'text-orange-300/80' : 'text-gray-400';

  const Wrapper = onClick ? 'button' : 'div';
  const wrapperProps = onClick
    ? { type: 'button', onClick, className: `flex items-center gap-2.5 text-left group ${className}` }
    : { className: `flex items-center gap-2.5 ${className}` };

  return (
    <Wrapper {...wrapperProps}>
      <img
        src={`${process.env.PUBLIC_URL || ''}/logo-mark.svg`}
        alt=""
        className={`${s.icon} shrink-0 drop-shadow-sm ${onClick ? 'group-hover:scale-105 transition-transform duration-300' : ''}`}
      />
      <div className="flex flex-col leading-none">
        <span className={`font-black tracking-tight ${s.title} flex items-baseline gap-0`}>
          <span className={variant === 'dark' ? 'text-white' : 'text-gray-900'}>Slot</span>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F27124] to-[#D95F1B]">Hub</span>
        </span>
        {showTagline && (
          <span className={`${s.tag} font-bold uppercase tracking-[0.2em] mt-1 ${tagClass}`}>
            FPT Canteen
          </span>
        )}
      </div>
    </Wrapper>
  );
};

export default BrandLogo;
