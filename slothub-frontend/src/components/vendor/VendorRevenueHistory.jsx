import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api/axios';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { CalendarDays, Loader2, TrendingUp, Receipt } from 'lucide-react';

const fmt = (n) => (Number(n) || 0).toLocaleString('vi-VN');

const DAY_OPTIONS = [
  { value: 7, label: '7 ngày' },
  { value: 14, label: '14 ngày' },
  { value: 30, label: '30 ngày' }
];

const TooltipContent = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  return (
    <div className="bg-[#0f172a] border border-[var(--portal-border)] rounded-xl px-4 py-3 shadow-xl text-sm">
      <p className="font-bold mb-2">{label}</p>
      <p className="text-[#F27124]">Doanh thu: {fmt(row?.revenue)}đ</p>
      <p className="text-green-400">Ví quầy (95%): {fmt(row?.vendorShare)}đ</p>
      <p className="portal-muted">{row?.orders || 0} đơn · {row?.completed || 0} hoàn thành</p>
    </div>
  );
};

const VendorRevenueHistory = ({ compact = false }) => {
  const [days, setDays] = useState(14);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.get(`/vendor/revenue-history?days=${days}`);
        setData(res.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Không tải được lịch sử doanh thu');
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [days]);

  const chartRows = useMemo(
    () => (data?.chart || []).map((d) => ({ ...d, name: d.label })),
    [data?.chart]
  );

  const hasRevenue = chartRows.some((d) => d.revenue > 0);

  return (
    <section className={`portal-card border rounded-3xl border border-[var(--portal-border)] overflow-hidden ${compact ? '' : ''}`}>
      <div className="p-5 border-b border-[var(--portal-border)] flex flex-wrap justify-between items-center gap-3">
        <div>
          <h3 className="font-black flex items-center gap-2">
            <CalendarDays size={20} className="text-[#F27124]" />
            Doanh thu theo ngày
          </h3>
          <p className="text-xs portal-muted mt-1">
            Xem lại doanh thu các ngày trước (đơn đã thanh toán)
          </p>
        </div>
        <div className="flex gap-1 bg-[var(--portal-input-bg)]/80 p-1 rounded-xl border border-[var(--portal-border)]">
          {DAY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setDays(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                days === opt.value
                  ? 'bg-[#F27124] text-white'
                  : 'portal-muted hover:text-[var(--portal-text)]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-[#F27124]" size={36} />
        </div>
      ) : error ? (
        <p className="p-8 text-center text-red-400 text-sm font-medium">{error}</p>
      ) : (
        <>
          {data?.summary && (
            <div className={`grid gap-3 p-5 border-b border-[var(--portal-border)] ${compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'}`}>
              <div className="bg-[var(--portal-table-head)] rounded-2xl p-4 border border-[var(--portal-border)]">
                <p className="text-[10px] font-bold portal-muted uppercase">Tổng {days} ngày</p>
                <p className="text-xl font-black mt-1">{fmt(data.summary.revenue)}đ</p>
              </div>
              <div className="bg-[var(--portal-table-head)] rounded-2xl p-4 border border-[var(--portal-border)]">
                <p className="text-[10px] font-bold portal-muted uppercase flex items-center gap-1">
                  <TrendingUp size={12} className="text-green-400" /> Ví quầy (95%)
                </p>
                <p className="text-xl font-black text-green-400 mt-1">{fmt(data.summary.vendorShare)}đ</p>
              </div>
              {!compact && (
                <>
                  <div className="bg-[var(--portal-table-head)] rounded-2xl p-4 border border-[var(--portal-border)]">
                    <p className="text-[10px] font-bold portal-muted uppercase">Số đơn</p>
                    <p className="text-xl font-black mt-1">{data.summary.orders}</p>
                  </div>
                  <div className="bg-[var(--portal-table-head)] rounded-2xl p-4 border border-[var(--portal-border)]">
                    <p className="text-[10px] font-bold portal-muted uppercase">Đã hoàn thành</p>
                    <p className="text-xl font-black text-[#F27124] mt-1">{data.summary.completed}</p>
                  </div>
                </>
              )}
            </div>
          )}

          {!compact && (
            <div className="p-5 border-b border-[var(--portal-border)]">
              {hasRevenue ? (
                <div className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartRows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} interval="preserveStartEnd" />
                      <YAxis
                        tick={{ fill: '#94a3b8', fontSize: 10 }}
                        tickFormatter={(v) => (v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${Math.round(v / 1000)}k` : v)}
                      />
                      <Tooltip content={<TooltipContent />} />
                      <Bar dataKey="revenue" name="Doanh thu" fill="#F27124" radius={[6, 6, 0, 0]} maxBarSize={48} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-center portal-muted text-sm py-12">Chưa có doanh thu trong khoảng thời gian này.</p>
              )}
            </div>
          )}

          <div className="max-h-[320px] overflow-y-auto custom-scrollbar">
            <table className="w-full text-sm">
              <thead className="sticky top-0 portal-card border z-10">
                <tr className="text-left text-[10px] font-bold portal-muted uppercase tracking-wider border-b border-[var(--portal-border)]">
                  <th className="p-4">Ngày</th>
                  <th className="p-4 text-right">Đơn</th>
                  <th className="p-4 text-right">Doanh thu</th>
                  <th className="p-4 text-right">Ví quầy (95%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--portal-border)]">
                {(data?.daily || []).map((row) => (
                  <tr key={row.date} className="hover:bg-[var(--portal-surface-hover)]">
                    <td className="p-4 font-bold">
                      <span className="flex items-center gap-2">
                        <Receipt size={14} className="portal-muted shrink-0" />
                        {row.label}
                      </span>
                      <span className="text-[10px] portal-muted font-normal block mt-0.5">{row.date}</span>
                    </td>
                    <td className="p-4 text-right portal-text-secondary">
                      {row.orders}
                      {row.completed > 0 && (
                        <span className="block text-[10px] text-green-500">{row.completed} hoàn thành</span>
                      )}
                    </td>
                    <td className="p-4 text-right font-black">
                      {row.revenue > 0 ? `${fmt(row.revenue)}đ` : '—'}
                    </td>
                    <td className="p-4 text-right font-bold text-green-400">
                      {row.vendorShare > 0 ? `${fmt(row.vendorShare)}đ` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
};

export default VendorRevenueHistory;
