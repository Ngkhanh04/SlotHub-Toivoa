import React, { useState, useEffect } from 'react';
import api from '../../../api/axios';
import { Bell, ShoppingBag, CheckCircle2, Loader2, Info, Star } from 'lucide-react';

const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} giờ trước`;
  return `${Math.floor(hrs / 24)} ngày trước`;
};

const VendorNotifications = ({ onGoOrders, onGoMenu }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/vendor/notifications');
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (error) {
      console.error('Lỗi lấy thông báo:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const t = setInterval(fetchNotifications, 30000);
    return () => clearInterval(t);
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await api.put(`/vendor/notifications/${id}/read`);
      fetchNotifications();
    } catch (error) {
      console.error('Lỗi cập nhật:', error);
    }
  };

  const handleClick = async (noti) => {
    if (!noti.isRead) await handleMarkAsRead(noti._id);
    if (noti.type === 'NEW_ORDER' && onGoOrders) onGoOrders();
    if (noti.type === 'NEW_REVIEW' && onGoMenu) onGoMenu();
  };

  const renderIcon = (type) => {
    if (type === 'NEW_ORDER') {
      return (
        <div className="w-12 h-12 rounded-full bg-[#F27124]/10 flex items-center justify-center text-[#F27124] border border-[#F27124]/20 shadow-lg">
          <ShoppingBag size={20} />
        </div>
      );
    }
    if (type === 'NEW_REVIEW') {
      return (
        <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20 shadow-lg">
          <Star size={20} className="fill-amber-400" />
        </div>
      );
    }
    return (
      <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20 shadow-lg">
        <Info size={20} />
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex h-64 justify-center items-center">
        <Loader2 className="animate-spin text-[#F27124]" size={40} />
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-300 max-w-5xl mx-auto space-y-6">
      <div className="portal-card border rounded-3xl p-6 border border-[var(--portal-border)] shadow-sm flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="bg-[var(--portal-surface)] p-3 rounded-xl border border-[var(--portal-border)]">
              <Bell className="portal-text-secondary" size={24} />
            </div>
            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white text-xs font-black flex items-center justify-center rounded-full border-2 border-[var(--portal-card)]">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight">Thông báo quầy</h2>
            <p className="text-sm portal-muted font-medium">Đơn mới từ sinh viên và cập nhật hệ thống</p>
          </div>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => handleMarkAsRead('all')}
            className="bg-[var(--portal-surface)] hover:bg-[var(--portal-surface-hover)] text-[var(--portal-text)] px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 border border-[var(--portal-border)]"
          >
            <CheckCircle2 size={16} className="text-green-400" /> Đánh dấu đọc tất cả
          </button>
        )}
      </div>

      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="portal-card border rounded-3xl border border-[var(--portal-border)] p-12 text-center">
            <ShoppingBag size={48} className="mx-auto text-gray-600 mb-4 opacity-40" />
            <p className="portal-muted font-bold">Chưa có thông báo nào</p>
            <p className="text-sm portal-muted mt-2">Khi sinh viên đặt đơn, bạn sẽ thấy tại đây.</p>
          </div>
        ) : (
          notifications.map((noti) => (
            <button
              key={noti._id}
              type="button"
              onClick={() => handleClick(noti)}
              className={`w-full text-left portal-card border rounded-2xl border p-5 flex gap-4 items-start transition-all hover:border-[#F27124]/40 ${
                noti.isRead ? 'border-[var(--portal-border)] opacity-70' : 'border-[#F27124]/30 shadow-lg shadow-orange-500/5'
              }`}
            >
              {renderIcon(noti.type)}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between gap-2 items-start">
                  <h4 className={`font-black ${noti.isRead ? 'portal-muted' : 'text-[var(--portal-text)]'}`}>{noti.title}</h4>
                  {!noti.isRead && (
                    <span className="shrink-0 text-[10px] font-black uppercase bg-[#F27124] text-white px-2 py-0.5 rounded-md">
                      Mới
                    </span>
                  )}
                </div>
                <p className="text-sm portal-muted mt-1">{noti.message}</p>
                <p className="text-xs text-gray-600 mt-2 font-medium">{timeAgo(noti.createdAt)}</p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default VendorNotifications;
