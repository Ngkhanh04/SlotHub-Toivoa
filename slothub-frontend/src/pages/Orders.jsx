import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import { QRCodeSVG } from 'qrcode.react'; 
import { 
  ArrowLeft, Clock, CheckCircle2, XCircle, 
  ChefHat, QrCode, Store, Receipt, X, Loader2, Star, MessageSquare, Send, AlertTriangle, Timer
} from 'lucide-react';
import { useLocale } from '../context/LocaleContext';
import LanguageToggle from '../components/LanguageToggle';
import {
  isPickupCodeExpired,
  getPickupCodeRemainingMs,
  formatRemainingTime
} from '../utils/pickupCode';

const Orders = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { t } = useLocale();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State quản lý Popup
  const [selectedOrderQR, setSelectedOrderQR] = useState(null);
  const [selectedOrderReview, setSelectedOrderReview] = useState(null);

  // State cho Form Đánh giá Quán
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reportOrder, setReportOrder] = useState(null);
  const [reportType, setReportType] = useState('BAD_QUALITY');
  const [reportDesc, setReportDesc] = useState('');
  const [reportSending, setReportSending] = useState(false);
  const [qrTick, setQrTick] = useState(0);

  useEffect(() => {
    if (!selectedOrderQR) return undefined;
    const timer = setInterval(() => setQrTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, [selectedOrderQR]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    const fetchOrders = async () => {
      try {
        const res = await api.get('/orders/my-orders');
        setOrders(res.data);
      } catch (error) {
        console.error("Lỗi lấy đơn hàng:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [user, navigate]);

  // Hàm chuyển đổi Trạng thái đơn hàng
  const renderStatus = (status) => {
    const label = t(`orders.status.${status}`) || t('orders.status.unknown');
    const styles = {
      Pending: 'text-orange-500 bg-orange-50 border-orange-100',
      Processing: 'text-blue-500 bg-blue-50 border-blue-100',
      Ready: 'text-green-500 bg-green-50 border-green-200 animate-pulse',
      Completed: 'text-gray-500 bg-gray-100 border-gray-200',
      Cancelled: 'text-red-500 bg-red-50 border-red-100',
    };
    const icons = { Pending: Clock, Processing: ChefHat, Ready: CheckCircle2, Completed: CheckCircle2, Cancelled: XCircle };
    const Icon = icons[status] || Clock;
    const cls = styles[status] || 'text-gray-500 bg-gray-100 border-gray-200';
    return (
      <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${cls}`}>
        <Icon size={14} /> {label}
      </span>
    );
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    if (!reportDesc.trim()) return alert('Vui lòng mô tả vấn đề');
    setReportSending(true);
    try {
      const res = await api.post('/reports', {
        orderId: reportOrder._id,
        issueType: reportType,
        description: reportDesc.trim()
      });
      alert(res.data.message || 'Đã gửi khiếu nại');
      const convId = res.data.conversationId;
      setReportOrder(null);
      setReportDesc('');
      navigate(convId ? `/messages?c=${convId}` : '/messages');
    } catch (err) {
      alert(err.response?.data?.message || 'Gửi khiếu nại thất bại');
    } finally {
      setReportSending(false);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return alert("Hãy để lại vài dòng nhận xét nhé!");

    setIsSubmittingReview(true);
    try {
      // Gọi API Review Quán của bạn (Giả sử route là /api/reviews)
      await api.post('/reviews', {
        vendorId: selectedOrderReview.vendor._id,
        rating,
        comment
      });
      alert("🎉 Cảm ơn bạn đã đánh giá chất lượng phục vụ của quán!");
      setSelectedOrderReview(null);
      setComment('');
      setRating(5);
    } catch (err) {
      alert(err.response?.data?.message || "Lỗi gửi đánh giá!");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-[#F9FAFB]">
      <Loader2 size={40} className="text-[#F27124] animate-spin" />
    </div>
  );

  return (
    <div className="bg-[#F9FAFB] min-h-screen pb-20 font-sans text-gray-800">
      {/* HEADER */}
      <header className="bg-white px-8 py-4 shadow-sm sticky top-0 z-40 flex items-center gap-4 border-b border-gray-100">
        <button onClick={() => navigate('/')} className="p-2 bg-gray-50 hover:bg-orange-50 hover:text-[#F27124] rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-black text-gray-800 flex-1">{t('orders.title')}</h1>
        <LanguageToggle />
      </header>

      <div className="max-w-3xl mx-auto mt-8 px-4">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm">
            <Receipt size={64} className="text-gray-300 mb-4" />
            <h2 className="text-xl font-bold text-gray-800 mb-2">Bạn chưa có đơn hàng nào</h2>
            <p className="text-gray-500 mb-6">Hãy lượn một vòng Canteen để xem có món gì ngon không nhé!</p>
            <button onClick={() => navigate('/')} className="bg-[#F27124] text-white px-8 py-3 rounded-full font-bold hover:bg-[#D95F1B] transition-colors shadow-lg shadow-orange-200">
              Đi đặt món ngay
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map(order => {
              // Điều kiện hiện nút mã QR: Đơn chưa hoàn thành và chưa hủy
              const pickupExpired = isPickupCodeExpired(order);
              const canShowQR =
                order.paymentStatus === 'Paid' &&
                order.status !== 'Completed' &&
                order.status !== 'Cancelled' &&
                !pickupExpired;
              // Điều kiện hiện nút Đánh giá: Đã hoàn thành (Ăn xong)
              const canReview = order.status === 'Completed';
              const canReport = order.status !== 'Cancelled' && order.status !== 'Pending';

              return (
                <div key={order._id} className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow relative overflow-hidden">
                  
                  <div className={`absolute left-0 top-0 bottom-0 w-2 rounded-l-[2rem] ${order.status === 'Completed' ? 'bg-gray-300' : order.status === 'Cancelled' ? 'bg-red-400' : 'bg-[#F27124]'}`}></div>

                  <div className="flex justify-between items-start mb-4 border-b border-dashed border-gray-200 pb-4 pl-4">
                    <div>
                      <p className="text-xs text-gray-400 font-bold mb-1 tracking-wider uppercase">Mã đơn: #{order._id.slice(-6)}</p>
                      <h3 className="font-black text-gray-800 text-lg flex items-center gap-2">
                        <Store size={18} className="text-[#F27124]" /> 
                        {order.vendor?.name || 'Canteen FPT'}
                      </h3>
                      <p className="text-xs text-gray-400 mt-1">{new Date(order.createdAt).toLocaleString('vi-VN')}</p>
                    </div>
                    <div>{renderStatus(order.status)}</div>
                  </div>

                  <div className="pl-4 mb-4">
                    <ul className="space-y-2">
                      {order.items.map((item, idx) => (
                        <li key={idx} className="flex justify-between items-center text-sm">
                          <div className="flex items-center gap-3">
                            <img
                              src={item.menuItem?.imageUrl || 'https://via.placeholder.com/50?text=Mon'}
                              alt={item.menuItem?.name || 'Món ăn'}
                              className="w-10 h-10 rounded-lg object-cover border border-gray-100 shrink-0"
                              onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/50?text=Mon'; }}
                            />
                            <span className="font-black text-[#F27124]">x{item.quantity}</span>
                            <span className="font-medium text-gray-700">{item.menuItem?.name || 'Món ăn'}</span>
                          </div>
                          <span className="text-gray-500 font-bold">{(item.price * item.quantity).toLocaleString()}đ</span>
                        </li>
                      ))}
                    </ul>
                    {order.note && (
                      <p className="text-xs text-gray-500 bg-gray-50 p-2.5 rounded-xl mt-3 border border-gray-100">
                        <strong className="text-gray-700">Ghi chú:</strong> {order.note}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pl-4 pt-4 border-t border-gray-100">
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500 font-bold">Tổng thanh toán:</span>
                      <span className={`text-xl font-black ${order.status === 'Cancelled' ? 'text-gray-400 line-through' : 'text-[#F27124]'}`}>
                        {order.totalPrice.toLocaleString()}đ
                      </span>
                    </div>

                    {/* HIỂN THỊ NÚT TƯƠNG ỨNG VỚI TRẠNG THÁI */}
                    {canShowQR && (
                      <button 
                        onClick={() => setSelectedOrderQR(order)}
                        className="bg-orange-50 text-[#F27124] border border-orange-200 px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-[#F27124] hover:text-white transition-colors"
                      >
                        <QrCode size={18} /> Mã nhận món
                      </button>
                    )}
                    {order.paymentStatus === 'Paid' &&
                      order.status !== 'Completed' &&
                      order.status !== 'Cancelled' &&
                      pickupExpired && (
                      <span className="text-xs font-bold text-red-500 bg-red-50 border border-red-100 px-3 py-2 rounded-xl">
                        Mã nhận món đã hết hạn (2h)
                      </span>
                    )}
                    
                    <div className="flex flex-wrap gap-2 justify-end">
                      {canReport && (
                        <button
                          type="button"
                          onClick={() => { setReportOrder(order); setReportType('BAD_QUALITY'); }}
                          className="bg-amber-50 text-amber-700 border border-amber-200 px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-amber-100 text-sm"
                        >
                          <AlertTriangle size={16} /> Report / Chat quầy
                        </button>
                      )}
                      {canReview && (
                        <button 
                          type="button"
                          onClick={() => setSelectedOrderReview(order)}
                          className="bg-white text-blue-500 border border-blue-200 px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-50 transition-colors shadow-sm text-sm"
                        >
                          <MessageSquare size={16} /> Đánh giá
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ================= MODAL 1: HIỂN THỊ MÃ QR LẤY MÓN ================= */}
      {selectedOrderQR && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl relative overflow-hidden flex flex-col items-center p-8 animate-in zoom-in-95 duration-200">
            
            <button onClick={() => setSelectedOrderQR(null)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-800 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors">
              <X size={24} />
            </button>

            <div className="w-16 h-16 bg-orange-50 text-[#F27124] rounded-full flex items-center justify-center mb-4">
              <QrCode size={32} />
            </div>
            
            <h3 className="text-2xl font-black text-gray-800 mb-1">Mã nhận món</h3>
            {isPickupCodeExpired(selectedOrderQR) ? (
              <p className="text-red-500 text-sm mb-6 text-center font-bold px-2">
                Mã đã hết hạn sau 2 giờ kể từ khi thanh toán. Vui lòng liên hệ quầy.
              </p>
            ) : (
              <>
            <p className="text-gray-500 text-sm mb-3 text-center font-medium px-2">
              Đưa mã này cho chủ quầy quét trong vòng <strong className="text-[#F27124]">2 giờ</strong>.
            </p>
            <p className="flex items-center gap-2 text-sm font-black text-[#F27124] bg-orange-50 border border-orange-100 px-4 py-2 rounded-full mb-6 flex-wrap justify-center">
              <Timer size={16} />
              Còn {formatRemainingTime(getPickupCodeRemainingMs(selectedOrderQR))}
              <span className="sr-only">{qrTick}</span>
            </p>

            <div className="bg-white p-4 rounded-3xl shadow-inner border-2 border-dashed border-orange-200 mb-6">
              <QRCodeSVG 
                value={selectedOrderQR._id}
                size={200}
                bgColor={"#ffffff"}
                fgColor={"#1f2937"} 
                level={"Q"}
                includeMargin={false}
              />
            </div>

            <div className="w-full bg-gray-50 rounded-2xl p-4 text-center border border-gray-100">
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Mã OTP</p>
              <p className="font-mono text-xl font-black text-[#F27124] tracking-widest">{selectedOrderQR.otpCode || selectedOrderQR._id.slice(-6).toUpperCase()}</p>
            </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ================= MODAL 2: ĐÁNH GIÁ GIAN HÀNG ================= */}
      {selectedOrderReview && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col p-8 animate-in slide-in-from-bottom-10 duration-200">
            
            <button onClick={() => setSelectedOrderReview(null)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-800 bg-gray-50 rounded-full transition-colors">
              <X size={24} />
            </button>

            <h3 className="text-2xl font-black text-gray-800 mb-2">Đánh giá gian hàng</h3>
            <p className="text-gray-500 text-sm mb-6 font-medium">
              Bạn cảm thấy dịch vụ của <strong className="text-gray-800">{selectedOrderReview.vendor?.name}</strong> hôm nay thế nào?
            </p>

            <form onSubmit={handleSubmitReview}>
              <div className="flex justify-center gap-3 mb-8">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star 
                    key={star} 
                    size={36} 
                    onClick={() => setRating(star)}
                    className={`cursor-pointer transition-all hover:scale-110 ${star <= rating ? 'fill-yellow-400 text-yellow-400 drop-shadow-sm' : 'text-gray-200 fill-gray-100'}`}
                  />
                ))}
              </div>
              
              <textarea 
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Thái độ nhân viên, tốc độ ra món..."
                rows="4"
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 text-sm focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-50 outline-none transition-all mb-6 resize-none"
              ></textarea>
              
              <button 
                type="submit"
                disabled={isSubmittingReview}
                className="w-full bg-blue-500 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-blue-600 hover:shadow-lg hover:shadow-blue-200 transition-all disabled:opacity-50"
              >
                {isSubmittingReview ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                Gửi đánh giá quán
              </button>
            </form>
          </div>
        </div>
      )}

      {reportOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl p-8 relative">
            <button type="button" onClick={() => setReportOrder(null)} className="absolute top-4 right-4 p-2 text-gray-400 hover:bg-gray-100 rounded-full">
              <X size={22} />
            </button>
            <h3 className="text-xl font-black text-gray-800 mb-1">Khiếu nại & chat quầy</h3>
            <p className="text-sm text-gray-500 mb-4">
              Đơn #{reportOrder._id.slice(-6)} · {reportOrder.vendor?.name}
            </p>
            <form onSubmit={handleSubmitReport} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase">Loại vấn đề</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full mt-1 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium"
                >
                  <option value="MISSING_ITEM">Thiếu món</option>
                  <option value="BAD_QUALITY">Chất lượng kém</option>
                  <option value="WRONG_ITEM">Sai món</option>
                  <option value="ATTITUDE">Thái độ phục vụ</option>
                  <option value="OTHER">Khác</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase">Mô tả chi tiết</label>
                <textarea
                  value={reportDesc}
                  onChange={(e) => setReportDesc(e.target.value)}
                  rows={4}
                  required
                  placeholder="Mô tả vấn đề để quầy và admin hỗ trợ..."
                  className="w-full mt-1 border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={reportSending}
                className="w-full bg-[#F27124] text-white py-3 rounded-xl font-black flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {reportSending ? <Loader2 className="animate-spin" size={20} /> : <AlertTriangle size={18} />}
                Gửi & mở chat với quầy
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Orders;