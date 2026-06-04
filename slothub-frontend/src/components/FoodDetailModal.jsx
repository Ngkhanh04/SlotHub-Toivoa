import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import {
  X, Store, Flame, Plus, Minus, ShoppingCart, Star,
  Loader2, Clock, ShieldCheck, Send, MessageSquare
} from 'lucide-react';

const FoodDetailModal = ({ itemId, initialItem, onClose, onAddedToCart, onItemUpdated }) => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [item, setItem] = useState(initialItem || null);
  const [loading, setLoading] = useState(!initialItem);
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const userId = user?._id || user?.id;

  const loadItem = async (id) => {
    setLoading(true);
    try {
      const res = await api.get(`/menuitems/${id}`);
      setItem(res.data);
      return res.data;
    } catch {
      setItem(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  useEffect(() => {
    if (!itemId) return;
    if (initialItem?._id === itemId) {
      setItem(initialItem);
      setLoading(false);
    } else {
      loadItem(itemId);
    }
    setQuantity(1);
    setRating(5);
    setComment('');
  }, [itemId, initialItem]);

  const hasReviewed = useMemo(() => {
    if (!userId || !item?.reviews) return false;
    return item.reviews.some((r) => {
      const rid = r.user?._id || r.user;
      return rid && String(rid) === String(userId);
    });
  }, [item?.reviews, userId]);

  const handleAdd = async () => {
    if (!user) {
      alert('Vui lòng đăng nhập để đặt món!');
      navigate('/login');
      return;
    }
    setIsAdding(true);
    try {
      const res = await api.post('/cart/add', { menuItemId: itemId, quantity });
      onAddedToCart?.(res.data?.cart || res.data);
      onClose();
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi thêm giỏ hàng');
    } finally {
      setIsAdding(false);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!user) {
      alert('Vui lòng đăng nhập để đánh giá!');
      navigate('/login');
      return;
    }
    if (!comment.trim()) {
      alert('Bạn chưa nhập nội dung đánh giá!');
      return;
    }
    setIsSubmittingReview(true);
    try {
      const res = await api.post(`/menuitems/${itemId}/reviews`, { rating, comment: comment.trim() });
      const updated = res.data?.menuItem || (await loadItem(itemId));
      if (updated) {
        setItem(updated);
        onItemUpdated?.(updated);
      }
      setComment('');
      setRating(5);
      alert(res.data?.message || 'Cảm ơn bạn đã đánh giá!');
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi gửi đánh giá');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (!itemId) return null;

  const isVendorClosed = item?.vendorIsOpen === false;
  const isOutOfStock = !item || item.isAvailable === false || item.countInStock <= 0 || isVendorClosed;
  const reviews = [...(item?.reviews || [])].reverse().slice(0, 8);
  const canReview = user?.role === 'student' && !hasReviewed;

  const reviewerName = (r) => r.name || r.user?.name || 'Sinh viên';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full bg-white shadow-md border border-gray-100 flex items-center justify-center text-gray-600 hover:text-red-500"
        >
          <X size={20} />
        </button>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="animate-spin text-[#F27124]" size={36} />
          </div>
        ) : !item ? (
          <div className="p-8 text-center">
            <p className="font-bold text-gray-700">Không tìm thấy món</p>
            <button type="button" onClick={onClose} className="mt-4 text-[#F27124] font-bold text-sm">
              Đóng
            </button>
          </div>
        ) : (
          <>
            <div className="relative h-40 sm:h-44 shrink-0 bg-gray-100">
              <img
                src={item.imageUrl || 'https://via.placeholder.com/400?text=Food'}
                alt={item.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              {isOutOfStock && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <span className="bg-white text-gray-900 px-4 py-1.5 rounded-full text-xs font-black uppercase">
                    {isVendorClosed ? 'Không nhận khung giờ' : 'Tạm hết'}
                  </span>
                </div>
              )}
              <div className="absolute bottom-3 left-4 right-12">
                <h2 className="text-xl font-black text-white leading-tight line-clamp-2">{item.name}</h2>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-[11px] font-bold text-white/90 flex items-center gap-1 bg-white/20 backdrop-blur px-2 py-0.5 rounded-md">
                    <Store size={11} /> {item.vendor?.name}
                  </span>
                  {(item.rating > 0 || item.numReviews > 0) && (
                    <span className="text-[11px] font-bold text-amber-300 flex items-center gap-0.5">
                      <Star size={11} className="fill-amber-300" />
                      {item.rating?.toFixed(1) || '0'} ({item.numReviews || 0})
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-[#F27124]">
                  {item.price?.toLocaleString()}<span className="text-sm text-gray-400 font-bold">đ</span>
                </span>
                {item.calories && (
                  <span className="text-[10px] font-bold text-orange-700 bg-orange-50 px-2 py-1 rounded-lg flex items-center gap-1">
                    <Flame size={12} /> {item.calories} kcal
                  </span>
                )}
              </div>

              {isVendorClosed && item.vendor?.openTime && (
                <p className="text-xs text-red-600 font-bold flex items-center gap-1 bg-red-50 px-3 py-2 rounded-xl">
                  <Clock size={14} /> Giờ quầy: {item.vendor.openTime} – {item.vendor.closeTime}
                </p>
              )}

              <p className="text-sm text-gray-600 leading-relaxed">
                {item.description || 'Món ngon tại canteen FPT — đặt nhanh, nhận đúng giờ slot.'}
              </p>

              <p className="text-[11px] text-green-700 font-bold flex items-center gap-1.5">
                <ShieldCheck size={14} /> Đảm bảo vệ sinh ATTP
              </p>

              {/* Form đánh giá sinh viên */}
              {user?.role === 'student' && (
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <MessageSquare size={14} className="text-[#F27124]" />
                    {hasReviewed ? 'Bạn đã đánh giá món này' : 'Viết đánh giá của bạn'}
                  </p>
                  {canReview ? (
                    <form onSubmit={handleSubmitReview} className="space-y-3 bg-orange-50/50 rounded-2xl p-4 border border-orange-100">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setRating(n)}
                            className="p-0.5 transition-transform hover:scale-110"
                          >
                            <Star
                              size={22}
                              className={n <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}
                            />
                          </button>
                        ))}
                        <span className="text-xs font-bold text-gray-500 ml-2">{rating}/5</span>
                      </div>
                      <textarea
                        rows={2}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Chia sẻ cảm nhận về món ăn..."
                        className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:border-[#F27124] focus:ring-2 focus:ring-orange-500/20 outline-none resize-none"
                      />
                      <button
                        type="submit"
                        disabled={isSubmittingReview}
                        className="w-full h-10 rounded-xl bg-gray-900 text-white font-black text-sm flex items-center justify-center gap-2 hover:bg-black disabled:opacity-50"
                      >
                        {isSubmittingReview ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        Gửi đánh giá
                      </button>
                    </form>
                  ) : hasReviewed ? (
                    <p className="text-xs text-gray-500 font-medium">Cảm ơn bạn! Mỗi món chỉ đánh giá một lần.</p>
                  ) : null}
                </div>
              )}

              {!user && (
                <p className="text-xs text-gray-500 font-medium border-t border-gray-100 pt-3">
                  <button type="button" onClick={() => navigate('/login')} className="text-[#F27124] font-bold hover:underline">
                    Đăng nhập
                  </button>
                  {' '}để đánh giá món ăn.
                </p>
              )}

              {reviews.length > 0 && (
                <div className="border-t border-gray-100 pt-3">
                  <p className="text-xs font-black text-gray-500 uppercase tracking-wider mb-2">
                    Đánh giá từ sinh viên ({item.numReviews || reviews.length})
                  </p>
                  <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                    {reviews.map((r, idx) => (
                      <div key={r._id || idx} className="bg-gray-50 rounded-xl p-2.5 text-xs">
                        <div className="flex items-center gap-1 mb-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} size={10} className={i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'} />
                          ))}
                          <span className="font-bold text-gray-700 ml-1">{reviewerName(r)}</span>
                        </div>
                        <p className="text-gray-600">{r.comment}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="shrink-0 p-4 pt-2 border-t border-gray-100 bg-gray-50/80 flex gap-3 items-center">
              <div className="flex items-center bg-white rounded-xl border border-gray-200 p-1 h-11">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={isOutOfStock || quantity <= 1}
                  className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-orange-50 disabled:opacity-40"
                >
                  <Minus size={16} />
                </button>
                <span className="w-8 text-center font-black text-sm">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  disabled={isOutOfStock}
                  className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-orange-50 disabled:opacity-40"
                >
                  <Plus size={16} />
                </button>
              </div>
              <button
                type="button"
                onClick={handleAdd}
                disabled={isOutOfStock || isAdding}
                className={`flex-1 h-11 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all ${
                  isOutOfStock
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-[#F27124] to-[#ff985e] text-white shadow-lg shadow-orange-500/25 hover:shadow-xl active:scale-[0.98]'
                }`}
              >
                {isAdding ? <Loader2 className="animate-spin" size={18} /> : <ShoppingCart size={18} />}
                {isVendorClosed ? 'Không đặt được' : isOutOfStock ? 'Hết món' : `Thêm • ${(item.price * quantity).toLocaleString()}đ`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default FoodDetailModal;
