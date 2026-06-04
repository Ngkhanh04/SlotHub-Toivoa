import React, { useState } from 'react';
import { User } from 'lucide-react';

const sizeMap = {
  sm: 'w-10 h-10 text-sm',
  md: 'w-12 h-12 text-base',
  lg: 'w-14 h-14 text-lg',
};

const roleRing = {
  admin: 'ring-red-500/50',
  vendor: 'ring-[#F27124]/50',
  vendor_owner: 'ring-[#F27124]/50',
  student: 'ring-blue-500/40',
  staff: 'ring-gray-500/40',
};

const UserAvatar = ({ user, size = 'md', className = '' }) => {
  const [imgError, setImgError] = useState(false);
  const avatarUrl = user?.avatar?.trim();
  const showImage = Boolean(avatarUrl) && !imgError;
  const initial = user?.name?.charAt(0)?.toUpperCase() || '?';
  const ring = roleRing[user?.role] || roleRing.student;

  return (
    <div
      className={`${sizeMap[size] || sizeMap.md} rounded-full shrink-0 overflow-hidden flex items-center justify-center font-black ring-2 ${ring} bg-gradient-to-br from-gray-700 to-gray-800 text-gray-200 border border-gray-600 shadow-md ${className}`}
      title={user?.name || 'User'}
    >
      {showImage ? (
        <img
          src={avatarUrl}
          alt={user?.name || 'Avatar'}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="select-none">{initial}</span>
      )}
    </div>
  );
};

export const UserAvatarPlaceholder = ({ size = 'md' }) => (
  <div
    className={`${sizeMap[size] || sizeMap.md} rounded-full shrink-0 flex items-center justify-center bg-gray-800 text-gray-500 border border-gray-700`}
  >
    <User size={size === 'lg' ? 22 : 18} />
  </div>
);

export default UserAvatar;
