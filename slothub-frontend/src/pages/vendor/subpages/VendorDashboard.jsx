import React, { useState, useEffect } from 'react';
import api from '../../../api/axios';
import {
  ShoppingBag, Wallet, UtensilsCrossed, TrendingUp, Clock,
  Loader2, Store, CircleDot, Package, Bell, ChevronRight, Flame
} from 'lucide-react';
import { formatVendorHoursRange } from '../../../utils/timeFormat';
import VendorRevenueHistory from '../../../components/vendor/VendorRevenueHistory';

const VendorDashboard = ({ onGoSettings, onGoOrders, onGoNotifications }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const [dashRes, notiRes] = await Promise.all([
          api.get('/vendor/dashboard'),
          api.get('/vendor/notifications'),
        ]);
        setData(dashRes.data);
        setNotifications((notiRes.data?.notifications || []).slice(0, 5));
        setUnreadCount(notiRes.data?.unreadCount || 0);
      } catch (err) {
        setError(err.response?.data?.message || 'Không tải được dữ liệu');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-[#F27124]" size={44} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="portal-card border rounded-3xl border border-[var(--portal-border)] p-10 text-center max-w-lg">
        <Store size={48} className="mx-auto text-gray-600 mb-4" />
        <p className="portal-text-secondary font-bold mb-4">{error || 'Chưa có dữ liệu'}</p>
        <p className="text-sm portal-muted mb-6">Hãy tạo gian hàng trong mục Cài đặt trước.</p>
        {onGoSettings && (
          <button
            type="button"
            onClick={onGoSettings}
            className="bg-[#F27124] font-black px-6 py-3 rounded-xl hover:bg-[#D95F1B] transition-colors"
          >
            Mở Cài đặt Gian hàng
          </button>
        )}
      </div>
    );
  }

  const { vendor, stats, recentOrders, bestSellingThisMonth, salesPeriod } = data;
  const monthLabel = salesPeriod
    ? `Tháng ${salesPeriod.month}/${salesPeriod.year}`
    : 'Tháng này';

  const cards = [
    {
      title: 'Doanh thu hôm nay',
      value: `${stats.revenueToday?.toLocaleString()}đ`,
      sub: `Ví +${stats.vendorShareToday?.toLocaleString()}đ (95%)`,
      icon: <TrendingUp size={22} />,
      color: 'text-green-400',
      bg: 'bg-green-500/10',
    },
    {
      title: 'Đơn hôm nay',
      value: stats.ordersToday,
      sub: `${stats.pendingOrders} đơn đang xử lý`,
      icon: <ShoppingBag size={22} />,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      title: 'Ví doanh thu',
      value: `${stats.walletBalance?.toLocaleString()}đ`,
      sub: 'Có thể rút qua Admin duyệt',
      icon: <Wallet size={22} />,
      color: 'text-[#F27124]',
      bg: 'bg-orange-500/10',
    },
    {
      title: 'Món trên menu',
      value: stats.menuItems,
      sub: `${stats.completedOrders} đơn đã hoàn thành`,
      icon: <UtensilsCrossed size={22} />,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
    },
  ];

  const statusLabel = {
    Pending: 'Chờ xác nhận',
    Processing: 'Đang làm',
    Ready: 'Sẵn sàng',
    Completed: 'Hoàn thành',
    Cancelled: 'Đã hủy',
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-gradient-to-r from-[#1E293B] to-[#0f172a] rounded-3xl border border-[var(--portal-border)] p-6 md:p-8">
        <div className="flex items-center gap-4">
          {vendor.imageUrl ? (
            <img src={vendor.imageUrl} alt="" className="w-16 h-16 rounded-2xl object-cover border border-[var(--portal-border)]" />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-[#F27124]/20 flex items-center justify-center shrink-0">
              <Store className="text-[#F27124]" size={32} />
            </div>
          )}
          <div>
            <h2 className="text-2xl font-black">{vendor.name}</h2>
            <p className="portal-muted text-sm mt-1 flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${vendor.isOpen ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                <CircleDot size={10} /> {vendor.isOpen ? 'Đang mở cửa' : 'Đã đóng cửa'}
              </span>
              <span className="portal-muted">· {formatVendorHoursRange(vendor)}</span>
            </p>
            <p className="portal-muted text-xs mt-1">
              Tổng doanh thu đã thanh toán: {stats.revenueAllTime?.toLocaleString()}đ · {vendor.category}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.title} className="portal-card border rounded-2xl border border-[var(--portal-border)] p-5 hover:border-[var(--portal-border)] transition-colors">
            <div className={`w-10 h-10 rounded-xl ${card.bg} ${card.color} flex items-center justify-center mb-3`}>
              {card.icon}
            </div>
            <p className="text-xs font-bold portal-muted uppercase tracking-wider">{card.title}</p>
            <p className="text-2xl font-black mt-1">{card.value}</p>
            <p className="text-xs portal-muted mt-1">{card.sub}</p>
          </div>
        ))}
      </div>

      <VendorRevenueHistory />

      <section className="portal-card border rounded-3xl border border-[var(--portal-border)] overflow-hidden">
        <div className="p-5 border-b border-[var(--portal-border)] flex flex-wrap justify-between items-center gap-2">
          <h3 className="font-black flex items-center gap-2">
            <Flame size={20} className="text-orange-400" /> Món bán chạy — {monthLabel}
          </h3>
          <p className="text-xs portal-muted">Theo số lượng đã bán (đơn đã thanh toán)</p>
        </div>
        {!bestSellingThisMonth?.length ? (
          <p className="p-8 text-center portal-muted text-sm">
            Chưa có đơn thanh toán trong {monthLabel.toLowerCase()}. Món bán chạy sẽ hiện khi có đơn.
          </p>
        ) : (
          <div className="divide-y divide-[var(--portal-border)]">
            {bestSellingThisMonth.map((item, index) => (
              <div key={item.menuItemId || index} className="p-4 flex items-center gap-4 hover:bg-[var(--portal-surface)]/30">
                <span
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shrink-0 ${
                    index === 0
                      ? 'bg-orange-500/20 text-orange-400'
                      : index === 1
                        ? 'bg-gray-500/20 portal-text-secondary'
                        : index === 2
                          ? 'bg-amber-700/20 text-amber-500'
                          : 'bg-[var(--portal-surface)] portal-muted'
                  }`}
                >
                  {index + 1}
                </span>
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt="" className="w-12 h-12 rounded-xl object-cover border border-[var(--portal-border)] shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-[var(--portal-surface)] flex items-center justify-center shrink-0">
                    <UtensilsCrossed size={20} className="text-gray-600" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate">{item.name}</p>
                  <p className="text-xs portal-muted mt-0.5">
                    {item.category || 'Món ăn'}
                    {item.price != null && ` · ${item.price.toLocaleString()}đ`}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-black text-[#F27124]">{item.quantitySold} phần</p>
                  <p className="text-xs portal-muted mt-0.5">{item.revenue?.toLocaleString()}đ</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="portal-card border rounded-3xl border border-[var(--portal-border)] overflow-hidden">
          <div className="p-5 border-b border-[var(--portal-border)] flex justify-between items-center">
            <h3 className="font-black flex items-center gap-2">
              <Bell size={20} className="text-[#F27124]" /> Thông báo mới
              {unreadCount > 0 && (
                <span className="text-[10px] bg-red-500 font-black px-2 py-0.5 rounded-full">{unreadCount}</span>
              )}
            </h3>
            {onGoNotifications && (
              <button type="button" onClick={onGoNotifications} className="text-xs font-bold text-[#F27124] hover:text-[var(--portal-text)]">
                Xem tất cả
              </button>
            )}
          </div>
          {notifications.length === 0 ? (
            <p className="p-8 text-center portal-muted text-sm">Chưa có thông báo. Đơn mới sẽ hiện tại đây.</p>
          ) : (
            <div className="divide-y divide-[var(--portal-border)]">
              {notifications.map((n) => (
                <button
                  key={n._id}
                  type="button"
                  onClick={() => (n.type === 'NEW_ORDER' && onGoOrders ? onGoOrders() : onGoNotifications?.())}
                  className={`w-full text-left p-4 hover:bg-[var(--portal-surface)]/30 flex gap-3 items-start ${!n.isRead ? 'bg-[#F27124]/5' : ''}`}
                >
                  <ShoppingBag size={18} className="text-[#F27124] shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold truncate ${n.isRead ? 'portal-muted' : 'text-[var(--portal-text)]'}`}>{n.title}</p>
                    <p className="text-xs portal-muted line-clamp-1 mt-0.5">{n.message}</p>
                  </div>
                  <ChevronRight size={16} className="text-gray-600 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="portal-card border rounded-3xl border border-[var(--portal-border)] overflow-hidden">
          <div className="p-5 border-b border-[var(--portal-border)]">
            <h3 className="font-black flex items-center gap-2">
              <Package size={20} className="text-[#F27124]" /> Đơn hàng gần đây
            </h3>
          </div>
          {recentOrders?.length === 0 ? (
            <p className="p-8 text-center portal-muted">Chưa có đơn nào.</p>
          ) : (
            <div className="divide-y divide-[var(--portal-border)]">
              {recentOrders.map((order) => (
                <div key={order._id} className="p-4 flex items-center justify-between hover:bg-[var(--portal-surface)]/30">
                  <div>
                    <p className="font-bold">#{order._id.slice(-6)} · {order.user?.name || 'Sinh viên'}</p>
                    <p className="text-xs portal-muted mt-0.5 flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(order.createdAt).toLocaleString('vi-VN')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-[#F27124]">{order.totalPrice?.toLocaleString()}đ</p>
                    <p className="text-xs portal-muted">{statusLabel[order.status] || order.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default VendorDashboard;
