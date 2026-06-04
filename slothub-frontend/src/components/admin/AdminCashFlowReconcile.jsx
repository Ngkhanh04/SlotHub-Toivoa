import React from 'react';
import { Info, ArrowDownToLine, ArrowUpFromLine, Wallet, Receipt } from 'lucide-react';

const fmt = (n) => (Number(n) || 0).toLocaleString('vi-VN');

const AdminCashFlowReconcile = ({ daily = [], summary = null, pending = {}, days = 7 }) => {
  return (
    <div className="space-y-4">
      <div className="bg-[var(--portal-input-bg)]/60 border border-[var(--portal-border)] rounded-2xl p-4 text-sm portal-text-secondary leading-relaxed">
        <p className="font-black flex items-center gap-2 mb-2">
          <Info size={16} className="text-[#F27124]" /> Đối soát dòng tiền thực tế
        </p>
        <ul className="space-y-1.5 text-xs list-disc list-inside portal-muted">
          <li>
            <strong className="text-blue-400">SV nạp ví</strong>: SV chuyển khoản vào STK Admin (Cài đặt) → bạn duyệt tại{' '}
            <strong className="text-[var(--portal-text)]">Duyệt lệnh Nạp/Rút</strong> — tiền qua TK bạn, cộng ví ảo SV.
          </li>
          <li>
            <strong className="text-green-400">Thanh toán đơn</strong>: SV trả bằng ví hoặc VNPay → ghi nhận toàn bộ giá trị đơn; 95% vào ví quầy, 5% vào <strong className="text-[#F27124]">Ví quản trị</strong>.
          </li>
          <li>
            <strong className="text-orange-400">Rút tiền</strong>: SV / quầy yêu cầu rút → bạn chuyển khoản thật rồi bấm Duyệt (có QR VietQR).
          </li>
        </ul>
        {(pending.deposits > 0 || pending.withdraws > 0 || pending.payouts > 0) && (
          <p className="mt-3 text-amber-300 text-xs font-bold">
            Đang chờ: {pending.deposits || 0} nạp · {pending.withdraws || 0} rút SV · {pending.payouts || 0} rút quầy
          </p>
        )}
      </div>

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-[var(--portal-table-head)] rounded-xl p-3 border border-[var(--portal-border)]">
            <p className="text-[10px] font-bold portal-muted uppercase flex items-center gap-1">
              <ArrowDownToLine size={12} className="text-blue-400" /> Nạp SV ({days}d)
            </p>
            <p className="text-lg font-black mt-1">{fmt(summary.deposits)}đ</p>
          </div>
          <div className="bg-[var(--portal-table-head)] rounded-xl p-3 border border-[var(--portal-border)]">
            <p className="text-[10px] font-bold portal-muted uppercase flex items-center gap-1">
              <Receipt size={12} className="text-green-400" /> Đơn đã trả
            </p>
            <p className="text-lg font-black mt-1">{fmt(summary.payments)}đ</p>
          </div>
          <div className="bg-[var(--portal-table-head)] rounded-xl p-3 border border-[var(--portal-border)]">
            <p className="text-[10px] font-bold portal-muted uppercase flex items-center gap-1">
              <Wallet size={12} className="text-[#F27124]" /> Phí sàn thu
            </p>
            <p className="text-lg font-black text-[#F27124] mt-1">{fmt(summary.platformFee)}đ</p>
          </div>
          <div className="bg-[var(--portal-table-head)] rounded-xl p-3 border border-[var(--portal-border)]">
            <p className="text-[10px] font-bold portal-muted uppercase flex items-center gap-1">
              <ArrowUpFromLine size={12} className="text-orange-400" /> Đã rút (duyệt)
            </p>
            <p className="text-lg font-black text-orange-400 mt-1">{fmt(summary.withdrawals)}đ</p>
          </div>
        </div>
      )}

      <div className="max-h-[280px] overflow-y-auto custom-scrollbar rounded-xl border border-[var(--portal-border)]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 portal-card border z-10">
            <tr className="text-[10px] font-bold portal-muted uppercase border-b border-[var(--portal-border)]">
              <th className="p-3 text-left">Ngày</th>
              <th className="p-3 text-right">Nạp SV</th>
              <th className="p-3 text-right">Đơn trả</th>
              <th className="p-3 text-right">Phí 5%</th>
              <th className="p-3 text-right">Rút (ra)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--portal-border)]">
            {daily.map((row) => (
              <tr key={row.date} className="hover:bg-[var(--portal-surface-hover)] portal-text-secondary">
                <td className="p-3 font-bold">{row.label}</td>
                <td className="p-3 text-right text-blue-400">{row.deposits > 0 ? `${fmt(row.deposits)}đ` : '—'}</td>
                <td className="p-3 text-right text-green-400">{row.payments > 0 ? `${fmt(row.payments)}đ` : '—'}</td>
                <td className="p-3 text-right text-[#F27124]">{row.platformFee > 0 ? `${fmt(row.platformFee)}đ` : '—'}</td>
                <td className="p-3 text-right text-orange-400">{row.withdrawals > 0 ? `${fmt(row.withdrawals)}đ` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminCashFlowReconcile;
