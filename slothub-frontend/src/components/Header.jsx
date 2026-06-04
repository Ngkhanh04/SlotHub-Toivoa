import React, { useContext } from 'react';
import { Search, Bell } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

const Header = () => {
  const { balance } = useContext(AuthContext);

  return (
    <header className="bg-white px-8 py-4 flex justify-between items-center shadow-sm sticky top-0 z-50">
      {/* Logo */}
      <div className="flex items-center space-x-2">
        <span className="text-3xl font-extrabold text-[#F27124]">SlotHub</span>
      </div>

      {/* Search Bar - Bo tròn cực đại theo UI */}
      <div className="relative w-1/3">
        <input 
          type="text" 
          placeholder="Tìm kiếm món ăn, quầy..." 
          className="w-full bg-[#F3F4F6] border-none rounded-full py-2.5 px-12 focus:ring-2 focus:ring-[#F27124] transition-all"
        />
        <Search className="absolute left-4 top-3 text-gray-400" size={18} />
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-6">
        {/* Số dư ví - Vibe iBanking */}
        <div className="bg-[#FEF2E7] flex items-center space-x-2 px-4 py-2 rounded-xl border border-[#FDE1CC]">
          <div className="w-6 h-6 bg-[#F27124] rounded-md flex items-center justify-center text-white text-[10px] font-bold">đ</div>
          <span className="font-bold text-[#F27124]">{balance.toLocaleString()}đ</span>
        </div>

        <button className="relative text-gray-600 hover:text-[#F27124] transition">
          <Bell size={24} />
          <span className="absolute -top-1 -right-1 bg-red-500 w-2 h-2 rounded-full border-2 border-white"></span>
        </button>

        <button className="bg-[#F27124] text-white px-6 py-2 rounded-full font-bold hover:bg-[#D95F1B] transition shadow-lg shadow-orange-200">
          Đăng nhập
        </button>
      </div>
    </header>
  );
};

export default Header;