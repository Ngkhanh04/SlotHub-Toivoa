import React, { useState, useEffect, useCallback } from 'react';
import api from '../../../api/axios';
import AdminCashFlowChart from '../../../components/admin/AdminCashFlowChart';
import AdminCashFlowReconcile from '../../../components/admin/AdminCashFlowReconcile';
import {
  DollarSign, Users, Store, Activity, TrendingUp, AlertCircle, Wallet, Receipt,
  ArrowDownToLine, ArrowUpFromLine, UserPlus, ChevronRight, Bell
} from 'lucide-react';

const fmt = (n) => (Number(n) || 0).toLocaleString('vi-VN');

const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} giờ trước`;
  const days = Math.floor(hrs / 24);
  return `${days} ngày trước`;
};

const activityMeta = {
  DEPOSIT: { icon: ArrowDownToLine, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
  WITHDRAW: { icon: ArrowUpFromLine, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  PAYOUT: { icon: ArrowUpFromLine, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  NEW_VENDOR: { icon: Store, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  NEW_USER: { icon: UserPlus, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  REPORT: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  SYSTEM: { icon: Bell, color: 'portal-muted', bg: 'bg-gray-500/10', border: 'border-gray-500/20' },
};

const AdminDashboard = ({ onNavigateTab }) => {
  const [statsData, setStatsData] = useState({
    adminWalletBalance: 0,
    totalPlatformFee: 0,
    totalOrderVolume: 0,
    totalDeposits: 0,
    pendingDeposits: 0,
    studentCount: 0,
    vendorCount: 0,
    todayTxCount: 0
  });
  const [chartData, setChartData] = useState([]);
  const [cashFlowMeta, setCashFlowMeta] = useState({ daily: [], summary: null, pending: {} });
  const [chartDays, setChartDays] = useState(7);
  const [activity, setActivity] = useState({ notifications: [], pending: {} });
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    try {
      setChartLoading(true);
      const [statsRes, chartRes, activityRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get(`/admin/cash-flow?days=${chartDays}`),
        api.get('/admin/activity?limit=12'),
      ]);
      setStatsData(statsRes.data);
      setChartData(chartRes.data?.chartData || []);
      setCashFlowMeta({
        daily: chartRes.data?.daily || [],
        summary: chartRes.data?.summary || null,
        pending: chartRes.data?.pending || {},
      });
      setActivity({
        notifications: activityRes.data?.notifications || [],
        pending: activityRes.data?.pending || {},
        unreadCount: activityRes.data?.unreadCount || 0,
      });
    } catch (error) {
      console.error('Lỗi lấy dữ liệu Dashboard:', error);
    } finally {
      setLoading(false);
      setChartLoading(false);
    }
  }, [chartDays]);

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(loadDashboard, 45000);
    return () => clearInterval(interval);
  }, [loadDashboard]);

  const handleActivityClick = async (noti) => {
    try {
      if (!noti.isRead) {
        await api.put(`/admin/notifications/${noti._id}/read`);
      }
      if (noti.actionLink && onNavigateTab) {
        onNavigateTab(noti.actionLink);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const pending = activity.pending || {};
  const pendingAlerts = [
    pending.deposits > 0 && {
      key: 'dep',
      label: `${pending.deposits} lệnh nạp chờ duyệt`,
      tab: 'transactions',
      color: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
    },
    pending.withdraws > 0 && {
      key: 'wd',
      label: `${pending.withdraws} lệnh rút SV chờ duyệt`,
      tab: 'transactions',
      color: 'bg-orange-500/10 border-orange-500/30 text-orange-300',
    },
    pending.payouts > 0 && {
      key: 'po',
      label: `${pending.payouts} lệnh rút quầy chờ duyệt`,
      tab: 'transactions',
      color: 'bg-red-500/10 border-red-500/30 text-red-300',
    },
    pending.vendors > 0 && {
      key: 'vn',
      label: `${pending.vendors} quầy mới chờ duyệt`,
      tab: 'vendors',
      color: 'bg-purple-500/10 border-purple-500/30 text-purple-300',
    },
  ].filter(Boolean);

  const stats = [
    {
      title: 'Ví quản trị (phí sàn)',
      value: `${fmt(statsData.adminWalletBalance)}đ`,
      hint: 'Số dư thực tế của admin — 5% mỗi đơn đã thanh toán',
      icon: <Wallet size={24} />,
      color: 'text-[#F27124]',
      bg: 'bg-[#F27124]/10',
    },
    {
      title: 'Tổng thanh toán đơn',
      value: `${fmt(statsData.totalOrderVolume)}đ`,
      hint: 'Tổng giá trị đơn SV đã trả (ví + VNPay)',
      icon: <Receipt size={24} />,
      color: 'text-green-500',
      bg: 'bg-green-500/10',
    },
    {
      title: 'Phí sàn tích lũy (5%)',
      value: `${fmt(statsData.totalPlatformFee)}đ`,
      hint: 'Tổng phí ghi nhận trong lịch sử giao dịch',
      icon: <TrendingUp size={24} />,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    {
      title: 'SV đã nạp (đã duyệt)',
      value: `${fmt(statsData.totalDeposits)}đ`,
      hint: statsData.pendingDeposits > 0
        ? `${statsData.pendingDeposits} lệnh nạp đang chờ duyệt`
        : 'Tiền nạp vào ví sinh viên, không phải thu nhập sàn',
      icon: <DollarSign size={24} />,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
  ];

  const secondaryStats = [
    { title: 'Sinh viên', value: fmt(statsData.studentCount), icon: <Users size={22} />, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { title: 'Gian hàng', value: fmt(statsData.vendorCount), icon: <Store size={22} />, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { title: 'Giao dịch hôm nay', value: fmt(statsData.todayTxCount), icon: <Activity size={22} />, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  ];

  if (loading) return <div className="portal-muted py-10 text-center font-bold">Đang tải dữ liệu hệ thống...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      <div className="portal-card border p-8 rounded-[2rem] border border-[var(--portal-border)] shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-2xl font-black">DASHBOARD 👋</h3>
          <p className="portal-muted mt-1 font-medium">Dòng tiền & hoạt động hệ thống theo thời gian thực</p>
        </div>
        <button
          type="button"
          onClick={() => onNavigateTab?.('notifications')}
          className="flex items-center gap-2 bg-[#F27124]/10 text-[#F27124] px-5 py-2.5 rounded-xl font-bold border border-[#F27124]/20 hover:bg-[#F27124] hover:text-[var(--portal-text)] transition-all"
        >
          <Bell size={18} />
          Thông báo {activity.unreadCount > 0 ? `(${activity.unreadCount})` : ''}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="portal-card border p-6 rounded-[2rem] border border-[var(--portal-border)] hover:border-[var(--portal-border)] transition-colors shadow-sm">
            <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color} w-fit mb-4`}>{stat.icon}</div>
            <p className="portal-muted text-sm font-bold uppercase tracking-wider">{stat.title}</p>
            <h4 className="text-3xl font-black mt-1.5">{stat.value}</h4>
            <p className="text-[11px] portal-muted font-medium mt-2 leading-relaxed">{stat.hint}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {secondaryStats.map((stat, index) => (
          <div key={index} className="portal-card border p-5 rounded-2xl border border-[var(--portal-border)] flex items-center gap-4">
            <div className={`p-2.5 rounded-xl ${stat.bg} ${stat.color}`}>{stat.icon}</div>
            <div>
              <p className="portal-muted text-xs font-bold uppercase">{stat.title}</p>
              <p className="text-xl font-black">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <div className="lg:col-span-2 portal-card border p-8 rounded-[2rem] border border-[var(--portal-border)] flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
            <div>
              <h3 className="font-black text-lg">Biểu đồ dòng tiền</h3>
              <p className="text-sm portal-muted font-medium">Đối soát theo ngày — nạp, đơn, phí sàn, rút</p>
            </div>
            <div className="flex gap-1 bg-[var(--portal-input-bg)] p-1 rounded-xl border border-[var(--portal-border)]">
              {[7, 14, 30].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setChartDays(d)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                    chartDays === d ? 'bg-[#F27124] text-white' : 'portal-muted hover:text-[var(--portal-text)]'
                  }`}
                >
                  {d} ngày
                </button>
              ))}
            </div>
          </div>
          <AdminCashFlowChart data={chartData} loading={chartLoading} />
          <div className="mt-6 pt-6 border-t border-[var(--portal-border)]">
            <AdminCashFlowReconcile
              daily={cashFlowMeta.daily}
              summary={cashFlowMeta.summary}
              pending={cashFlowMeta.pending}
              days={chartDays}
            />
          </div>
        </div>

        <div className="portal-card border p-6 rounded-[2rem] border border-[var(--portal-border)] flex flex-col max-h-[480px]">
          <h3 className="font-black mb-4 text-lg flex items-center gap-2 shrink-0">
            <AlertCircle className="text-[#F27124]" size={20} /> Cảnh báo & Hoạt động
          </h3>

          <div className="space-y-3 overflow-y-auto custom-scrollbar flex-1 pr-1">
            {pendingAlerts.map((alert) => (
              <button
                key={alert.key}
                type="button"
                onClick={() => onNavigateTab?.(alert.tab)}
                className={`w-full text-left p-3 rounded-xl border text-xs font-bold transition-all hover:scale-[1.01] ${alert.color}`}
              >
                {alert.label} →
              </button>
            ))}

            {activity.notifications.length === 0 && pendingAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 opacity-50">
                <AlertCircle size={32} className="text-gray-600 mb-2" />
                <p className="text-sm portal-muted font-bold">Chưa có hoạt động mới</p>
              </div>
            ) : (
              activity.notifications.map((noti) => {
                const meta = activityMeta[noti.type] || activityMeta.SYSTEM;
                const Icon = meta.icon;
                return (
                  <button
                    key={noti._id}
                    type="button"
                    onClick={() => handleActivityClick(noti)}
                    className={`w-full text-left p-3 rounded-xl border transition-all hover:bg-[var(--portal-surface)]/80 flex gap-3 items-start group ${
                      noti.isRead ? 'border-[var(--portal-border)] bg-[var(--portal-table-head)]' : `${meta.border} ${meta.bg}`
                    }`}
                  >
                    <div className={`p-2 rounded-lg shrink-0 ${meta.bg} ${meta.color}`}>
                      <Icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold truncate ${noti.isRead ? 'portal-muted' : 'text-[var(--portal-text)]'}`}>
                        {noti.title}
                      </p>
                      <p className="text-[11px] portal-muted mt-0.5 line-clamp-2">{noti.message}</p>
                      <p className="text-[10px] text-gray-600 mt-1 font-medium">{timeAgo(noti.createdAt)}</p>
                    </div>
                    <ChevronRight size={16} className="text-gray-600 shrink-0 mt-1 opacity-0 group-hover:opacity-100" />
                  </button>
                );
              })
            )}
          </div>

          {activity.notifications.length > 0 && (
            <button
              type="button"
              onClick={() => onNavigateTab?.('notifications')}
              className="mt-4 text-xs font-bold text-[#F27124] hover:text-[var(--portal-text)] transition-colors shrink-0"
            >
              Xem tất cả thông báo →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
