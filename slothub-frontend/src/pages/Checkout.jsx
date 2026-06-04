import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import { 
  ArrowLeft, Wallet, Receipt, Clock, FileText, 
  CheckCircle2, AlertCircle, Loader2, Plus, Minus, Trash2, CreditCard,
  Sun, CloudSun, Sunset, Moon, Sparkles
} from 'lucide-react';
import { PICKUP_SLOT_STORAGE_KEY, pickDefaultSlotId } from '../utils/vendorHours';
import { useLocale } from '../context/LocaleContext';
import LanguageToggle from '../components/LanguageToggle';

const Checkout = () => {
  const { balance, fetchBalance, user } = useContext(AuthContext);
  const { t } = useLocale();
  const navigate = useNavigate();

  const [cart, setCart] = useState({ items: [], totalPrice: 0, vendorOpen: true, vendorStatusMessage: '' });
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [pickupSlot, setPickupSlot] = useState('');
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('wallet');
  const [timeSlots, setTimeSlots] = useState([]);

  const slotIcons = [<Sun size={20} />, <CloudSun size={20} />, <Sunset size={20} />, <Moon size={20} />];
  const slotLabelsRaw = t('pickup.slotLabels');
  const slotLabels = Array.isArray(slotLabelsRaw) ? slotLabelsRaw : ['Bữa sáng', 'Giờ cao điểm', 'Nạp năng lượng', 'Tan học'];

  useEffect(() => {
    if (!user) return navigate('/login');

    const loadData = async () => {
      try {
        const [cartRes, slotsRes] = await Promise.all([
          api.get('/cart'),
          api.get('/timeslots'),
        ]);
        if (cartRes.data?.items) setCart(cartRes.data);
        else if (cartRes.data?.cart) setCart(cartRes.data.cart);
        const slots = slotsRes.data || [];
        setTimeSlots(slots);
        const saved = localStorage.getItem(PICKUP_SLOT_STORAGE_KEY);
        let initial = '';
        if (saved && slots.some((s) => s._id === saved)) {
          initial = saved;
        } else if (slots.length) {
          initial = pickDefaultSlotId(slots);
        }
        if (initial) setPickupSlot(initial);
      } catch (err) {
        console.error("Lỗi tải dữ liệu checkout:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
    fetchBalance(); 
  }, [user, navigate, fetchBalance]);

  const handleUpdateQuantity = async (menuItemId, currentQuantity, change) => {
    const newQuantity = currentQuantity + change;
    if (newQuantity === 0) {
      try {
        const res = await api.delete(`/cart/remove/${menuItemId}`);
        setCart(res.data?.cart || res.data);
      } catch (err) {
        console.error("Lỗi xóa món:", err);
      }
      return;
    }
    try {
      const res = await api.post('/cart/add', { menuItemId, quantity: change });
      setCart(res.data?.cart || res.data);
    } catch (err) {
      alert(err.response?.data?.message || "Lỗi cập nhật số lượng");
    }
  };

  const handleRemoveItem = async (menuItemId) => {
    try {
      const res = await api.delete(`/cart/remove/${menuItemId}`);
      setCart(res.data?.cart || res.data);
    } catch (err) {
      console.error("Lỗi xóa món:", err);
    }
  };

  const isEnoughBalance = balance >= cart.totalPrice;

  const handlePlaceOrder = async () => {
    if (cart.vendorOpen === false) {
      return alert(cart.vendorStatusMessage || 'Quán đã đóng cửa, không thể đặt đơn lúc này.');
    }
    if (!pickupSlot) return alert(t('checkout.selectSlot'));
    if (paymentMethod === 'wallet' && !isEnoughBalance) return;

    setIsProcessing(true);
    try {
      const res = await api.post('/orders', {
        paymentMethod, 
        deliveryType: 'pickup',
        pickupSlot,
        note
      });

      if (res.data.isVNPay) {
        const paymentRes = await api.post('/payment/create_payment_url', {
            orderId: res.data.order._id
        });
        window.location.href = paymentRes.data.paymentUrl;
        return; 
      }

      alert("🎉 Đặt hàng bằng Ví thành công! Vui lòng lấy mã QR ở phần Đơn hàng để nhận món nhé.");
      await fetchBalance(); 
      navigate('/orders'); 
      
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || "Lỗi khi đặt hàng!";
      alert(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-[#F9FAFB]">
      <div className="flex flex-col items-center gap-4">
        <Loader2 size={44} className="text-[#F27124] animate-spin" />
        <p className="text-gray-500 font-bold animate-pulse">Đang tải dữ liệu thanh toán...</p>
      </div>
    </div>
  );

  if (!cart.items?.length) return (
    <div className="flex flex-col h-screen items-center justify-center bg-[#F9FAFB]">
      <Receipt size={64} className="text-gray-300 mb-4" />
      <h2 className="text-2xl font-black text-gray-800 mb-2">Giỏ hàng trống</h2>
      <p className="text-gray-500 font-medium mb-6">Bạn chưa chọn món nào để thanh toán cả.</p>
      <button 
        onClick={() => navigate('/')}
        className="bg-gray-900 text-white px-8 py-3.5 rounded-xl font-bold hover:bg-black transition-all shadow-lg active:scale-95"
      >
        Quay lại Menu Canteen
      </button>
    </div>
  );

  return (
    <div className="bg-[#F8FAFC] min-h-screen pb-24 font-sans text-gray-800 relative">
      
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-[#F27124]/10 to-transparent pointer-events-none"></div>

      {/* HEADER */}
      <header className="bg-white/70 backdrop-blur-xl px-4 sm:px-8 py-4 shadow-sm sticky top-0 z-50 flex items-center gap-4 border-b border-gray-100">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors bg-white shadow-sm border border-gray-100">
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight leading-none">{t('checkout.titlePage')}</h1>
          <p className="text-xs text-[#F27124] font-bold mt-1 uppercase tracking-widest flex items-center gap-1">
            <Sparkles size={12} /> FPT Canteen
          </p>
        </div>
        <LanguageToggle className="ml-auto shrink-0" />
      </header>

      <div className="max-w-[1100px] mx-auto mt-8 flex flex-col lg:flex-row gap-8 px-4 relative z-10">
        
        {/* ================= CỘT TRÁI: THÔNG TIN GIAO HÀNG ================= */}
        <div className="flex-1 space-y-6">
          
          {/* KHUNG GIỜ */}
          <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-xl shadow-gray-200/40 border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-500 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-bl-[100px] -z-0"></div>
            <h2 className="text-xl font-black text-gray-900 flex items-center gap-2 mb-2 relative z-10">
              <Clock className="text-[#F27124]" size={24} /> {t('checkout.pickupTitle')}
            </h2>
            <p className="text-xs text-gray-500 font-medium mb-5 relative z-10">{t('checkout.pickupHint')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
              {timeSlots.length === 0 ? (
                <p className="text-gray-500 font-medium col-span-2">Chưa có khung giờ. Vui lòng thử lại sau.</p>
              ) : timeSlots.map((slot, index) => {
                const slotTime = `${slot.startTime} - ${slot.endTime}`;
                const isSelected = pickupSlot === slot._id;
                return (
                <button 
                  key={slot._id}
                  onClick={() => {
                    setPickupSlot(slot._id);
                    localStorage.setItem(PICKUP_SLOT_STORAGE_KEY, slot._id);
                  }}
                  className={`group flex items-center p-4 rounded-2xl border-2 transition-all text-left overflow-hidden relative ${
                    isSelected 
                      ? 'border-[#F27124] bg-gradient-to-br from-orange-50 to-orange-100/50 shadow-md scale-[1.02]' 
                      : 'border-gray-100 bg-gray-50 hover:border-orange-200 hover:bg-orange-50/30'
                  }`}
                >
                  <div className={`p-3 rounded-xl mr-4 transition-colors ${isSelected ? 'bg-[#F27124] text-white shadow-lg shadow-orange-500/30' : 'bg-white text-gray-400 border border-gray-200 group-hover:text-[#F27124]'}`}>
                    {slotIcons[index % slotIcons.length]}
                  </div>
                  <div className="flex-1">
                    <p className={`font-black text-lg ${isSelected ? 'text-[#F27124]' : 'text-gray-900'}`}>{slotTime}</p>
                    <p className={`text-xs font-bold mt-0.5 ${isSelected ? 'text-orange-600' : 'text-gray-500'}`}>{slotLabels[index % slotLabels.length]}</p>
                  </div>
                  {isSelected && (
                    <div className="absolute right-4 text-[#F27124] animate-in zoom-in duration-300">
                      <CheckCircle2 size={24} className="fill-orange-100" />
                    </div>
                  )}
                </button>
              );})}
            </div>
          </div>

          {/* LỜI NHẮN */}
          <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-xl shadow-gray-200/40 border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
            <h2 className="text-xl font-black text-gray-900 flex items-center gap-2 mb-5">
              <FileText className="text-[#F27124]" size={24} /> Ghi chú cho quán <span className="text-sm font-medium text-gray-400 ml-2">(Tùy chọn)</span>
            </h2>
            <textarea 
              value={note} onChange={e=>setNote(e.target.value)}
              placeholder="VD: Cô ơi cho con nhiều tương ớt, không hành..." 
              rows="3"
              className="w-full bg-gray-50/50 border border-gray-200 rounded-2xl py-4 px-5 focus:bg-white focus:border-[#F27124] focus:ring-4 focus:ring-orange-50 outline-none transition-all font-medium resize-none text-gray-700"
            ></textarea>
          </div>

          {/* PHƯƠNG THỨC THANH TOÁN */}
          <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-xl shadow-gray-200/40 border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
            <h2 className="text-xl font-black text-gray-900 flex items-center gap-2 mb-5">
              <CreditCard className="text-[#F27124]" size={24} /> Phương thức thanh toán
            </h2>
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Ví SlotHub */}
              <div 
                onClick={() => setPaymentMethod('wallet')}
                className={`flex-1 p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-center ${
                  paymentMethod === 'wallet' 
                  ? 'border-[#F27124] bg-orange-50 shadow-md scale-[1.02]' 
                  : 'border-gray-100 bg-gray-50 hover:border-orange-200'
                }`}
              >
                <div className="flex items-center gap-3 font-black mb-2 text-gray-900 text-lg">
                  <div className={`p-2 rounded-lg ${paymentMethod === 'wallet' ? 'bg-[#F27124] text-white' : 'bg-gray-200 text-gray-500'}`}>
                    <Wallet size={20} />
                  </div>
                  Ví SlotHub
                </div>
                <p className="text-sm text-gray-500 font-medium">
                  Số dư: <span className={`font-black ${isEnoughBalance ? 'text-green-600' : 'text-red-500'}`}>{balance?.toLocaleString()}đ</span>
                </p>
              </div>

              {/* VNPay */}
              <div 
                onClick={() => setPaymentMethod('vnpay')}
                className={`flex-1 p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-center ${
                  paymentMethod === 'vnpay' 
                  ? 'border-blue-500 bg-blue-50 shadow-md scale-[1.02]' 
                  : 'border-gray-100 bg-gray-50 hover:border-blue-200'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-white p-1 rounded-lg border border-gray-200 shadow-sm w-12 h-10 flex items-center justify-center">
                     <img src="https://vnpay.vn/s1/vnpay/logo.png" alt="VNPay" className="w-full object-contain" />
                  </div>
                  <span className="text-blue-600 font-black italic text-xl tracking-wider">VNPAY</span>
                </div>
                <p className="text-sm text-gray-500 font-medium">{t('checkout.vnpayHint')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ================= CỘT PHẢI: TÓM TẮT ĐƠN HÀNG ================= */}
        <aside className="w-full lg:w-[420px] shrink-0 h-fit">
          <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] shadow-2xl shadow-gray-200/50 border border-gray-100 sticky top-28">
            <h2 className="text-xl font-black mb-6 border-b border-dashed border-gray-200 pb-4 flex items-center justify-between">
              <span className="flex items-center gap-2"><Receipt className="text-[#F27124]" size={24} /> Hóa đơn</span>
              <span className="bg-orange-100 text-[#F27124] text-xs font-black px-3 py-1 rounded-full">{cart.items.length} món</span>
            </h2>
            
            {/* DANH SÁCH MÓN */}
            <div className="space-y-4 mb-6 max-h-[350px] overflow-y-auto custom-scrollbar pr-2">
              {cart.items.map(i => (
                <div key={i.menuItem?._id} className="flex flex-col py-4 border-b border-gray-50 last:border-0 gap-3">
                  <div className="flex items-center gap-4">
                    <img src={i.menuItem?.imageUrl || 'https://via.placeholder.com/100'} alt={i.menuItem?.name} className="w-16 h-16 rounded-2xl object-cover shadow-sm border border-gray-100 shrink-0" />
                    <div className="flex-1">
                      <p className="font-bold text-gray-900 text-sm leading-tight mb-1">{i.menuItem?.name}</p>
                      <p className="text-[#F27124] font-black text-sm">{i.menuItem?.price?.toLocaleString()}đ</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between bg-gray-50 p-2 rounded-xl border border-gray-100">
                    <div className="flex items-center">
                      <button 
                        onClick={() => handleUpdateQuantity(i.menuItem?._id, i.quantity, -1)}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-white text-gray-600 shadow-sm hover:bg-orange-50 hover:text-[#F27124] transition-colors"
                      >
                        {i.quantity === 1 ? <Trash2 size={14} className="text-red-500" /> : <Minus size={14} />}
                      </button>
                      <span className="w-10 text-center font-black text-gray-900">{i.quantity}</span>
                      <button 
                        onClick={() => handleUpdateQuantity(i.menuItem?._id, i.quantity, 1)}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-[#F27124] text-white shadow-sm hover:bg-[#D95F1B] transition-colors"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <span className="font-black text-gray-900 text-lg">{(i.menuItem?.price * i.quantity).toLocaleString()}đ</span>
                      <button 
                        onClick={() => handleRemoveItem(i.menuItem?._id)}
                        className="text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* TỔNG TIỀN */}
            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-500 font-bold text-sm">Tạm tính</span>
                <span className="font-black text-gray-700">{cart.totalPrice?.toLocaleString()}đ</span>
              </div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-gray-500 font-bold text-sm">Phí dịch vụ</span>
                <span className="font-black text-green-500 text-sm">Miễn phí</span>
              </div>
              <div className="flex justify-between items-end pt-3 border-t border-dashed border-gray-200 mt-2">
                <span className="font-bold text-gray-900">Tổng cộng</span>
                <span className="text-3xl font-black text-[#F27124]">{cart.totalPrice?.toLocaleString()}<span className="text-lg text-[#F27124] ml-1">đ</span></span>
              </div>
            </div>

            {cart.vendorOpen === false && (
              <div className="p-4 rounded-xl mb-6 bg-red-50 border border-red-100 flex items-start gap-3">
                <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-red-600 mb-0.5">Quán đã đóng cửa</p>
                  <p className="text-xs text-red-500 font-medium">{cart.vendorStatusMessage || 'Không thể đặt đơn ngoài giờ phục vụ của quầy.'}</p>
                </div>
              </div>
            )}

            {/* CẢNH BÁO SỐ DƯ */}
            {paymentMethod === 'wallet' && !isEnoughBalance && (
              <div className="p-4 rounded-xl mb-6 bg-red-50 border border-red-100 flex items-start gap-3 animate-in shake">
                <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-red-600 mb-0.5">Số dư không đủ!</p>
                  <p className="text-xs text-red-500 font-medium">Bạn cần nạp thêm <span className="font-black">{(cart.totalPrice - balance).toLocaleString()}đ</span> vào Ví để đặt đơn.</p>
                </div>
              </div>
            )}

            {/* NÚT THANH TOÁN */}
            <button 
              onClick={handlePlaceOrder}
              disabled={isProcessing || cart.vendorOpen === false || (paymentMethod === 'wallet' && !isEnoughBalance)}
              className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-lg transition-all shadow-xl ${
                cart.vendorOpen === false || (paymentMethod === 'wallet' && !isEnoughBalance)
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none border border-gray-200'
                : paymentMethod === 'vnpay' 
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-blue-500/30 hover:scale-[1.02] active:scale-95'
                  : 'bg-gradient-to-r from-[#F27124] to-[#ff985e] text-white shadow-orange-500/30 hover:scale-[1.02] active:scale-95'
              }`}
            >
              {isProcessing ? <Loader2 className="animate-spin" size={24} /> : (
                <>
                  {cart.vendorOpen === false ? 'QUÁN ĐÃ ĐÓNG CỬA' : paymentMethod === 'vnpay' ? 'THANH TOÁN QUA VNPAY' : (
                    isEnoughBalance ? <><CheckCircle2 size={24} /> XÁC NHẬN ĐẶT ĐƠN</> : <><Wallet size={24} /> NẠP THÊM TIỀN</>
                  )}
                </>
              )}
            </button>
          </div>
        </aside>
        
      </div>
    </div>
  );
};

export default Checkout;