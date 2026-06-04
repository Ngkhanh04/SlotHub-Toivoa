import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom'; 
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import { ShoppingCart, Search, Trash2, Utensils, LogOut, ChevronDown, Wallet, Store, X, Minus, Plus, Receipt, UserCircle, Star, MessageSquare } from 'lucide-react';
import BrandLogo from '../components/BrandLogo'; 
import WalletWidget from '../components/WalletWidget';
import Footer from '../components/Footer';
import FoodCard from '../components/FoodCard';
import FoodDetailModal from '../components/FoodDetailModal';
import PickupSlotFilter from '../components/PickupSlotFilter';
import VendorStallFilter from '../components/VendorStallFilter';
import { pickDefaultSlotId, MENU_VIEW_SLOT_STORAGE_KEY } from '../utils/vendorHours';
import { useLocale } from '../context/LocaleContext';
import LanguageToggle from '../components/LanguageToggle';

const CATEGORY_ALL = 'Tất cả';

const normalizeStr = (str) => {
  if (!str) return '';
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();
};

const Home = () => {
  const { balance, user, logout, fetchBalance } = useContext(AuthContext);
  const { t, translateCategory } = useLocale();
  const navigate = useNavigate(); 
  
  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState({ items: [], totalPrice: 0, vendorOpen: true, vendorStatusMessage: '' });
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(CATEGORY_ALL);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [timeSlots, setTimeSlots] = useState([]);
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [allVendors, setAllVendors] = useState([]);
  const [hideClosedForSlot, setHideClosedForSlot] = useState(true);

  useEffect(() => {
    if (user?.role === 'admin') navigate('/admin', { replace: true });
    else if (user?.role === 'vendor' || user?.role === 'vendor_owner') navigate('/vendor', { replace: true }); 
  }, [user, navigate]);

  useEffect(() => {
    if (user && user.role !== 'student') return;

    const loadData = async () => {
      setLoading(true);
      try {
        const [slotsRes, vendorsRes] = await Promise.all([
          api.get('/timeslots'),
          api.get('/vendor'),
        ]);
        const slots = slotsRes.data || [];
        setTimeSlots(slots);
        setAllVendors(Array.isArray(vendorsRes.data) ? vendorsRes.data : []);

        let slotId = localStorage.getItem(MENU_VIEW_SLOT_STORAGE_KEY) || '';
        if (!slots.some((s) => s._id === slotId)) {
          slotId = pickDefaultSlotId(slots);
        }
        if (slotId) {
          setSelectedSlotId(slotId);
          localStorage.setItem(MENU_VIEW_SLOT_STORAGE_KEY, slotId);
        }

        const menuUrl = slotId ? `/menuitems?slotId=${slotId}` : '/menuitems';
        const menuRes = await api.get(menuUrl);
        if (Array.isArray(menuRes.data)) setMenuItems(menuRes.data);
      } catch (err) {
        console.error("Lỗi tải Menu:", err);
      }
      try {
        if(user?._id && user.role === 'student') { 
            fetchBalance(); 
            const cartRes = await api.get('/cart');
            if (cartRes.data?.items) setCart(cartRes.data);
            else if (cartRes.data?.cart) setCart(cartRes.data.cart);
        }
      } catch (err) {
        console.error("Lỗi giỏ hàng:", err);
      }
      setLoading(false);
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ reload khi đổi user id / ví
  }, [user?._id, fetchBalance]);

  const handleSlotChange = async (slotId) => {
    setSelectedSlotId(slotId);
    localStorage.setItem(MENU_VIEW_SLOT_STORAGE_KEY, slotId);
    try {
      const menuRes = await api.get(`/menuitems?slotId=${slotId}`);
      if (Array.isArray(menuRes.data)) setMenuItems(menuRes.data);
    } catch (err) {
      console.error('Lỗi tải menu theo khung giờ:', err);
    }
  };

  const selectedSlot = timeSlots.find((s) => s._id === selectedSlotId);

  const stallList = useMemo(() => {
    const menuByVendor = {};
    menuItems.forEach((item) => {
      const id = String(item.vendor?._id || item.vendor || '');
      if (!id) return;
      if (!menuByVendor[id]) {
        menuByVendor[id] = { hasMenu: true, isOpenInSlot: item.vendorIsOpen !== false };
      } else if (item.vendorIsOpen === false) {
        menuByVendor[id].isOpenInSlot = false;
      }
    });

    const source = allVendors.length
      ? allVendors
      : Object.entries(menuByVendor).map(([id, meta]) => ({ _id: id, name: t('orders.vendor'), ...meta }));

    return source
      .map((v) => {
        const id = String(v._id);
        const meta = menuByVendor[id];
        return {
          _id: v._id,
          name: v.name || t('orders.vendor'),
          isActive: v.isActive !== false,
          hasMenu: meta?.hasMenu ?? false,
          isOpenInSlot: meta?.isOpenInSlot ?? null,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  }, [allVendors, menuItems, t]);

  const categories = [CATEGORY_ALL, ...new Set(menuItems.map(i => i.category).filter(Boolean))];
  const displayCategory = (cat) => (cat === CATEGORY_ALL ? t('common.all') : translateCategory(cat));

  const handleAddToCart = async (menuItemId) => {
    if (!user) {
        alert(t('home.loginToOrder'));
        return navigate('/login'); 
    }
    try {
      const res = await api.post('/cart/add', { menuItemId, quantity: 1 });
      setCart(res.data.cart || res.data);
    } catch (err) {
      alert(err.response?.data?.message || t('home.cartError'));
    }
  };

  const handleUpdateQuantity = async (menuItemId, currentQuantity, change) => {
    const newQuantity = currentQuantity + change;
    if (newQuantity === 0) {
      try {
        const res = await api.delete(`/cart/remove/${menuItemId}`);
        setCart(res.data?.cart || res.data);
      } catch (err) {}
      return;
    }
    try {
      const res = await api.post('/cart/add', { menuItemId, quantity: change });
      setCart(res.data?.cart || res.data);
    } catch (err) {
      alert(err.response?.data?.message || t('home.qtyError'));
    }
  };

  const handleRemoveItem = async (menuItemId) => {
    try {
      const res = await api.delete(`/cart/remove/${menuItemId}`);
      setCart(res.data.cart || res.data);
    } catch (err) {}
  };

  const filteredItems = menuItems.filter((item) => {
    const matchCategory = selectedCategory === CATEGORY_ALL || item.category === selectedCategory;
    const vendorId = String(item.vendor?._id || item.vendor || '');
    const matchVendor = !selectedVendorId || vendorId === selectedVendorId;
    const matchSlot = !selectedSlotId || !hideClosedForSlot || item.vendorIsOpen !== false;

    const searchClean = normalizeStr(searchTerm);
    const nameClean = normalizeStr(item.name);
    const vendorClean = normalizeStr(item.vendor?.name);
    const categoryClean = normalizeStr(item.category);
    const matchSearch =
      !searchTerm.trim() ||
      nameClean.includes(searchClean) ||
      vendorClean.includes(searchClean) ||
      categoryClean.includes(searchClean);

    return matchCategory && matchVendor && matchSlot && matchSearch;
  });

  const closedHiddenCount =
    selectedSlotId && hideClosedForSlot
      ? menuItems.filter(
          (i) =>
            (selectedCategory === CATEGORY_ALL || i.category === selectedCategory) &&
            i.vendorIsOpen === false
        ).length
      : 0;

  if (user && user.role !== 'student') return (
    <div className="flex h-screen w-full items-center justify-center bg-[#1E293B]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-[#F27124] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-white font-bold text-lg animate-pulse">Đang vào hệ thống quản trị...</p>
      </div>
    </div>
  );

  if (loading) return (
    <div className="flex h-screen w-full items-center justify-center bg-[#F9FAFB]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-[#F27124] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[#F27124] font-bold text-lg animate-pulse">{t('home.preparingMenu')}</p>
      </div>
    </div>
  );

  return (
    <div className="bg-gradient-to-b from-orange-50/40 via-[#F8FAFC] to-[#F8FAFC] min-h-screen font-sans text-gray-800 selection:bg-[#F27124] selection:text-white flex flex-col">
      <header className="bg-white/80 backdrop-blur-xl px-4 sm:px-8 py-3 sm:py-4 flex justify-between items-center shadow-sm sticky top-0 z-50 border-b border-orange-100/50 transition-all">
        <BrandLogo size="md" onClick={() => navigate('/')} className="cursor-pointer" />
        
        <div className="relative flex-1 max-w-xl mx-4 hidden md:block group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400 group-focus-within:text-[#F27124] transition-colors" />
          </div>
          <input 
            type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder={t('nav.searchPlaceholder')} 
            className="w-full bg-gray-100/80 border-2 border-transparent rounded-full py-3.5 pl-12 pr-12 focus:bg-white focus:border-[#F27124] focus:ring-4 focus:ring-orange-500/10 outline-none transition-all duration-300 text-sm font-semibold shadow-inner"
          />
          {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-4 top-3.5 text-gray-400 hover:text-red-500 transition-colors bg-gray-200 rounded-full p-0.5"><X size={16} /></button>}
        </div>

        <div className="flex items-center space-x-3 sm:space-x-5">
          <LanguageToggle className="hidden sm:inline-flex" />
          {user && user.role === 'student' && (
              <div 
                onClick={() => setIsWalletOpen(true)} 
                className="flex items-center gap-2 bg-gradient-to-r from-orange-50 to-white px-5 py-2.5 rounded-full border border-orange-200 shadow-sm cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all group"
              >
                <Wallet size={18} className="text-[#F27124] group-hover:animate-bounce" />
                <span className="font-black text-[#D95F1B]">{balance?.toLocaleString() || 0}đ</span>
              </div>
          )}

          {!user ? (
            <button onClick={() => navigate('/login')} className="bg-gradient-to-r from-[#F27124] to-[#D95F1B] text-white px-8 py-3 rounded-full font-black shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-all hover:-translate-y-0.5 active:translate-y-0">
              {t('nav.login')}
            </button>
          ) : (
            <div className="relative">
              <button onClick={() => setShowUserMenu(!showUserMenu)} className="flex items-center gap-3 bg-white border border-gray-200 p-1 pr-4 rounded-full font-bold text-gray-700 hover:bg-gray-50 hover:shadow-md transition-all">
                {user?.avatar ? (
                  <img src={user.avatar} alt="Avatar" className="w-10 h-10 rounded-full border-2 border-white object-cover shadow-sm" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-10 h-10 bg-gradient-to-br from-[#F27124] to-[#ff985e] text-white rounded-full flex items-center justify-center text-sm font-black shadow-inner border-2 border-white">
                      {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
                <span className="text-sm line-clamp-1 max-w-[100px]">{user?.name || t('common.student')}</span>
                <ChevronDown size={16} className={`text-gray-400 transition-transform duration-300 ${showUserMenu ? 'rotate-180' : ''}`} />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-4 w-72 bg-white rounded-[2rem] shadow-2xl shadow-gray-400/20 border border-gray-100 py-3 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
                  <div className="px-5 py-4 border-b border-gray-50 mb-2 flex items-center gap-4">
                      {user?.avatar ? (
                        <img src={user.avatar} alt="Avatar" className="w-14 h-14 rounded-full border-2 border-orange-100 object-cover shadow-sm" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-14 h-14 bg-orange-50 text-[#F27124] border border-orange-100 rounded-full flex items-center justify-center text-2xl font-black">
                          {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-base font-extrabold text-gray-900 line-clamp-1">{user?.name}</p>
                        <p className="text-xs text-gray-500 truncate max-w-[150px]">{user?.email}</p>
                        <span className="inline-flex items-center mt-1 text-[10px] uppercase tracking-wider font-black bg-gradient-to-r from-orange-100 to-orange-50 text-[#F27124] px-2.5 py-0.5 rounded-full border border-orange-200/50">
                          <Star size={10} className="mr-1 fill-[#F27124]"/> {t('common.student')}
                        </span>
                      </div>
                  </div>
                  
                  <div className="px-2 space-y-1">
                    <button onClick={() => { navigate('/profile'); setShowUserMenu(false); }} className="w-full flex items-center gap-3 px-5 py-3 text-sm font-bold text-gray-600 hover:bg-orange-50 hover:text-[#F27124] rounded-xl transition-colors">
                      <UserCircle size={18} /> {t('nav.profile')}
                    </button>
                    <button onClick={() => { navigate('/orders'); setShowUserMenu(false); }} className="w-full flex items-center gap-3 px-5 py-3 text-sm font-bold text-gray-600 hover:bg-orange-50 hover:text-[#F27124] rounded-xl transition-colors">
                      <Receipt size={18} /> {t('nav.orders')}
                    </button>
                    <button onClick={() => { navigate('/messages'); setShowUserMenu(false); }} className="w-full flex items-center gap-3 px-5 py-3 text-sm font-bold text-gray-600 hover:bg-orange-50 hover:text-[#F27124] rounded-xl transition-colors">
                      <MessageSquare size={18} /> {t('nav.messages')}
                    </button>
                    <button onClick={logout} className="w-full flex items-center gap-3 px-5 py-3 text-sm font-bold text-red-500 hover:bg-red-50 rounded-xl transition-colors mt-2">
                      <LogOut size={18} /> {t('nav.logout')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      <div className="md:hidden px-4 pt-3 pb-1">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('nav.searchPlaceholderShort')}
            className="w-full bg-white border border-gray-200 rounded-2xl py-3 pl-12 pr-10 text-sm font-semibold shadow-sm focus:border-[#F27124] focus:ring-2 focus:ring-orange-500/20 outline-none"
          />
          {searchTerm && (
            <button type="button" onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              <X size={18} />
            </button>
          )}
        </div>
        <div className="flex gap-2 overflow-x-auto py-3 scrollbar-hide -mx-1 px-1">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`shrink-0 px-4 py-2 rounded-full text-xs font-black capitalize transition-all ${
                selectedCategory === cat
                  ? 'bg-[#F27124] text-white shadow-md shadow-orange-500/30'
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              {displayCategory(cat)}
            </button>
          ))}
        </div>
        <div className="px-4 pb-2 sm:hidden">
          <LanguageToggle />
        </div>
      </div>

      <div className="max-w-[1536px] mx-auto flex flex-1 p-4 sm:p-6 lg:p-8 gap-6 lg:gap-8 relative w-full">
        
        {/* SIDEBAR TÌM KIẾM */}
        <aside className="w-64 shrink-0 sticky top-28 h-fit hidden lg:block">
          <h2 className="text-2xl font-black mb-6 text-gray-900 flex items-center gap-2">
            {t('home.categories')} <span className="bg-orange-100 text-[#F27124] p-1.5 rounded-xl"><Utensils size={20}/></span>
          </h2>
          <div className="space-y-3">
            {categories.map(cat => (
              <button key={cat} onClick={() => setSelectedCategory(cat)} className={`w-full flex items-center space-x-3 p-4 rounded-2xl font-bold transition-all duration-300 relative overflow-hidden group ${selectedCategory === cat ? 'text-white shadow-lg shadow-orange-500/30 transform scale-[1.02]' : 'bg-white text-gray-500 hover:text-[#F27124] hover:shadow-md border border-gray-100'}`}>
                {selectedCategory === cat && <div className="absolute inset-0 bg-gradient-to-r from-[#F27124] to-[#ff985e]"></div>}
                <span className={`relative z-10 w-8 h-8 flex items-center justify-center rounded-full ${selectedCategory === cat ? 'bg-white/20' : 'bg-gray-50 group-hover:bg-orange-50'}`}>
                  {cat === CATEGORY_ALL ? <Star size={14} className={selectedCategory === cat ? "fill-white" : ""} /> : <Store size={14} />}
                </span>
                <span className="relative z-10 capitalize">{displayCategory(cat)}</span>
              </button>
            ))}
          </div>
        </aside>

        <main className="flex-1 pb-28 lg:pb-10 min-w-0">
          {/* Mobile / tablet: filters trên đầu danh sách món */}
          <div className="lg:hidden mb-6 space-y-4">
            <VendorStallFilter
              vendors={stallList}
              selectedVendorId={selectedVendorId}
              onSelect={setSelectedVendorId}
            />
            <PickupSlotFilter
              variant="menuView"
              timeSlots={timeSlots}
              selectedSlotId={selectedSlotId}
              onSelect={handleSlotChange}
              hideClosed={hideClosedForSlot}
              onToggleHideClosed={setHideClosedForSlot}
            />
          </div>

          {selectedSlot && closedHiddenCount > 0 && (
            <p className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5 mb-5">
              {t('home.closedHidden', { count: closedHiddenCount })}{' '}
              <span className="text-[#F27124]">{selectedSlot.startTime} – {selectedSlot.endTime}</span>.
              {' '}{t('home.showAll')}.
            </p>
          )}

          {!searchTerm && selectedCategory === CATEGORY_ALL && (
             <div className="w-full h-[240px] md:h-[280px] rounded-[2.5rem] overflow-hidden mb-10 shadow-2xl shadow-gray-200/50 relative group">
                <img src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=2070" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[10s]" alt="Banner" />
                <div className="absolute inset-0 bg-gradient-to-r from-gray-900/90 via-gray-900/50 to-transparent flex flex-col justify-center px-10 md:px-16">
                    <span className="text-[10px] md:text-xs font-black text-orange-300 uppercase tracking-[0.2em] mb-2 block">SlotHub · FPT Canteen</span>
                    <h2 className="text-3xl md:text-4xl font-black text-white mb-3 leading-tight">{t('home.bannerTitle')} <span className="text-[#F27124]">{t('home.bannerTitleHighlight')}</span></h2>
                    <p className="text-gray-300 font-medium max-w-md text-sm md:text-base">{t('home.bannerDesc')}</p>
                    <div className="flex flex-wrap gap-2 mt-4">
                      <span className="text-[11px] font-bold bg-white/10 text-white/90 px-3 py-1.5 rounded-full">⚡ Ví SV</span>
                      <span className="text-[11px] font-bold bg-[#F27124]/30 text-orange-100 px-3 py-1.5 rounded-full">🍜 {menuItems.length}+ món</span>
                    </div>
                </div>
             </div>
          )}

          {searchTerm.trim() && (
            <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between bg-white border border-gray-200 px-6 py-5 rounded-[2rem] shadow-sm animate-in fade-in duration-300">
                <p className="text-gray-700 font-medium text-lg">Kết quả cho: <span className="font-black text-[#F27124]">"{searchTerm}"</span></p>
                <span className="bg-orange-50 text-[#D95F1B] text-sm font-extrabold px-4 py-2 rounded-full mt-2 sm:mt-0 shadow-sm border border-orange-100 flex items-center gap-2">
                  <Search size={16}/> {filteredItems.length} kết quả
                </span>
            </div>
          )}

          <div className="flex items-center justify-between mb-5 px-1">
            <h2 className="text-lg md:text-xl font-black text-gray-900">
              {selectedCategory === CATEGORY_ALL ? t('home.menuTitle') : displayCategory(selectedCategory)}
            </h2>
            <span className="text-xs font-bold text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-100">
              {t('home.dishCount', { count: filteredItems.length })}
            </span>
          </div>

          {filteredItems.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 lg:gap-7">
              {filteredItems.map((item) => (
                <FoodCard
                  key={item._id}
                  item={item}
                  onAdd={() => handleAddToCart(item._id)}
                  onViewDetail={() => setDetailItem(item)}
                />
              ))}
            </div>
          ) : (
             <div className="bg-white py-24 rounded-[3rem] border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
               <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6"><Search size={40} className="text-gray-300" /></div>
               <p className="text-2xl font-black text-gray-800 mb-2">Chưa tìm thấy món ăn!</p>
               <p className="text-gray-500">
                 {searchTerm
                   ? `Không có kết quả nào khớp với từ khóa "${searchTerm}"`
                   : closedHiddenCount > 0 && selectedSlot
                     ? `Không còn món nào từ quầy mở trong khung ${selectedSlot.startTime} – ${selectedSlot.endTime}. Thử đổi khung giờ hoặc bỏ lọc ẩn quầy đóng.`
                     : selectedVendorId
                       ? t('home.noItemsAtStall')
                       : `Danh mục "${selectedCategory}" hiện chưa có món.`}
               </p>
               {searchTerm && (<button onClick={() => setSearchTerm('')} className="mt-6 bg-gray-900 text-white px-6 py-2.5 rounded-full font-bold hover:bg-black transition-colors shadow-lg">Xóa bộ lọc tìm kiếm</button>)}
             </div>
          )}
        </main>

        {/* CỘT PHẢI: Chọn quầy + khung giờ xem menu + giỏ hàng */}
        <aside className="w-[340px] xl:w-[380px] shrink-0 sticky top-24 max-h-[calc(100vh-6rem)] overflow-y-auto custom-scrollbar hidden lg:block space-y-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">{t('home.filtersTitle')}</p>

          <VendorStallFilter
            layout="vertical"
            vendors={stallList}
            selectedVendorId={selectedVendorId}
            onSelect={setSelectedVendorId}
          />

          <PickupSlotFilter
            layout="vertical"
            variant="menuView"
            timeSlots={timeSlots}
            selectedSlotId={selectedSlotId}
            onSelect={handleSlotChange}
            hideClosed={hideClosedForSlot}
            onToggleHideClosed={setHideClosedForSlot}
          />

          {selectedSlot && closedHiddenCount > 0 && (
            <p className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
              {t('home.closedHidden', { count: closedHiddenCount })}
            </p>
          )}

          <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] p-6 xl:p-7 shadow-2xl shadow-gray-200/60 border border-white relative overflow-hidden">
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#F27124]/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="flex justify-between items-center mb-6 relative z-10">
              <h3 className="font-black text-gray-900 text-xl flex items-center gap-2">
                <div className="bg-gray-900 text-white p-2 rounded-xl"><ShoppingCart size={20} /></div> {t('home.cart')}
              </h3>
              <span className="bg-[#F27124] text-white font-black text-xs px-3 py-1.5 rounded-full shadow-md shadow-orange-500/30">{t('home.dishCount', { count: cart.items?.length || 0 })}</span>
            </div>
            
            <div className="space-y-4 mb-8 max-h-[36vh] overflow-y-auto pr-2 custom-scrollbar relative z-10">
              {!cart.items || cart.items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4"><ShoppingCart size={32} className="text-gray-300" /></div>
                  <p className="text-center text-gray-500 font-bold mb-1">{t('home.cartEmptyLong')}</p>
                </div>
              ) : (
                cart.items.map(i => (
                  <div key={i.menuItem?._id} className="flex gap-3 bg-white border border-gray-100 p-3 rounded-2xl shadow-sm hover:shadow-md transition-shadow group">
                    <div className="w-16 h-16 rounded-xl bg-gray-100 overflow-hidden shrink-0">
                      <img src={i.menuItem?.imageUrl || 'https://via.placeholder.com/100'} className="w-full h-full object-cover" alt="item"/>
                    </div>
                    <div className="flex flex-col flex-1 justify-between">
                      <div className="flex justify-between items-start gap-2">
                        <p className="font-bold text-gray-800 text-[13px] leading-tight line-clamp-2">{i.menuItem?.name}</p>
                        <button onClick={() => handleRemoveItem(i.menuItem?._id)} className="text-gray-300 hover:text-red-500 transition-colors shrink-0 mt-0.5"><X size={16}/></button>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="font-black text-[13px] text-[#F27124]">{(i.menuItem?.price * i.quantity).toLocaleString()}đ</span>
                        <div className="flex items-center bg-gray-50 rounded-full border border-gray-200 p-0.5">
                          <button onClick={() => handleUpdateQuantity(i.menuItem?._id, i.quantity, -1)} className="w-6 h-6 flex items-center justify-center rounded-full text-gray-500 hover:bg-white hover:shadow-sm transition-all">
                            {i.quantity === 1 ? <Trash2 size={12} className="text-red-500" /> : <Minus size={12} />}
                          </button>
                          <span className="w-6 text-center font-black text-gray-800 text-xs">{i.quantity}</span>
                          <button onClick={() => handleUpdateQuantity(i.menuItem?._id, i.quantity, 1)} className="w-6 h-6 flex items-center justify-center rounded-full text-gray-500 hover:bg-white hover:shadow-sm transition-all"><Plus size={12} /></button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-gray-100 pt-6 relative z-10 bg-white/50 rounded-xl">
              <div className="flex justify-between items-end mb-6 px-1">
                <span className="text-gray-500 font-bold text-sm">{t('home.total')}:</span>
                <span className="text-3xl font-black text-gray-900 tracking-tight">{cart.totalPrice?.toLocaleString() || 0}<span className="text-lg text-gray-400 ml-1">đ</span></span>
              </div>
              {user && cart.vendorOpen === false && cart.items?.length > 0 && (
                <p className="text-xs text-red-600 font-bold mb-3 px-1 text-center leading-relaxed">
                  {cart.vendorStatusMessage || 'Quán đã đóng cửa, không thể đặt đơn lúc này.'}
                </p>
              )}
              <button 
                  onClick={() => user ? navigate('/checkout') : navigate('/login')}
                  disabled={user && ((!cart.items || cart.items.length === 0) || cart.vendorOpen === false)} 
                  className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-gray-900/20 hover:bg-black hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:shadow-none disabled:hover:translate-y-0 disabled:cursor-not-allowed group"
              >
                {user ? (cart.vendorOpen === false ? t('home.stallClosedBtn') : t('home.proceedOrder')) : t('home.loginToOrderBtn')}
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* Mobile: thanh giỏ cố định dưới */}
      {user?.role === 'student' && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-gray-200 px-4 py-3 flex items-center justify-between gap-3 shadow-[0_-8px_30px_rgba(0,0,0,0.08)]">
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase">{t('home.cart')}</p>
            <p className="text-lg font-black text-gray-900">
              {cart.totalPrice?.toLocaleString() || 0}đ
              <span className="text-xs text-gray-400 font-bold ml-1">· {cart.items?.length || 0} {t('home.items')}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => (user ? navigate('/checkout') : navigate('/login'))}
            disabled={user && ((!cart.items?.length) || cart.vendorOpen === false)}
            className="shrink-0 bg-gray-900 text-white px-5 py-3 rounded-xl font-black text-sm disabled:opacity-50"
          >
            {t('home.checkout')}
          </button>
        </div>
      )}

      {detailItem && (
        <FoodDetailModal
          itemId={detailItem._id}
          initialItem={detailItem}
          onClose={() => setDetailItem(null)}
          onAddedToCart={(data) => setCart(data?.cart || data)}
          onItemUpdated={(updated) => {
            setMenuItems((prev) =>
              prev.map((i) => (i._id === updated._id ? { ...i, rating: updated.rating, numReviews: updated.numReviews, reviews: updated.reviews } : i))
            );
            setDetailItem((d) => (d?._id === updated._id ? { ...d, ...updated } : d));
          }}
        />
      )}

      <WalletWidget isOpen={isWalletOpen} onClose={() => setIsWalletOpen(false)} />
      <Footer />

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}} />
    </div>
  );
};

export default Home;