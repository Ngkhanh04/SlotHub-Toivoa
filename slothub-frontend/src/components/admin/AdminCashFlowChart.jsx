import React from 'react';
import { usePortalTheme } from '../../context/PortalThemeContext';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

const fmt = (n) => (Number(n) || 0).toLocaleString('vi-VN');

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="portal-tooltip rounded-xl px-4 py-3 shadow-xl text-sm">
      <p className="font-bold mb-2">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="font-medium" style={{ color: entry.color }}>
          {entry.name}: {fmt(entry.value)}đ
        </p>
      ))}
    </div>
  );
};

const AdminCashFlowChart = ({ data, loading }) => {
  const { isLight } = usePortalTheme();
  const gridStroke = isLight ? '#e2e8f0' : '#334155';
  const tickFill = isLight ? '#64748b' : '#94a3b8';

  if (loading) {
    return (
      <div className="flex-1 min-h-[280px] flex items-center justify-center portal-muted font-bold animate-pulse">
        Đang tải biểu đồ...
      </div>
    );
  }

  if (!data?.length) {
    return (
      <div className="flex-1 min-h-[280px] flex flex-col items-center justify-center portal-muted bg-[var(--portal-table-head)] rounded-2xl border border-dashed border-[var(--portal-border)]">
        <p className="font-bold">Chưa có giao dịch trong khoảng thời gian này</p>
      </div>
    );
  }

  const chartRows = data.map((d) => ({
    ...d,
    name: d.label
  }));

  const hasAnyValue = chartRows.some(
    (d) => d.deposits > 0 || d.payments > 0 || d.platformFee > 0 || (d.withdrawals || 0) > 0
  );

  if (!hasAnyValue) {
    return (
      <div className="flex-1 min-h-[280px] flex flex-col items-center justify-center portal-muted bg-[var(--portal-table-head)] rounded-2xl border border-dashed border-[var(--portal-border)]">
        <p className="font-bold">Chưa có dòng tiền phát sinh (7 ngày gần nhất)</p>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-[280px] w-full">
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartRows} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorDeposits" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorPayments" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorFee" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#F27124" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#F27124" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorWithdraw" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f97316" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
          <XAxis dataKey="name" tick={{ fill: tickFill, fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fill: tickFill, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => (v >= 1000000 ? `${(v / 1e6).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: 16 }}
            formatter={(value) => <span className="portal-muted text-xs font-bold">{value}</span>}
          />
          <Area type="monotone" dataKey="deposits" name="SV nạp ví" stroke="#3b82f6" fill="url(#colorDeposits)" strokeWidth={2} />
          <Area type="monotone" dataKey="payments" name="Thanh toán đơn" stroke="#22c55e" fill="url(#colorPayments)" strokeWidth={2} />
          <Area type="monotone" dataKey="platformFee" name="Phí sàn 5%" stroke="#F27124" fill="url(#colorFee)" strokeWidth={2} />
          <Area type="monotone" dataKey="withdrawals" name="Rút (SV+quầy)" stroke="#f97316" fill="url(#colorWithdraw)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AdminCashFlowChart;
