import React, { useState, useEffect, useContext } from 'react';
import api from '../../../api/axios';
import { AuthContext } from '../../../context/AuthContext';
import {
  Wallet, ArrowUpFromLine, Clock, CheckCircle2, XCircle,
  Loader2, Building, Info, Receipt
} from 'lucide-react';
import VendorRevenueHistory from '../../../components/vendor/VendorRevenueHistory';

const VendorWallet = () => {
  useContext(AuthContext);
  const [summary, setSummary] = useState({ balance: 0, bankAccount: {}, transactions: [] });
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);

  const loadWallet = async () => {
    try {
      const res = await api.get('/transactions/vendor-wallet/me');
      setSummary(res.data);
    } catch (err) {
      console.error('Lỗi tải ví quầy:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWallet();
  }, []);

  const handleWithdraw = async (e) => {
    e.preventDefault();
    const num = Number(amount);
    if (!num || num < 50000) return alert('Số tiền rút tối thiểu 50.000đ!');
    if (num > summary.balance) return alert('Số dư ví không đủ!');
    if (!summary.bankAccount?.accountNumber) {
      return alert('Vui lòng cập nhật TK ngân hàng trong mục Cài đặt Gian hàng!');
    }

    setIsSubmitting(true);
    try {
      await api.post('/transactions/request', {
        type: 'WITHDRAW',
        amount: num,
        description: `Rút doanh thu quầy ${num.toLocaleString()}đ`
      });
      alert('Đã gửi lệnh rút tiền! Admin sẽ chuyển khoản và duyệt trong thời gian sớm nhất.');
      setAmount('');
      setShowWithdraw(false);
      loadWallet();
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi gửi lệnh rút!');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderTxType = (type) => {
    if (type === 'PAYOUT') return { label: 'Rút doanh thu', class: 'text-orange-400 bg-orange-500/10' };
    if (type === 'PAYMENT') return { label: 'Doanh thu đơn', class: 'text-green-400 bg-green-500/10' };
    return { label: type, class: 'portal-muted bg-gray-500/10' };
  };

  const renderStatus = (status) => {
    if (status === 'PENDING') return <span className="text-yellow-400 text-xs font-bold flex items-center gap-1"><Clock size={12}/> Chờ admin duyệt</span>;
    if (status === 'SUCCESS') return <span className="text-green-400 text-xs font-bold flex items-center gap-1"><CheckCircle2 size={12}/> Hoàn tất</span>;
    if (status === 'FAILED') return <span className="text-red-400 text-xs font-bold flex items-center gap-1"><XCircle size={12}/> Từ chối</span>;
    return null;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-[#F27124]" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-gradient-to-br from-[#F27124] to-[#ff985e] rounded-3xl p-8 shadow-xl shadow-orange-500/20 relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
        <p className="text-orange-100 text-sm font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
          <Wallet size={16} /> Số dư ví doanh thu
        </p>
        <p className="text-4xl font-black mb-1">{summary.balance?.toLocaleString()}đ</p>
        <p className="text-orange-50/90 text-sm font-medium">
          95% giá trị mỗi đơn thanh toán · Phí sàn 5% về quỹ Admin
        </p>
        <button
          onClick={() => setShowWithdraw(!showWithdraw)}
          className="mt-6 bg-white text-[#F27124] px-6 py-3 rounded-xl font-black flex items-center gap-2 hover:scale-[1.02] transition-transform shadow-lg"
        >
          <ArrowUpFromLine size={18} /> Tạo lệnh rút tiền
        </button>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex gap-3 text-sm text-blue-200">
        <Info size={20} className="shrink-0 text-blue-400" />
        <div>
          <p className="font-bold text-blue-100 mb-1">Quy trình rút tiền</p>
          <p>Khi sinh viên thanh toán, tiền thực tế vào quỹ Admin (VNPay/chuyển khoản). Ví của bạn ghi nhận doanh thu để rút. Admin duyệt lệnh rút và chuyển khoản vào TK ngân hàng của bạn.</p>
        </div>
      </div>

      {summary.bankAccount?.accountNumber && (
        <div className="portal-card border rounded-2xl p-5 border border-[var(--portal-border)] flex items-center gap-4">
          <Building className="text-[#F27124]" size={24} />
          <div>
            <p className="text-xs portal-muted font-bold uppercase">TK nhận tiền rút</p>
            <p className="font-bold">{summary.bankAccount.bankName} · {summary.bankAccount.accountNumber}</p>
            <p className="portal-muted text-sm">{summary.bankAccount.accountName}</p>
          </div>
        </div>
      )}

      {showWithdraw && (
        <form onSubmit={handleWithdraw} className="portal-card border rounded-2xl p-6 border border-[var(--portal-border)] space-y-4">
          <h3 className="font-black text-lg">Yêu cầu rút tiền về ngân hàng</h3>
          <input
            type="number"
            min="50000"
            step="1000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Nhập số tiền (tối thiểu 50.000đ)"
            className="w-full bg-[var(--portal-input-bg)] border border-[var(--portal-border)] rounded-xl px-4 py-3 text-[var(--portal-text)] focus:border-[#F27124] outline-none"
          />
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowWithdraw(false)} className="flex-1 py-3 rounded-xl border border-[var(--portal-border)] portal-text-secondary font-bold">
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 rounded-xl bg-[#F27124] font-black flex justify-center items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : 'Gửi lệnh rút'}
            </button>
          </div>
        </form>
      )}

      <VendorRevenueHistory compact />

      <div className="portal-card border rounded-2xl border border-[var(--portal-border)] overflow-hidden">
        <div className="p-5 border-b border-[var(--portal-border)] flex items-center gap-2">
          <Receipt size={20} className="text-[#F27124]" />
          <h3 className="font-black">Lịch sử ví</h3>
        </div>
        <div className="divide-y divide-[var(--portal-border)] max-h-[400px] overflow-y-auto">
          {summary.transactions?.length === 0 ? (
            <p className="p-8 text-center portal-muted">Chưa có giao dịch nào.</p>
          ) : (
            summary.transactions.map((tx) => {
              const t = renderTxType(tx.type);
              return (
                <div key={tx._id} className="p-4 flex justify-between items-center hover:bg-[var(--portal-surface)]/30">
                  <div>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${t.class}`}>{t.label}</span>
                    <p className="text-sm portal-muted mt-1 max-w-[240px] truncate">{tx.description}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{new Date(tx.createdAt).toLocaleString('vi-VN')}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-black ${tx.type === 'PAYOUT' && tx.status === 'PENDING' ? 'text-orange-400' : 'text-[var(--portal-text)]'}`}>
                      {tx.type === 'PAYOUT' ? '-' : '+'}{tx.amount?.toLocaleString()}đ
                    </p>
                    {renderStatus(tx.status)}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default VendorWallet;
