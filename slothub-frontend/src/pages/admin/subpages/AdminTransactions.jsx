import React, { useState, useEffect } from 'react';
import api from '../../../api/axios';
import { CheckCircle, XCircle, Clock, ArrowLeftRight, QrCode, Building, CreditCard, User } from 'lucide-react';

const getTxLabel = (tx) => {
  if (tx.type === 'DEPOSIT') return { text: 'Nạp tiền (SV)', class: 'bg-blue-500/10 text-blue-400 border border-blue-500/20' };
  if (tx.type === 'PAYOUT') return { text: 'Rút doanh thu (Quầy)', class: 'bg-purple-500/10 text-purple-400 border border-purple-500/20' };
  if (tx.type === 'WITHDRAW') return { text: 'Rút tiền (SV)', class: 'bg-orange-500/10 text-orange-400 border border-orange-500/20' };
  if (tx.type === 'PLATFORM_FEE') return { text: 'Phí sàn 5%', class: 'bg-green-500/10 text-green-400 border border-green-500/20' };
  return { text: tx.type, class: 'bg-gray-500/10 portal-muted border border-gray-500/20' };
};

const AdminTransactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [filter, setFilter] = useState('pending'); // pending | all | payout
  const [fetchTrigger, setFetchTrigger] = useState(0);
  const [loading, setLoading] = useState(true);

  // State quản lý Modal QR code của Sinh viên
  const [qrModalTx, setQrModalTx] = useState(null);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const res = await api.get('/transactions');
        setTransactions(res.data);
      } catch (error) {
        console.error("Lỗi tải giao dịch:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTransactions();
  }, [fetchTrigger]);

  const handleAction = async (id, actionStatus) => {
    const actionName = actionStatus === 'SUCCESS' ? 'DUYỆT' : 'TỪ CHỐI';
    if (!window.confirm(`Bạn có chắc chắn muốn ${actionName} lệnh này?`)) return;

    try {
      const res = await api.put(`/transactions/${id}/status`, { status: actionStatus });
      alert(res.data.message);
      setQrModalTx(null); // Tắt modal QR nếu đang mở
      setFetchTrigger(prev => prev + 1);
    } catch (error) {
      alert(error.response?.data?.message || 'Lỗi xử lý!');
    }
  };

  const filtered = transactions.filter((tx) => {
    if (filter === 'pending') return tx.status === 'PENDING' && ['DEPOSIT', 'WITHDRAW', 'PAYOUT'].includes(tx.type);
    if (filter === 'payout') return tx.type === 'PAYOUT';
    if (filter === 'deposit') return tx.type === 'DEPOSIT';
    return true;
  });

  if (loading) return <div className="portal-muted py-10 text-center font-medium">Đang tải danh sách dòng tiền ngân quỹ...</div>;

  return (
    <div className="portal-card border rounded-3xl border border-[var(--portal-border)] overflow-hidden animate-in fade-in duration-300 relative">
      <div className="flex flex-wrap gap-2 p-4 border-b border-[var(--portal-border)]">
        {[
          { id: 'pending', label: 'Chờ duyệt' },
          { id: 'payout', label: 'Rút quầy' },
          { id: 'deposit', label: 'Nạp SV' },
          { id: 'all', label: 'Tất cả' },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-colors ${
              filter === f.id ? 'bg-[#F27124] text-white' : 'bg-[var(--portal-surface)] portal-muted hover:text-[var(--portal-text)]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[var(--portal-table-head)] portal-muted text-xs font-bold uppercase tracking-wider border-b border-[var(--portal-border)]">
              <th className="p-5 pl-6">Thời gian</th>
              <th className="p-5">Người dùng</th>
              <th className="p-5">Loại yêu cầu</th>
              <th className="p-5">Mô tả / Ngân hàng</th>
              <th className="p-5">Số tiền</th>
              <th className="p-5 text-center">Trạng thái</th>
              <th className="p-5 pr-6 text-center">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--portal-border)] portal-text-secondary">
            {filtered.map(tx => {
              const label = getTxLabel(tx);
              return (
              <tr key={tx._id} className="hover:bg-[var(--portal-surface)]/30 transition-colors">
                <td className="p-5 pl-6 text-sm portal-muted font-medium">
                  {new Date(tx.createdAt).toLocaleString('vi-VN')}
                </td>
                <td className="p-5">
                  <p className="font-bold line-clamp-1">{tx.userId?.name || 'Ẩn danh'}</p>
                  <p className="text-xs portal-muted line-clamp-1">{tx.userId?.email}</p>
                </td>
                <td className="p-5">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${label.class}`}>
                    {label.text}
                  </span>
                </td>
                <td className="p-5">
                  <p className="text-sm portal-muted font-medium max-w-[200px] truncate" title={tx.description}>{tx.description}</p>
                  {/* Nếu có bankInfo thì báo cho Admin biết */}
                  {tx.bankInfo && (
                      <p className="text-xs font-bold text-[#F27124] mt-1 flex items-center gap-1">
                          <Building size={12}/> {tx.bankInfo.bankName} - {tx.bankInfo.accountNumber}
                      </p>
                  )}
                </td>
                <td className="p-5 font-black text-base whitespace-nowrap">
                  {tx.amount?.toLocaleString()}đ
                </td>
                <td className="p-5 text-center whitespace-nowrap">
                  {tx.status === 'PENDING' ? (
                    <span className="inline-flex items-center gap-1.5 text-yellow-400 bg-yellow-500/10 px-3 py-1 rounded-full text-xs font-bold border border-yellow-500/20"><Clock size={14}/> Chờ duyệt</span>
                  ) : tx.status === 'SUCCESS' ? (
                    <span className="inline-flex items-center gap-1.5 text-green-400 bg-green-500/10 px-3 py-1 rounded-full text-xs font-bold border border-green-500/20"><CheckCircle size={14}/> Thành công</span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-red-400 bg-red-500/10 px-3 py-1 rounded-full text-xs font-bold border border-red-500/20"><XCircle size={14}/> Đã hủy</span>
                  )}
                </td>
                <td className="p-5 pr-6 text-center">
                  {tx.status === 'PENDING' ? (
                    <div className="flex justify-center gap-2">
                      {/* 🌟 NẾU LÀ RÚT TIỀN: Nút QR Code để quét thanh toán cho Sinh viên */}
                      {(tx.type === 'WITHDRAW' || tx.type === 'PAYOUT') && tx.bankInfo && (
                          <button onClick={() => setQrModalTx(tx)} className="p-2 bg-orange-500/10 text-[#F27124] hover:bg-[#F27124] hover:text-[var(--portal-text)] rounded-xl transition-all" title="Quét mã chuyển tiền">
                             <QrCode size={16} />
                          </button>
                      )}
                      {/* NẾU LÀ NẠP TIỀN HOẶC ĐÃ QUÉT XONG: Bấm Duyệt */}
                      <button onClick={() => handleAction(tx._id, 'SUCCESS')} className="p-2 bg-green-500/10 text-green-400 hover:bg-green-500 hover:text-[var(--portal-text)] rounded-xl transition-all" title="Duyệt cấp tiền">
                        <CheckCircle size={16} />
                      </button>
                      <button onClick={() => handleAction(tx._id, 'FAILED')} className="p-2 bg-red-500/10 text-red-400 hover:bg-red-50 hover:text-[var(--portal-text)] rounded-xl transition-all" title="Từ chối / Trả tiền">
                        <XCircle size={16} />
                      </button>
                    </div>
                  ) : (
                    <span className="text-gray-600 text-sm italic font-medium">-</span>
                  )}
                </td>
              </tr>
            );})}
            {filtered.length === 0 && (
              <tr>
                <td colSpan="7" className="p-10 text-center portal-muted font-bold border-none">
                  <ArrowLeftRight size={40} className="mx-auto mb-3 opacity-20" />
                  Két ngân quỹ chưa nhận yêu cầu biến động số dư nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ================= MODAL QUÉT MÃ QR CỦA SINH VIÊN (DÀNH CHO ADMIN) ================= */}
      {qrModalTx && (
         <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="portal-card border w-full max-w-sm rounded-[2rem] shadow-2xl p-6 border border-[var(--portal-border)] relative animate-in zoom-in-95 duration-200">
               <button onClick={() => setQrModalTx(null)} className="absolute top-4 right-4 p-2 portal-muted hover:text-[var(--portal-text)] bg-[var(--portal-surface)] rounded-full">
                 <XCircle size={20} />
               </button>
               
               <h3 className="text-lg font-black text-center mb-1">Mã QR Thanh Toán</h3>
               <p className="text-xs portal-muted text-center mb-6">
                 Quét mã để chuyển tiền cho {qrModalTx.type === 'PAYOUT' ? 'chủ quầy' : 'sinh viên'}
               </p>

               <div className="bg-white p-3 rounded-2xl mb-6 flex justify-center">
                   {/* Dùng API VietQR gen mã của sinh viên */}
                   <img 
                      src={`https://img.vietqr.io/image/${qrModalTx.bankInfo.bankName}-${qrModalTx.bankInfo.accountNumber}-compact.png?amount=${qrModalTx.amount}&addInfo=SlotHub thanh toan rut tien&accountName=${qrModalTx.bankInfo.accountName}`} 
                      alt="VietQR Student" 
                      className="w-48 h-48 object-cover rounded-xl border border-gray-100"
                   />
               </div>

               <div className="space-y-3 bg-[var(--portal-table-head)] p-4 rounded-xl border border-[var(--portal-border)] mb-6">
                   <div className="flex justify-between items-center text-sm">
                      <span className="portal-muted flex items-center gap-1.5"><Building size={14}/> Ngân hàng</span>
                      <span className="font-bold">{qrModalTx.bankInfo.bankName}</span>
                   </div>
                   <div className="flex justify-between items-center text-sm">
                      <span className="portal-muted flex items-center gap-1.5"><CreditCard size={14}/> Số tài khoản</span>
                      <span className="font-bold">{qrModalTx.bankInfo.accountNumber}</span>
                   </div>
                   <div className="flex justify-between items-center text-sm">
                      <span className="portal-muted flex items-center gap-1.5"><User size={14}/> Chủ thẻ</span>
                      <span className="font-bold">{qrModalTx.bankInfo.accountName}</span>
                   </div>
                   <div className="flex justify-between items-center text-sm border-t border-[var(--portal-border)] pt-3 mt-1">
                      <span className="portal-muted font-bold">Số tiền cần chuyển:</span>
                      <span className="text-[#F27124] font-black text-lg">{qrModalTx.amount?.toLocaleString()}đ</span>
                   </div>
               </div>

               <button 
                  onClick={() => handleAction(qrModalTx._id, 'SUCCESS')}
                  className="w-full bg-green-500 hover:bg-green-600 font-black py-3.5 rounded-xl transition-all shadow-lg shadow-green-500/20 active:scale-95"
               >
                  ĐÃ CHUYỂN TIỀN & DUYỆT LỆNH
               </button>
            </div>
         </div>
      )}

    </div>
  );
};

export default AdminTransactions;