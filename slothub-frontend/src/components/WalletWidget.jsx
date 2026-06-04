import React, { useState, useEffect, useContext, useMemo } from 'react';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { buildVietQrUrl } from '../utils/vietqr';
import { 
  Wallet, ArrowDownToLine, ArrowUpFromLine, 
  Clock, CheckCircle2, XCircle, Loader2, ReceiptText, QrCode, Building, ShieldCheck, X, ArrowLeft
} from 'lucide-react';

const WalletWidget = ({ isOpen, onClose }) => {
  const { user, balance, fetchBalance } = useContext(AuthContext);
  const { t } = useLocale();
  
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // 'MAIN' (Màn hình chính), 'DEPOSIT' (Nạp), 'WITHDRAW' (Rút)
  const [view, setView] = useState('MAIN'); 
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [adminBank, setAdminBank] = useState(null);

  useEffect(() => {
    if (isOpen && user) {
      fetchTransactions();
      fetchBalance(); // 🌟 GỌI LẤY TIỀN KHI MỞ VÍ
      fetchAdminBank();
      setView('MAIN'); // Reset về màn hình chính mỗi khi mở lại ví
      setAmount('');
    }
  // 🌟 ĐÃ XÓA 'user' VÀ 'fetchBalance' ĐỂ CHỐNG LẶP VÔ HẠN (CHỐNG GIẬT MÀN HÌNH)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && view === 'DEPOSIT') fetchAdminBank();
  }, [isOpen, view]);

  const fetchAdminBank = async () => {
    try {
      const res = await api.get('/admin/bank-info');
      setAdminBank(res.data);
    } catch (err) {
      console.error("Lỗi lấy thông tin Quỹ:", err);
      setAdminBank(null);
    }
  };

  const depositQrUrl = useMemo(() => {
    if (!adminBank?.accountNumber) return null;
    const numAmount = Number(amount);
    return buildVietQrUrl({
      bankName: adminBank.bankName,
      accountNumber: adminBank.accountNumber,
      accountName: adminBank.accountName,
      amount: numAmount >= 10000 ? numAmount : undefined,
      addInfo: user?.email ? `${user.email} nap tien SlotHub` : 'Nap tien SlotHub',
    });
  }, [adminBank, amount, user?.email]);

  const fetchTransactions = async () => {
    try {
      const res = await api.get('/transactions/me');
      setTransactions(res.data);
    } catch (error) {
      console.error("Lỗi lấy lịch sử:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (!amount || isNaN(amount) || Number(amount) < 10000) {
      return alert(t('wallet.minAmount'));
    }

    if (view === 'WITHDRAW') {
      if (Number(amount) > balance) return alert('Số dư ví không đủ để rút!');
      if (!user?.bankAccount?.accountNumber) return alert(t('wallet.needBank'));
    }

    if (view === 'DEPOSIT' && (!adminBank || !adminBank.accountNumber)) {
        return alert(t('wallet.noAdminBank'));
    }

    setIsSubmitting(true);
    try {
      await api.post('/transactions/request', {
          type: view,
          amount: Number(amount),
          description: `Yêu cầu ${view === 'DEPOSIT' ? 'Nạp' : 'Rút'} ${Number(amount).toLocaleString()}đ`
      });
      alert(view === 'DEPOSIT' ? t('wallet.depositSent') : t('wallet.withdrawSent'));
      setView('MAIN'); // Trở lại màn hình chính của ví
      setAmount('');
      fetchTransactions(); 
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi khi gửi yêu cầu!');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStatus = (status) => {
    switch (status) {
      case 'PENDING': return <span className="flex items-center gap-1 text-orange-500 bg-orange-50 px-2 py-0.5 rounded-md text-[10px] font-bold"><Clock size={10} /> Chờ duyệt</span>;
      case 'SUCCESS': return <span className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-0.5 rounded-md text-[10px] font-bold"><CheckCircle2 size={10} /> Thành công</span>;
      case 'FAILED': return <span className="flex items-center gap-1 text-red-500 bg-red-50 px-2 py-0.5 rounded-md text-[10px] font-bold"><XCircle size={10} /> Từ chối</span>;
      default: return null;
    }
  };

  // NẾU KHÔNG MỞ, TRẢ VỀ NULL (KHÔNG RENDER GÌ CẢ)
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#0F172A]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all">
      {/* KHUNG POPUP CỦA VÍ (Giới hạn chiều rộng để trông giống đt) */}
      <div className="bg-[#F9FAFB] w-full max-w-[400px] h-[85vh] max-h-[700px] rounded-[2.5rem] shadow-2xl relative animate-in zoom-in-95 duration-200 flex flex-col overflow-hidden border border-white/20">
        
        {/* HEADER DÙNG CHUNG */}
        <div className="bg-white px-6 py-4 flex justify-between items-center shrink-0 shadow-sm relative z-10">
          {view === 'MAIN' ? (
            <div className="w-8"></div> // Cân bằng flex
          ) : (
            <button onClick={() => setView('MAIN')} className="w-8 h-8 flex items-center justify-center bg-gray-50 text-gray-500 hover:text-[#F27124] rounded-full transition-colors">
              <ArrowLeft size={18} />
            </button>
          )}
          
          <h3 className="text-lg font-black text-gray-800 tracking-tight flex items-center gap-2">
            {view === 'MAIN' && <><Wallet size={20} className="text-[#F27124]"/> {t('wallet.title')}</>}
            {view === 'DEPOSIT' && t('wallet.deposit')}
            {view === 'WITHDRAW' && t('wallet.withdraw')}
          </h3>
          
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center bg-gray-50 text-gray-500 hover:text-red-500 rounded-full transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* NỘI DUNG CUỘN */}
        <div className="flex-1 overflow-y-auto custom-scrollbar relative">
          
          {/* ================= GIAO DIỆN CHÍNH (MAIN) ================= */}
          {view === 'MAIN' && (
            <div className="p-5 animate-in slide-in-from-left-4 fade-in duration-300">
              <div className="bg-gradient-to-br from-[#F27124] to-[#D95F1B] rounded-[2rem] p-6 text-white shadow-xl shadow-orange-200 relative overflow-hidden mb-6">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl -translate-y-10 translate-x-10"></div>
                <p className="text-sm font-medium opacity-90 mb-1">{t('wallet.balance')}</p>
                <h2 className="text-4xl font-black tracking-tight relative z-10 mb-6">
                  {balance?.toLocaleString() || 0}<span className="text-xl opacity-80 ml-1">đ</span>
                </h2>
                <div className="flex gap-3 relative z-10">
                  <button onClick={() => setView('DEPOSIT')} className="flex-1 bg-white text-[#F27124] py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all text-sm">
                    <ArrowDownToLine size={16} /> {t('wallet.deposit').toUpperCase()}
                  </button>
                  <button onClick={() => setView('WITHDRAW')} className="flex-1 bg-[#c25013] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all text-sm border border-[#e56821]">
                    <ArrowUpFromLine size={16} /> {t('wallet.withdraw').toUpperCase()}
                  </button>
                </div>
              </div>

              <h3 className="text-sm font-black text-gray-800 mb-4 flex items-center gap-2 px-1">
                <ReceiptText className="text-[#F27124]" size={16} /> Lịch sử giao dịch
              </h3>
              
              {loading ? (
                <div className="flex justify-center py-10"><Loader2 className="animate-spin text-[#F27124]" size={24}/></div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-8 opacity-50">
                  <ReceiptText size={32} className="mx-auto mb-2 text-gray-400" />
                  <p className="font-medium text-sm">{t('wallet.noTx')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.map((tx) => (
                    <div key={tx._id} className="flex justify-between items-center p-3.5 bg-white rounded-2xl border border-gray-100 shadow-sm">
                      <div className="flex gap-3 items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${tx.type === 'DEPOSIT' ? 'bg-green-50 text-green-600' : tx.type === 'WITHDRAW' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>
                          {tx.type === 'DEPOSIT' ? <ArrowDownToLine size={16} /> : tx.type === 'WITHDRAW' ? <ArrowUpFromLine size={16} /> : <Wallet size={16} />}
                        </div>
                        <div>
                          <p className="font-bold text-gray-800 text-xs line-clamp-1">{tx.description}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{new Date(tx.createdAt).toLocaleString('vi-VN')}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`font-black text-sm ${tx.type === 'DEPOSIT' ? 'text-green-600' : 'text-gray-800'}`}>
                          {tx.type === 'DEPOSIT' ? '+' : '-'}{tx.amount.toLocaleString()}đ
                        </span>
                        {renderStatus(tx.status)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ================= GIAO DIỆN NẠP / RÚT ================= */}
          {(view === 'DEPOSIT' || view === 'WITHDRAW') && (
            <div className="p-6 animate-in slide-in-from-right-4 fade-in duration-300">
              <form onSubmit={handleSubmitRequest} className="flex flex-col">
                <div className="bg-white rounded-[2rem] p-6 mb-5 border border-gray-100 shadow-sm flex flex-col items-center group">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Số tiền {view === 'DEPOSIT' ? 'nạp' : 'rút'}</label>
                  <div className="flex items-center justify-center gap-1 w-full">
                    <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className="w-full bg-transparent text-center text-4xl font-black text-gray-800 focus:outline-none placeholder-gray-200" autoFocus />
                    <span className="text-xl font-bold text-gray-400">đ</span>
                  </div>
                  <div className={`h-1 mt-4 w-12 rounded-full transition-all duration-300 ${amount ? (view === 'DEPOSIT' ? 'bg-green-500 w-full' : 'bg-[#F27124] w-full') : 'bg-gray-200'}`}></div>
                </div>

                {view === 'DEPOSIT' && adminBank?.accountNumber && (
                    <div className="mb-6 flex flex-col items-center bg-blue-50/50 p-5 rounded-3xl border border-blue-100/50">
                        <div className="bg-white p-2 rounded-2xl shadow-sm mb-3">
                          <img src={depositQrUrl} alt="QR nạp tiền Admin" className="w-40 h-40 object-contain rounded-xl" onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/160?text=Kiem+tra+ma+NH'; }} />
                        </div>
                        <p className="text-[10px] text-gray-600 text-center mb-1">{adminBank.accountName}</p>
                        <p className="text-xs font-bold text-blue-600 flex items-center gap-1.5 text-center leading-relaxed justify-center">
                          <QrCode size={14}/>
                          {Number(amount) >= 10000 ? 'Quét mã, chuyển khoản, bấm「Tôi đã chuyển khoản」' : 'Nhập ≥ 10.000đ để QR gắn đúng số tiền'}
                        </p>
                    </div>
                )}

                {view === 'DEPOSIT' && (!adminBank || !adminBank.accountNumber) && (
                    <div className="mb-5 p-4 bg-red-50 border border-red-100 rounded-2xl text-center">
                        <p className="text-sm font-bold text-red-600">Admin chưa cài đặt STK nhận tiền!</p>
                        <p className="text-xs text-gray-500 mt-1">Mã NH trong Cài đặt Admin: MB, VCB, TPB...</p>
                    </div>
                )}

                {view === 'WITHDRAW' && (
                    <div className="mb-6">
                        {user?.bankAccount?.accountNumber ? (
                            <div className="bg-gradient-to-br from-gray-800 to-black rounded-[1.5rem] p-5 text-white relative overflow-hidden shadow-xl shadow-gray-900/20">
                                <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
                                <div className="relative z-10 flex justify-between items-center mb-5">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest"><ShieldCheck size={14} className="inline mr-1"/> STK riêng của bạn</span>
                                    <Building size={16} className="text-gray-400" />
                                </div>
                                <h4 className="relative z-10 text-[1.35rem] font-black tracking-[0.15em] mb-2">{user.bankAccount.accountNumber}</h4>
                                <div className="relative z-10 flex justify-between items-end mt-4">
                                    <span className="text-xs font-bold uppercase tracking-wider text-gray-300">{user.bankAccount.accountName}</span>
                                    <span className="text-xs font-black text-white bg-[#F27124] px-2 py-0.5 rounded uppercase">{user.bankAccount.bankName}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-red-50 p-5 rounded-2xl border border-red-100 text-center">
                                <p className="text-sm font-bold text-red-600 mb-1">Chưa liên kết Thẻ!</p>
                                <p className="text-xs text-gray-500 mb-3">Vào Hồ sơ cá nhân để liên kết STK ngân hàng riêng (mỗi sinh viên một tài khoản).</p>
                            </div>
                        )}
                    </div>
                )}

                <button type="submit" disabled={isSubmitting || (view === 'WITHDRAW' && !user?.bankAccount?.accountNumber) || (view === 'DEPOSIT' && !adminBank?.accountNumber)} className={`w-full py-4 rounded-2xl font-black text-[15px] flex items-center justify-center gap-2 text-white shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${view === 'DEPOSIT' ? 'bg-green-500 hover:bg-green-600 shadow-green-500/20' : 'bg-gray-900 hover:bg-black shadow-gray-900/20'}`}>
                  {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : (view === 'DEPOSIT' ? t('wallet.transferred') : t('wallet.confirmWithdraw'))}
                </button>
              </form>
            </div>
          )}

        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 10px; }`}} />
    </div>
  );
};

export default WalletWidget;