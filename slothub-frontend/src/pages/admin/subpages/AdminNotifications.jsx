import React, { useState, useEffect } from 'react';
import api from '../../../api/axios';
import { Bell, ArrowDownToLine, ArrowUpFromLine, Store, AlertTriangle, Info, CheckCircle2, Loader2, UserPlus, Wallet } from 'lucide-react';

const AdminNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/admin/notifications');
      setNotifications(res.data.notifications);
      setUnreadCount(res.data.unreadCount);
    } catch (error) {
      console.error('Lỗi lấy thông báo:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await api.put(`/admin/notifications/${id}/read`);
      fetchNotifications(); // Tải lại để cập nhật giao diện
    } catch (error) {
      console.error('Lỗi cập nhật:', error);
    }
  };

  // Hàm render Icon và Màu sắc dựa trên loại thông báo
  const renderNotificationIcon = (type) => {
    switch (type) {
      case 'DEPOSIT':
        return <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 border border-green-500/20 shadow-lg"><ArrowDownToLine size={20} /></div>;
      case 'WITHDRAW':
        return <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 border border-orange-500/20 shadow-lg"><ArrowUpFromLine size={20} /></div>;
      case 'PAYOUT':
        return <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20 shadow-lg"><Wallet size={20} /></div>;
      case 'NEW_USER':
        return <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20 shadow-lg"><UserPlus size={20} /></div>;
      case 'NEW_VENDOR':
        return <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20 shadow-lg"><Store size={20} /></div>;
      case 'REPORT':
        return <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20 shadow-lg"><AlertTriangle size={20} /></div>;
      default:
        return <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20 shadow-lg"><Info size={20} /></div>;
    }
  };

  if (loading) return <div className="flex h-64 justify-center items-center"><Loader2 className="animate-spin text-[#F27124]" size={40} /></div>;

  return (
    <div className="animate-in fade-in duration-300 max-w-5xl mx-auto space-y-6">
      
      {/* HEADER */}
      <div className="portal-card border rounded-3xl p-6 border border-[var(--portal-border)] shadow-sm flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="bg-[var(--portal-surface)] p-3 rounded-xl border border-[var(--portal-border)]">
              <Bell className="portal-text-secondary" size={24} />
            </div>
            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white text-xs font-black flex items-center justify-center rounded-full border-2 border-[var(--portal-card)] shadow-lg animate-bounce">
                {unreadCount}
              </span>
            )}
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight">Trung tâm Thông báo</h2>
            <p className="text-sm portal-muted font-medium">Theo dõi các hoạt động mới nhất của hệ thống.</p>
          </div>
        </div>

        {unreadCount > 0 && (
          <button 
            onClick={() => handleMarkAsRead('all')}
            className="bg-[var(--portal-surface)] hover:bg-[var(--portal-surface-hover)] text-[var(--portal-text)] px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all border border-[var(--portal-border)] hover:border-[var(--portal-border)]"
          >
            <CheckCircle2 size={16} className="text-green-400"/> Đánh dấu đọc tất cả
          </button>
        )}
      </div>

      {/* DANH SÁCH THÔNG BÁO */}
      <div className="space-y-4">
        {notifications.length === 0 ? (
          <div className="portal-card border rounded-3xl p-16 text-center border border-[var(--portal-border)]">
            <Bell size={40} className="mx-auto text-gray-600 mb-4" />
            <h3 className="text-xl font-bold portal-muted">Chưa có thông báo nào</h3>
          </div>
        ) : (
          notifications.map((notif) => (
            <div 
              key={notif._id} 
              className={`flex items-start gap-4 p-5 rounded-2xl border transition-all ${notif.isRead ? 'portal-card opacity-70 border border-[var(--portal-border)] opacity-70' : 'portal-card border border-[var(--portal-border)] shadow-lg'}`}
            >
              {renderNotificationIcon(notif.type)}
              
              <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                  <h4 className={`text-base ${notif.isRead ? 'font-bold portal-text-secondary' : 'font-black'}`}>
                    {notif.title}
                  </h4>
                  <span className="text-xs portal-muted font-medium bg-[var(--portal-surface)] px-3 py-1 rounded-full border border-[var(--portal-border)]">
                    {new Date(notif.createdAt).toLocaleString('vi-VN')}
                  </span>
                </div>
                <p className={`text-sm ${notif.isRead ? 'portal-muted' : 'portal-text-secondary font-medium'}`}>
                  {notif.message}
                </p>
              </div>

              {!notif.isRead && (
                <button 
                  onClick={() => handleMarkAsRead(notif._id)}
                  title="Đánh dấu đã đọc"
                  className="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--portal-surface)] portal-muted hover:text-green-400 hover:bg-green-500/10 transition-colors border border-[var(--portal-border)]"
                >
                  <CheckCircle2 size={18} />
                </button>
              )}
            </div>
          ))
        )}
      </div>

    </div>
  );
};

export default AdminNotifications;